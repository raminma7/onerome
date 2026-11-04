import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { signPhotoPaths } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "./editor";

export default async function EditProfilePage({ params }: PageProps<"/[locale]/settings/profile">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("settings");
  const supabase = await createClient();
  const [{ data: prefs }, { data: photos }, { data: neighborhoods }] = await Promise.all([
    supabase.from("preferences").select("*").eq("user_id", me.id).single(),
    supabase.from("profile_photos").select("id, storage_path, face_status").eq("user_id", me.id).order("position"),
    supabase.from("neighborhoods").select("slug, name, zone").order("name"),
  ]);
  const urls = await signPhotoPaths(supabase, (photos ?? []).map((p) => p.storage_path));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("editProfile")} />
      <ProfileEditor
        userId={me.id}
        neighborhoods={neighborhoods ?? []}
        photos={(photos ?? []).map((p) => ({ id: p.id, url: urls[p.storage_path] ?? null, status: p.face_status }))}
        verified={me.verification === "verified"}
        profile={{
          display_name: me.display_name ?? "", gender: me.gender ?? "", bio: me.bio ?? "", occupation: me.occupation ?? "",
          education: me.education ?? "", neighborhood: me.neighborhood ?? "", languages: me.languages, interests: me.interests,
          personality: me.personality, core_values: me.core_values, lifestyle: (me.lifestyle ?? {}) as Record<string, string>,
          relationship_goal: me.relationship_goal ?? "",
        }}
        preferences={{ interested_in: prefs?.interested_in ?? [], age_min: prefs?.age_min ?? 18, age_max: prefs?.age_max ?? 99, goals: prefs?.goals ?? [] }}
      />
    </div>
  );
}
