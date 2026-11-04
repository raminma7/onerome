import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;

/** Current user id from the verified JWT (no network round-trip when using asymmetric keys). */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
});

export async function requireUserId() {
  const userId = await getUserId();
  if (!userId) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }
  return userId as string;
}

/** For pages of the main app: the profile must be complete and active. */
export async function requireActiveProfile(): Promise<Profile> {
  await requireUserId();
  const locale = await getLocale();
  const profile = await getMyProfile();
  if (!profile || profile.deleted_at) redirect({ href: "/login", locale });
  if (!profile!.onboarding_completed_at) redirect({ href: "/onboarding", locale });
  return profile as Profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "admin" || profile.suspended_at) {
    const locale = await getLocale();
    redirect({ href: "/discover", locale });
  }
  return profile;
}

/** Throws for use inside server actions (returns code instead of redirecting). */
export async function actionUserId(): Promise<string | null> {
  return getUserId();
}
