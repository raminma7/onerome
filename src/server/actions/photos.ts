"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const pathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$/);

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

/** Registers a photo the client already uploaded to its own storage folder. */
export async function addPhotoAction(path: unknown): Promise<ActionResult<{ id: string; url: string | null }>> {
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
  const { data: signed } = await supabase.storage.from("profile-photos").createSignedUrl(parsed.data, 3600);
  revalidatePath("/[locale]/settings", "layout");
  return ok({ id: data.id, url: signed?.signedUrl ?? null });
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
  revalidatePath("/[locale]/settings", "layout");
  return ok();
}

/** Persists the photo order; the first photo is the cover. */
export async function reorderPhotosAction(ids: unknown): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).max(6).safeParse(ids);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  for (const [position, id] of parsed.data.entries()) {
    const { error } = await supabase.from("profile_photos").update({ position }).eq("id", id).eq("user_id", userId);
    if (error) return fail(toErrorCode(error));
  }
  revalidatePath("/[locale]/settings", "layout");
  return ok();
}
