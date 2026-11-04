"use client";
import { BadgeCheck, Briefcase, ChevronLeft, ChevronRight, GraduationCap, MapPin, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/card";
import { Photo } from "@/components/photo";
import type { Reason } from "@/lib/compatibility";
import { LIFESTYLE, type LifestyleKey } from "@/lib/domain/options";
import { cn } from "@/lib/utils";

export type ProfileViewData = {
  id: string;
  display_name: string | null;
  age: number | null;
  bio: string | null;
  neighborhood_name: string | null;
  occupation: string | null;
  education: string | null;
  languages: string[] | null;
  interests: string[] | null;
  personality: string[] | null;
  core_values: string[] | null;
  lifestyle: unknown;
  relationship_goal: string | null;
  is_verified: boolean | null;
  photos: string[];
};

export type CompatibilityView = { score: number; reasons: Reason[] };

export function PhotoCarousel({ photos, name, className }: { photos: string[]; name: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const count = Math.max(photos.length, 1);
  return (
    <div className={cn("relative overflow-hidden bg-travertine", className)}>
      <Photo src={photos[index]} alt={name} className="size-full" />
      {photos.length > 1 && (
        <>
          <div className="absolute inset-x-3 top-3 flex gap-1">
            {photos.map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i === index ? "bg-ivory" : "bg-ivory/40")} />)}
          </div>
          <button type="button" aria-label="Previous" onClick={() => setIndex((i) => (i - 1 + count) % count)} className="absolute inset-y-0 left-0 flex w-1/3 items-center pl-2 text-ivory/0 hover:text-ivory/90">
            <ChevronLeft className="size-7 drop-shadow" />
          </button>
          <button type="button" aria-label="Next" onClick={() => setIndex((i) => (i + 1) % count)} className="absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-2 text-ivory/0 hover:text-ivory/90">
            <ChevronRight className="size-7 drop-shadow" />
          </button>
        </>
      )}
    </div>
  );
}

export function CompatibilityBlock({ compatibility }: { compatibility: CompatibilityView }) {
  const t = useTranslations("compat");
  const o = useTranslations("profileOptions");
  const label = (r: Reason) => {
    const p = r.params ?? {};
    const items = String(p.items ?? "")
      .split(",")
      .filter(Boolean)
      .map((i) => {
        const k = r.key === "compat.sharedInterests" ? `interests.${i}` : r.key === "compat.sharedValues" ? `values.${i}` : `lifestyleQuestion.${i}`;
        return o.has(k as "interests.art") ? o(k as "interests.art") : i;
      })
      .join(", ");
    const goal = p.goal ? (o.has(`goalShort.${p.goal}` as "goalShort.open") ? o(`goalShort.${p.goal}` as "goalShort.open") : "") : "";
    const key = r.key.replace("compat.", "") as "sameGoal";
    return t(key, { ...p, items, goal } as never);
  };
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold-soft/40 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-ink"><Sparkles className="size-4 text-gold" /> {t("why")}</p>
        <span className="font-display text-3xl text-bordeaux">{compatibility.score}%</span>
      </div>
      {compatibility.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {compatibility.reasons.map((r) => <li key={r.key}>· {label(r)}</li>)}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-snug text-muted">{t("disclaimer")}</p>
    </div>
  );
}

export function ProfileDetails({ profile, compatibility }: { profile: ProfileViewData; compatibility?: CompatibilityView }) {
  const t = useTranslations("profile");
  const o = useTranslations("profileOptions");
  const lifestyle = (profile.lifestyle ?? {}) as Record<string, string>;
  const section = (title: string, items: string[]) =>
    items.length > 0 && (
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted">{title}</h3>
        <div className="flex flex-wrap gap-2">{items.map((i) => <Badge key={i}>{i}</Badge>)}</div>
      </div>
    );

  return (
    <div className="space-y-6">
      {compatibility && <CompatibilityBlock compatibility={compatibility} />}
      {profile.relationship_goal && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-muted">{t("lookingFor")}</h3>
          <p className="font-display text-2xl">{o(`goal.${profile.relationship_goal}` as "goal.open")}</p>
        </div>
      )}
      {profile.bio && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-muted">{t("about")}</h3>
          <p className="whitespace-pre-line leading-relaxed text-ink-soft">{profile.bio}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
        {profile.occupation && <span className="flex items-center gap-1.5"><Briefcase className="size-4 text-muted" />{profile.occupation}</span>}
        {profile.education && <span className="flex items-center gap-1.5"><GraduationCap className="size-4 text-muted" />{profile.education}</span>}
      </div>
      {section(t("interests"), (profile.interests ?? []).map((i) => o(`interests.${i}` as "interests.art")))}
      {section(t("values"), (profile.core_values ?? []).map((i) => o(`values.${i}` as "values.family")))}
      {section(t("personality"), (profile.personality ?? []).map((i) => o(`personality.${i}` as "personality.calm")))}
      {section(
        t("lifestyle"),
        (Object.keys(LIFESTYLE) as LifestyleKey[])
          .filter((k) => lifestyle[k])
          .map((k) => `${o(`lifestyleQuestion.${k}`)}: ${o(`lifestyle.${k}.${lifestyle[k]}` as "lifestyle.smoking.never")}`),
      )}
      {section(t("languages"), (profile.languages ?? []).map((l) => o(`languages.${l}` as "languages.it")))}
    </div>
  );
}

export function ProfileHeading({ profile, className }: { profile: ProfileViewData; className?: string }) {
  const c = useTranslations("common");
  return (
    <div className={className}>
      <h2 className="flex items-center gap-2 text-4xl leading-none">
        {profile.display_name}
        {profile.age != null && <span className="text-3xl text-current/70">, {profile.age}</span>}
        {profile.is_verified && <BadgeCheck className="size-6 text-gold" aria-label={c("verified")} />}
      </h2>
      {profile.neighborhood_name && (
        <p className="mt-1 flex items-center gap-1 text-sm opacity-80"><MapPin className="size-3.5" /> {profile.neighborhood_name}, Roma</p>
      )}
    </div>
  );
}
