"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/errors";
import {
  compareFaces, createLivenessSession, detectFaces, faceConfig, getLivenessResult, isFaceVerificationConfigured,
  livenessBrowserCredentials, thresholds,
} from "@/lib/face/aws";
import { evaluateLiveness, evaluateMatch, evaluatePhoto, type FaceVerificationFailure } from "@/lib/face/decision";
import { checkAllPhotos } from "@/lib/face/photo-check";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BIOMETRIC_CONSENT_VERSION = "2026-11-biometric-v1";

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

async function coverPhoto(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("profile_photos").select("id, storage_path").eq("user_id", userId).order("position").order("created_at").limit(1).maybeSingle();
  if (!data) return null;
  const { data: file } = await admin.storage.from("profile-photos").download(data.storage_path);
  if (!file) return null;
  return { id: data.id, bytes: new Uint8Array(await file.arrayBuffer()) };
}

/**
 * Step 1: checks the cover photo (one clear face), records biometric consent and
 * creates an AWS Face Liveness session.
 */
export async function startFaceVerificationAction(input: unknown): Promise<ActionResult<{ sessionId: string; region: string }>> {
  const parsed = z.object({ consent: z.literal(true) }).safeParse(input);
  if (!parsed.success) return fail("consent_required");
  if (!isFaceVerificationConfigured) return fail("verification_unavailable");

  const { supabase, userId } = await currentUser();
  if (!userId) return fail("not_authenticated");
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("verification, onboarding_completed_at, suspended_at").eq("id", userId).single();
  if (!profile?.onboarding_completed_at) return fail("onboarding_incomplete");
  if (profile.suspended_at) return fail("account_suspended");
  if (profile.verification === "verified") return fail("already_verified");

  const { data: limitRow } = await admin.from("app_config").select("value").eq("key", "face_verification_daily_attempts").maybeSingle();
  const maxAttempts = Number(limitRow?.value ?? 5);
  const { count } = await admin
    .from("face_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= maxAttempts) return fail("rate_limited");

  const photo = await coverPhoto(admin, userId);
  if (!photo) return fail("photo_required");

  // Explicit, separate consent for biometric processing (GDPR art. 9).
  await supabase.from("consents").insert({ user_id: userId, kind: "biometric", version: BIOMETRIC_CONSENT_VERSION, granted: true });

  try {
    const photoCheck = evaluatePhoto(await detectFaces(photo.bytes), thresholds());
    if (!photoCheck.ok) {
      await admin.from("face_verifications").insert({
        user_id: userId, photo_id: photo.id, status: "failed", failure_reason: photoCheck.reason, completed_at: new Date().toISOString(),
      });
      return fail(photoCheck.reason);
    }

    const { data: row, error } = await admin.from("face_verifications").insert({ user_id: userId, photo_id: photo.id, status: "started" }).select("id").single();
    if (error || !row) throw error ?? new Error("insert failed");
    const sessionId = await createLivenessSession(row.id);
    await admin.from("face_verifications").update({ liveness_session_id: sessionId }).eq("id", row.id);
    return ok({ sessionId, region: faceConfig.region });
  } catch (error) {
    logger.error("face.start_failed", error);
    return fail("verification_unavailable");
  }
}

/** Step 2: temporary browser credentials, only while a session is in progress. */
export async function livenessCredentialsAction(sessionId: unknown): Promise<ActionResult<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string; expiration?: string }>> {
  const parsed = z.string().min(10).max(100).safeParse(sessionId);
  if (!parsed.success) return fail("verification_session_invalid");
  const { userId } = await currentUser();
  if (!userId) return fail("not_authenticated");
  const admin = createAdminClient();
  const { data: row } = await admin.from("face_verifications").select("id, created_at").eq("liveness_session_id", parsed.data).eq("user_id", userId).eq("status", "started").maybeSingle();
  if (!row || Date.now() - new Date(row.created_at).getTime() > 15 * 60_000) return fail("verification_session_invalid");
  try {
    return ok(await livenessBrowserCredentials(userId));
  } catch (error) {
    logger.error("face.credentials_failed", error);
    return fail("verification_unavailable");
  }
}

/**
 * Step 3: reads the liveness result, compares the live face with the cover photo
 * and, if everything passes, marks the profile verified (making it visible).
 * The reference image is used in memory only and never stored.
 */
export async function completeFaceVerificationAction(sessionId: unknown): Promise<ActionResult<{ verified: true }>> {
  const parsed = z.string().min(10).max(100).safeParse(sessionId);
  if (!parsed.success) return fail("verification_session_invalid");
  const { userId } = await currentUser();
  if (!userId) return fail("not_authenticated");
  const admin = createAdminClient();

  const { data: row } = await admin.from("face_verifications").select("id, photo_id").eq("liveness_session_id", parsed.data).eq("user_id", userId).eq("status", "started").maybeSingle();
  if (!row) return fail("verification_session_invalid");

  const finish = async (status: "passed" | "failed" | "error", extra: { reason?: FaceVerificationFailure | "error"; liveness?: number; similarity?: number }) => {
    await admin.from("face_verifications").update({
      status,
      failure_reason: extra.reason ?? null,
      liveness_confidence: extra.liveness ?? null,
      similarity: extra.similarity ?? null,
      completed_at: new Date().toISOString(),
    }).eq("id", row.id);
  };

  try {
    const t = thresholds();
    const result = await getLivenessResult(parsed.data);
    const liveness = evaluateLiveness({ status: result.status, confidence: result.confidence, hasReferenceImage: Boolean(result.referenceImage) }, t);
    if (!liveness.ok || !result.referenceImage) {
      await finish("failed", { reason: "liveness_failed", liveness: result.confidence });
      return fail("liveness_failed");
    }

    // The cover photo must still be the one that was checked at the start.
    const photo = await coverPhoto(admin, userId);
    if (!photo || photo.id !== row.photo_id) {
      await finish("failed", { reason: "face_mismatch", liveness: result.confidence });
      return fail("verification_session_invalid");
    }

    const similarity = await compareFaces(result.referenceImage, photo.bytes);
    const match = evaluateMatch(similarity, t);
    if (!match.ok) {
      await finish("failed", { reason: "face_mismatch", liveness: result.confidence, similarity });
      return fail("face_mismatch");
    }

    await finish("passed", { liveness: result.confidence, similarity });
    // The cover was checked (one clear face) and matches the live selfie: it shows the user alone.
    await admin.from("profile_photos").update({ face_status: "solo", face_similarity: similarity ?? null, face_checked_at: new Date().toISOString() }).eq("id", photo.id);
    await admin.from("profiles").update({ verification: "verified", verified_photo_id: photo.id, verified_at: new Date().toISOString() }).eq("id", userId);
    // Every other photo is now compared with the verified face (no new selfie needed).
    await checkAllPhotos(admin, userId).catch((e) => logger.error("face.bulk_check_failed", e));
    await admin.from("notifications").insert({ user_id: userId, type: "verification_status", data: { status: "verified" } });
    logger.info("face.verified");
    revalidatePath("/[locale]", "layout");
    return ok({ verified: true });
  } catch (error) {
    logger.error("face.complete_failed", error);
    await finish("error", { reason: "error" });
    return fail("verification_unavailable");
  }
}
