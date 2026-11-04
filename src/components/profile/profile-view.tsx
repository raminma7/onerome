"use client";
import { BadgeCheck, Briefcase, GraduationCap, Heart, Languages, MapPin, Quote, Sparkles, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Ring } from "@/components/ui/card";
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

/** Photo with Instagram-story style segment bars and tap zones. */
export function PhotoCarousel({ photos, name, className, children }: { photos: string[]; name: string; className?: string; children?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const count = Math.max(photos.length, 1);
  return (
    <div className={cn("relative overflow-hidden bg-travertine", className)}>
      <Photo key={index} src={photos[index]} alt={name} className="size-full animate-fade-in" />
      {photos.length > 1 && (
        <>
          <div className="absolute inset-x-4 top-3 z-10 flex gap-1.5">
            {photos.map((_, i) => (
              <span key={i} className={cn("h-[3px] flex-1 rounded-full transition-colors", i === index ? "bg-white" : "bg-white/35")} />
            ))}
          </div>
          <button type="button" aria-label="Previous photo" onClick={() => setIndex((i) => (i - 1 + count) % count)} className="absolute inset-y-0 left-0 z-[5] w-1/3" />
          <button type="button" aria-label="Next photo" onClick={() => setIndex((i) => (i + 1) % count)} className="absolute inset-y-0 right-0 z-[5] w-1/3" />
        </>
      )}
      {children}
    </div>
  );
}

function useReasonLabel() {
  const t = useTranslations("compat");
  const o = useTranslations("profileOptions");
  return (r: Reason) => {
    const p = r.params ?? {};
    const items = String(p.items ?? "")
      .split(",")
      .filter(Boolean)
      .map((i) => {
        const k = r.key === "compat.sharedInterests" ? `interests.${i}` : r.key === "compat.sharedValues" ? `values.${i}` : `lifestyleQuestion.${i}`;
        return o.has(k as "interests.art") ? o(k as "interests.art") : i;
      })
      .join(", ");
    const goal = p.goal && o.has(`goalShort.${p.goal}` as "goalShort.open") ? o(`goalShort.${p.goal}` as "goalShort.open") : "";
    return t(r.key.replace("compat.", "") as "sameGoal", { ...p, items, goal } as never);
  };
}

/** Score badge for the photo overlay. */
export function ScoreBadge({ score }: { score: number }) {
  const t = useTranslations("compat");
  return (
    <div className="glass-dark flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-white" aria-label={`${t("label")} ${score}%`}>
      <Ring value={score} size={34} stroke={3.5} track="rgb(255 255 255 / 0.2)">
        <Sparkles className="size-3.5 text-apricot" />
      </Ring>
      <span className="text-sm font-bold">{score}%</span>
    </div>
  );
}

export function CompatibilityBlock({ compatibility, className }: { compatibility: CompatibilityView; className?: string }) {
  const t = useTranslations("compat");
  const label = useReasonLabel();
  return (
    <div className={cn("relative overflow-hidden rounded-[1.75rem] bg-night p-5 text-white shadow-lift noise", className)}>
      <div className="bg-brand pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-50 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <Ring value={compatibility.score} size={72} stroke={6} track="rgb(255 255 255 / 0.12)">
          <span className="font-display text-2xl">{compatibility.score}<span className="text-sm">%</span></span>
        </Ring>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-apricot">{t("label")}</p>
          <p className="font-display text-2xl leading-tight">{t("why")}</p>
        </div>
      </div>
      {compatibility.reasons.length > 0 && (
        <ul className="relative mt-4 space-y-2">
          {compatibility.reasons.map((r) => (
            <li key={r.key} className="flex items-start gap-2.5 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 text-[14px] text-white/90">
              <Heart className="mt-0.5 size-4 shrink-0 text-rose" fill="currentColor" />
              {label(r)}
            </li>
          ))}
        </ul>
      )}
      <p className="relative mt-4 text-[11px] leading-snug text-white/45">{t("disclaimer")}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] bg-white/80 p-5 shadow-soft ring-1 ring-white">
      <h3 className="mb-3 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-muted [&_svg]:size-4 [&_svg]:text-coral">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i} className="rounded-full bg-ink/[0.05] px-3.5 py-1.5 text-[14px] font-medium text-ink-soft">{i}</span>
      ))}
    </div>
  );
}

