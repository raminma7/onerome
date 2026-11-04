import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";
import { compareFaces, detectFaces, isFaceVerificationConfigured, thresholds } from "./aws";
import { decidePhotoStatus, type PhotoFaceStatus } from "./decision";

type Admin = SupabaseClient<Database>;

async function download(admin: Admin, path: string) {
  const { data } = await admin.storage.from("profile-photos").download(path);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

/**
 * Compares one photo with the user's verified photo and stores the result.
 * Returns "unchecked" when the user is not verified yet or the service is unavailable
 * (the photo then stays hidden from others until checked).
 */
export async function checkPhotoAgainstVerifiedFace(admin: Admin, userId: string, photoId: string): Promise<PhotoFaceStatus | "unchecked"> {
  if (!isFaceVerificationConfigured) return "unchecked";
  const { data: profile } = await admin.from("profiles").select("verification, verified_photo_id").eq("id", userId).single();
  if (profile?.verification !== "verified" || !profile.verified_photo_id || profile.verified_photo_id === photoId) return "unchecked";

  const [{ data: verified }, { data: photo }] = await Promise.all([
    admin.from("profile_photos").select("storage_path").eq("id", profile.verified_photo_id).single(),
    admin.from("profile_photos").select("storage_path").eq("id", photoId).eq("user_id", userId).single(),
  ]);
  if (!verified || !photo) return "unchecked";

  try {
    const [reference, target] = await Promise.all([download(admin, verified.storage_path), download(admin, photo.storage_path)]);
    if (!reference || !target) return "unchecked";
    const t = thresholds();
    const faces = await detectFaces(target);
    const similarity = faces.length ? await compareFaces(reference, target) : undefined;
    const status = decidePhotoStatus(faces, similarity, t);
    await admin.from("profile_photos").update({
      face_status: status,
      face_similarity: similarity ?? null,
      face_checked_at: new Date().toISOString(),
    }).eq("id", photoId);
    return status;
  } catch (error) {
    logger.error("face.photo_check_failed", error);
    return "unchecked";
  }
}

/** Checks every not-yet-checked photo of the user (e.g. right after verification). */
export async function checkAllPhotos(admin: Admin, userId: string) {
  const { data: photos } = await admin.from("profile_photos").select("id").eq("user_id", userId).eq("face_status", "unchecked");
  for (const p of photos ?? []) await checkPhotoAgainstVerifiedFace(admin, userId, p.id);
}
