"use server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";
import { z } from "zod";

function callbackUrl(locale: string, next: string) {
  return `${publicEnv.siteUrl}/api/auth/confirm?next=${encodeURIComponent(`/${locale}${next}`)}`;
}

export async function registerAction(input: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues.some((i) => i.message === "adult") ? "underage" : "invalid_input");
  const locale = await getLocale();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callbackUrl(locale, "/onboarding"),
      // birth_date is validated again by the database trigger (age gate).
      data: { birth_date: parsed.data.birthDate, locale },
    },
  });
  if (error) {
    logger.warn("auth.register_failed", { code: error.code });
    return fail(/database error/i.test(error.message) ? "underage" : toErrorCode(error));
  }
  return ok({ email: parsed.data.email });
}

export async function loginAction(input: unknown): Promise<ActionResult<{ next: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/not confirmed/i.test(error.message)) return fail("not_authenticated");
    return fail(error.status === 400 ? "invalid_credentials" : toErrorCode(error));
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, locale")
    .eq("id", data.user.id)
    .maybeSingle();
  const locale = profile?.locale ?? (await getLocale());
  return ok({ next: `/${locale}${profile?.onboarding_completed_at ? "/discover" : "/onboarding"}` });
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/", locale });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const locale = await getLocale();
  const supabase = await createClient();
  // Always report success to avoid leaking which emails are registered.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callbackUrl(locale, "/reset-password") });
  return ok();
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ password: z.string().min(10).max(128) }).safeParse(input);
  if (!parsed.success) return fail("weak_password");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(toErrorCode(error));
  return ok();
}

export async function resendConfirmationAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const locale = await getLocale();
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: callbackUrl(locale, "/onboarding") } });
  return ok();
}
