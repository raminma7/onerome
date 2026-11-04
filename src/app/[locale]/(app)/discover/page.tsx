import { Compass, Lock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { rankCandidates, type CompatibilityProfile } from "@/lib/compatibility";
import type { Lifestyle, RelationshipGoal } from "@/lib/domain/options";
import { signPhotoPaths } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { DiscoverDeck, type DeckCard } from "./deck";

export async function generateMetadata() {
  const t = await getTranslations("discover");
  return { title: t("title") };
}

export default async function DiscoverPage({ params }: PageProps<"/[locale]/discover">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("discover");
  const supabase = await createClient();

  const [{ data: candidates, error }, { data: prefs }, { data: myZone }] = await Promise.all([
    supabase.rpc("get_discover_candidates", { p_limit: 200 }),
    supabase.from("preferences").select("goals").eq("user_id", me.id).maybeSingle(),
    me.neighborhood ? supabase.from("neighborhoods").select("zone").eq("slug", me.neighborhood).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  if (error?.message === "exclusive_connection_active") {
    return (
      <>
        <PageHeader title={t("title")} />
        <EmptyState icon={<Lock />} title={t("lockedTitle")} text={t("lockedText")}>
          <Link href="/connection" className={buttonVariants()}>{t("openConnection")}</Link>
        </EmptyState>
      </>
    );
  }

  const mine: CompatibilityProfile = {
    relationship_goal: me.relationship_goal as RelationshipGoal | null,
    pref_goals: (prefs?.goals ?? []) as RelationshipGoal[],
    interests: me.interests,
    languages: me.languages,
    core_values: me.core_values,
    personality: me.personality,
    lifestyle: me.lifestyle as Lifestyle,
    neighborhood: me.neighborhood,
    neighborhood_zone: myZone?.zone ?? null,
  };

  const ranked = rankCandidates(
    mine,
    (candidates ?? []).map((c) => ({
      ...c,
      lifestyle: c.lifestyle as Lifestyle,
      pref_goals: c.pref_goals as RelationshipGoal[],
      relationship_goal: c.relationship_goal as RelationshipGoal | null,
    })),
  ).slice(0, 30);

  const { data: myPhotos } = await supabase.from("profile_photos").select("storage_path").eq("user_id", me.id).order("position").limit(1);
  const urls = await signPhotoPaths(supabase, [...ranked.flatMap((c) => c.photo_paths), ...(myPhotos ?? []).map((p) => p.storage_path)]);
  const myPhoto = myPhotos?.[0] ? urls[myPhotos[0].storage_path] ?? null : null;
  const cards: DeckCard[] = ranked.map((c) => ({
    profile: { ...c, photos: c.photo_paths.map((p) => urls[p]).filter(Boolean) },
    compatibility: { score: c.compatibility.score, reasons: c.compatibility.reasons },
  }));

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} className="mb-4 [&_h1]:text-[2.4rem] sm:[&_h1]:text-6xl [&_p]:hidden sm:[&_p]:block" />
      {cards.length === 0 ? (
        <EmptyState icon={<Compass />} title={t("emptyTitle")} text={t("emptyText")}>
          <Link href="/settings/profile#preferences" className={buttonVariants({ variant: "outline" })}>{t("editPreferences")}</Link>
        </EmptyState>
      ) : (
        <DiscoverDeck cards={cards} myPhoto={myPhoto} canLike={me.verification === "verified"} />
      )}
    </>
  );
}
