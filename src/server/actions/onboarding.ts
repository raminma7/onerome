"use server";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/schemas";

export const CONSENT_VERSION = "2026-11-v1";

export async function completeOnboardingAction(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return fail("not_authenticated");

  const { profile, preferences, consents } = parsed.data;
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ...profile, bio: profile.bio || null, occupation: profile.occupation || null, education: profile.education || null })
    .eq("id", userId);
  if (profileError) return fail(toErrorCode(profileError));

  const { error: prefError } = await supabase.from("preferences").update(preferences).eq("user_id", userId);
  if (prefError) return fail(toErrorCode(prefError));

  const { error: consentError } = await supabase.from("consents").insert([
    { user_id: userId, kind: "terms", version: CONSENT_VERSION, granted: true },
    { user_id: userId, kind: "privacy", version: CONSENT_VERSION, granted: true },
    { user_id: userId, kind: "sensitive_data", version: CONSENT_VERSION, granted: true },
    { user_id: userId, kind: "marketing", version: CONSENT_VERSION, granted: consents.marketing },
  ]);
  if (consentError) return fail(toErrorCode(consentError));

  const { error } = await supabase.rpc("complete_onboarding");
  if (error) return fail(toErrorCode(error));
  return ok();
}
