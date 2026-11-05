"use server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { emailCodeSchema, loginSchema, registerSchema } from "@/lib/validation/schemas";
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
      // The confirmation email contains a 6-digit code (see supabase/templates/confirmation.html).
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

/**
 * Completes registration: verifies the 6-digit code sent by email. On success
 * Supabase creates the session and the user continues to onboarding.
 */
export async function verifyEmailCodeAction(input: unknown): Promise<ActionResult<{ next: string }>> {
  const parsed = emailCodeSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_code");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "signup" });
  if (error) {
    if (error.status === 429 || /rate limit/i.test(error.message)) return fail("rate_limited");
    // Supabase does not distinguish a wrong code from an expired one ("Token has expired or is invalid").
    return fail("invalid_code");
  }
  const locale = await getLocale();
  return ok({ next: `/${locale}/onboarding` });
}

export async function loginAction(input: unknown): Promise<ActionResult<{ next: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
      // Send a fresh code and let the client move to the code screen.
      await supabase.auth.resend({ type: "signup", email: parsed.data.email });
      return fail("email_not_confirmed");
    }
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
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email });
  if (error && (error.status === 429 || /rate limit|seconds/i.test(error.message))) return fail("rate_limited");
  return ok();
}
