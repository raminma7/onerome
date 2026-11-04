"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { canBeCover } from "@/lib/face/decision";
import { checkPhotoAgainstVerifiedFace } from "@/lib/face/photo-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const pathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$/);

export type PhotoStatus = "unchecked" | "solo" | "with_others" | "unclear" | "no_face" | "reviewed" | "mismatch";

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

/**
 * Registers a photo the client already uploaded to its own folder.
 * For verified users the photo is compared with the verified face right away:
 * photos of other people are rejected and deleted.
 */
export async function addPhotoAction(path: unknown): Promise<ActionResult<{ id: string; url: string | null; status: PhotoStatus }>> {
  const parsed = pathSchema.safeParse(path);
  if (!parsed.success) return fail("invalid_photo_path");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  if (!parsed.data.startsWith(userId + "/")) return fail("invalid_photo_path");

  const { count } = await supabase.from("profile_photos").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ user_id: userId, storage_path: parsed.data, position: count ?? 0 })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("profile-photos").remove([parsed.data]);
    return fail(toErrorCode(error));
  }

  let status: PhotoStatus = "unchecked";
  const { data: me } = await supabase.from("profiles").select("verification").eq("id", userId).single();
  if (me?.verification === "verified") {
    const admin = createAdminClient();
    status = await checkPhotoAgainstVerifiedFace(admin, userId, data.id);
    if (status === "mismatch") {
      await admin.from("profile_photos").delete().eq("id", data.id);
      await admin.storage.from("profile-photos").remove([parsed.data]);
      return fail("photo_not_you");
    }
  }

  const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(parsed.data, 3600);
  revalidatePath("/[locale]", "layout");
  return ok({ id: data.id, url: signed?.signedUrl ?? null, status });
}

export async function deletePhotoAction(id: unknown): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const { data: photo } = await supabase.from("profile_photos").select("storage_path").eq("id", parsed.data).eq("user_id", userId).maybeSingle();
  if (!photo) return fail("not_found");
  const { error } = await supabase.from("profile_photos").delete().eq("id", parsed.data);
  if (error) return fail(toErrorCode(error));
  await supabase.storage.from("profile-photos").remove([photo.storage_path]);
  revalidatePath("/[locale]", "layout");
  return ok();
}

/** Persists the photo order. Once verified, the cover must show the user alone. */
export async function reorderPhotosAction(ids: unknown): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).min(1).max(6).safeParse(ids);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");

  const [{ data: me }, { data: cover }] = await Promise.all([
    supabase.from("profiles").select("verification").eq("id", userId).single(),
    supabase.from("profile_photos").select("face_status").eq("id", parsed.data[0]).eq("user_id", userId).maybeSingle(),
  ]);
  if (!cover) return fail("not_found");
  if (me?.verification === "verified" && !canBeCover(cover.face_status)) return fail("cover_must_be_you");

  for (const [position, id] of parsed.data.entries()) {
    const { error } = await supabase.from("profile_photos").update({ position }).eq("id", id).eq("user_id", userId);
    if (error) return fail(toErrorCode(error));
  }
  revalidatePath("/[locale]", "layout");
  return ok();
}