export function ProfileDetails({ profile, compatibility }: { profile: ProfileViewData; compatibility?: CompatibilityView }) {
  const t = useTranslations("profile");
  const o = useTranslations("profileOptions");
  const lifestyle = (profile.lifestyle ?? {}) as Record<string, string>;
  // Unknown identifiers (e.g. removed options) are skipped instead of breaking the page.
  const label = (key: string) => (o.has(key as "interests.art") ? o(key as "interests.art") : null);
  const labels = (prefix: string, values: string[] | null) =>
    (values ?? []).map((v) => label(`${prefix}.${v}`)).filter((x): x is string => Boolean(x));
  const lifestyleItems = (Object.keys(LIFESTYLE) as LifestyleKey[])
    .filter((k) => lifestyle[k])
    .map((k) => label(`lifestyle.${k}.${lifestyle[k]}`))
    .filter((x): x is string => Boolean(x));
  const interests = labels("interests", profile.interests);
  const values = [...labels("values", profile.core_values), ...labels("personality", profile.personality)];
  const languages = labels("languages", profile.languages);

  return (
    <div className="space-y-4">
      {compatibility && <CompatibilityBlock compatibility={compatibility} />}

      {profile.relationship_goal && (
        <div className="bg-brand-soft rounded-[1.75rem] p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-bordeaux"><Target className="size-4" /> {t("lookingFor")}</p>
          <p className="mt-2 font-display text-[1.9rem] leading-tight text-ink">{o(`goal.${profile.relationship_goal}` as "goal.open")}</p>
        </div>
      )}

      {profile.bio && (
        <section className="relative rounded-[1.75rem] bg-white/80 p-6 shadow-soft ring-1 ring-white">
          <Quote className="absolute right-5 top-5 size-8 text-coral/20" fill="currentColor" />
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">{t("about")}</p>
          <p className="mt-3 whitespace-pre-line font-display text-[1.65rem] leading-snug text-ink">{profile.bio}</p>
        </section>
      )}

      {(profile.occupation || profile.education || profile.neighborhood_name) && (
        <div className="flex flex-wrap gap-2">
          {profile.neighborhood_name && <Pill icon={<MapPin />}>{profile.neighborhood_name}</Pill>}
          {profile.occupation && <Pill icon={<Briefcase />}>{profile.occupation}</Pill>}
          {profile.education && <Pill icon={<GraduationCap />}>{profile.education}</Pill>}
        </div>
      )}

      {interests.length > 0 && <Section title={t("interests")} icon={<Sparkles />}><Tags items={interests} /></Section>}
      {values.length > 0 && <Section title={t("values")} icon={<Heart />}><Tags items={values} /></Section>}
      {lifestyleItems.length > 0 && <Section title={t("lifestyle")} icon={<Sparkles />}><Tags items={lifestyleItems} /></Section>}
      {languages.length > 0 && <Section title={t("languages")} icon={<Languages />}><Tags items={languages} /></Section>}
    </div>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-[14px] font-medium text-ink-soft shadow-soft ring-1 ring-white [&_svg]:size-4 [&_svg]:text-coral">
      {icon}
      {children}
    </span>
  );
}

export function ProfileHeading({ profile, className, size = "lg" }: { profile: ProfileViewData; className?: string; size?: "lg" | "md" }) {
  const c = useTranslations("common");
  const o = useTranslations("profileOptions");
  return (
    <div className={className}>
      <h2 className={cn("flex items-end gap-2 leading-[0.95] text-white", size === "lg" ? "text-[2.3rem]" : "text-3xl")}>
        <span>
          {profile.display_name}
          {profile.age != null && <span className="ml-2 font-sans text-[0.55em] font-light text-white/85">{profile.age}</span>}
        </span>
        {profile.is_verified && <BadgeCheck className="mb-1.5 size-7 shrink-0 fill-sky-500 text-white" aria-label={c("verified")} />}
      </h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.neighborhood_name && (
          <span className="glass-dark inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-medium text-white"><MapPin className="size-3.5" /> {profile.neighborhood_name}</span>
        )}
        {profile.relationship_goal && (
          <span className="glass-dark inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-medium text-white"><Target className="size-3.5" /> {o(`goalShort.${profile.relationship_goal}` as "goalShort.open")}</span>
        )}
      </div>
    </div>
  );
}
