"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { localeSchema, preferencesSchema, profileSchema } from "@/lib/validation/schemas";

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

export async function updateLocaleAction(locale: unknown): Promise<ActionResult> {
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return ok(); // anonymous visitors only switch the URL/cookie
  const { error } = await supabase.from("profiles").update({ locale: parsed.data }).eq("id", userId);
  return error ? fail(toErrorCode(error)) : ok();
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const p = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      ...p,
      bio: p.bio || null,
      occupation: p.occupation || null,
      education: p.education || null,
    })
    .eq("id", userId);
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/settings", "layout");
  return ok();
}

export async function updatePreferencesAction(input: unknown): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("preferences").update(parsed.data).eq("user_id", userId);
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/discover", "page");
  return ok();
}

export async function updateVisibilityAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ is_hidden: z.boolean().optional(), notify_likes: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  return error ? fail(toErrorCode(error)) : ok();
}

export async function requestVerificationAction(path: unknown): Promise<ActionResult> {
  const parsed = z.string().max(200).safeParse(path);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.rpc("request_verification", { p_storage_path: parsed.data });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/settings", "page");
  return ok();
}

/**
 * GDPR erasure: closes any connection, cancels Stripe subscriptions, removes
 * stored files and deletes the auth user (cascading to all personal rows).
 */
export async function deleteAccountAction(confirmation: unknown): Promise<ActionResult> {
  if (typeof confirmation !== "string" || !["DELETE", "ELIMINA"].includes(confirmation.trim().toUpperCase())) {
    return fail("invalid_input");
  }
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");

  const { error } = await supabase.rpc("prepare_account_deletion");
  if (error) return fail(toErrorCode(error));

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    logger.error("account.delete_no_service_role");
    return fail("service_unavailable");
  }

  const stripe = getStripe();
  if (stripe) {
    const { data: subs } = await admin.from("subscriptions").select("id, status").eq("user_id", userId);
    for (const sub of subs ?? []) {
      if (!["canceled", "incomplete_expired"].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id).catch((e) => logger.error("account.delete_cancel_sub_failed", e));
      }
    }
  }

  for (const bucket of ["profile-photos", "verification"] as const) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 100 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    logger.error("account.delete_failed", deleteError);
    return fail("generic");
  }
  await supabase.auth.signOut();
  logger.info("account.deleted");
  return ok();
}
