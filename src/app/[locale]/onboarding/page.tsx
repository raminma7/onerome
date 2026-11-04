import { toLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getMyProfile, requireUserId } from "@/lib/auth";
import { signPhotoPaths } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./wizard";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage({ params }: PageProps<"/[locale]/onboarding">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const userId = await requireUserId();
  const profile = await getMyProfile();
  if (profile?.onboarding_completed_at) redirect({ href: "/discover", locale });

  const supabase = await createClient();
  const [{ data: preferences }, { data: photos }, { data: neighborhoods }] = await Promise.all([
    supabase.from("preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_photos").select("id, storage_path").eq("user_id", userId).order("position"),
    supabase.from("neighborhoods").select("slug, name, zone").order("name"),
  ]);
  const urls = await signPhotoPaths(supabase, (photos ?? []).map((p) => p.storage_path));

  return (
    <OnboardingWizard
      userId={userId}
      neighborhoods={neighborhoods ?? []}
      photos={(photos ?? []).map((p) => ({ id: p.id, url: urls[p.storage_path] ?? null }))}
      initialProfile={{
        display_name: profile?.display_name ?? "",
        gender: profile?.gender ?? "",
        bio: profile?.bio ?? "",
        occupation: profile?.occupation ?? "",
        education: profile?.education ?? "",
        neighborhood: profile?.neighborhood ?? "",
        languages: profile?.languages?.length ? profile.languages : [locale],
        interests: profile?.interests ?? [],
        personality: profile?.personality ?? [],
        core_values: profile?.core_values ?? [],
        lifestyle: (profile?.lifestyle as Record<string, string>) ?? {},
        relationship_goal: profile?.relationship_goal ?? "",
      }}
      initialPreferences={{
        interested_in: preferences?.interested_in ?? [],
        age_min: preferences?.age_min ?? 18,
        age_max: preferences?.age_max ?? 99,
        goals: preferences?.goals ?? [],
      }}
    />
  );
}
