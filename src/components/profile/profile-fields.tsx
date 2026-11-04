"use client";
/**
 * Controlled field groups shared by onboarding and profile editing.
 * Every option is a stable identifier; labels come from translations.
 */
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  CORE_VALUES, GENDERS, INTERESTS, LANGUAGES, LIFESTYLE, PERSONALITY, RELATIONSHIP_GOALS,
  type Lifestyle, type LifestyleKey,
} from "@/lib/domain/options";
import { cn } from "@/lib/utils";

export type Neighborhood = { slug: string; name: string; zone: string };

export type ProfileDraft = {
  display_name: string;
  gender: string;
  bio: string;
  occupation: string;
  education: string;
  neighborhood: string;
  languages: string[];
  interests: string[];
  personality: string[];
  core_values: string[];
  lifestyle: Lifestyle;
  relationship_goal: string;
};

export type PreferencesDraft = { interested_in: string[]; age_min: number; age_max: number; goals: string[] };

function toggle(list: string[], value: string, max: number) {
  return list.includes(value) ? list.filter((v) => v !== value) : list.length >= max ? list : [...list, value];
}

export function ChipGroup<T extends string>({ options, value, onChange, label, max = 99 }: {
  options: readonly T[]; value: string[]; onChange: (v: string[]) => void; label: (o: T) => string; max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} selected={value.includes(o)} onClick={() => onChange(toggle(value, o, max))} disabled={!value.includes(o) && value.length >= max}>
          {label(o)}
        </Chip>
      ))}
    </div>
  );
}

export function BasicsFields({ value, onChange, errors = {} }: { value: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void; errors?: Record<string, string> }) {
  const t = useTranslations("onboarding");
  const o = useTranslations("profileOptions");
  const c = useTranslations("common");
  return (
    <div className="space-y-5">
      <Field label={t("displayName")} htmlFor="display_name" hint={t("displayNameHint")} error={errors.display_name}>
        <Input id="display_name" maxLength={40} value={value.display_name} onChange={(e) => onChange({ display_name: e.target.value })} />
      </Field>
      <Field label={t("gender")} error={errors.gender}>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => <Chip key={g} selected={value.gender === g} onClick={() => onChange({ gender: g })}>{o(`gender.${g}`)}</Chip>)}
        </div>
      </Field>
      <Field label={t("bio")} htmlFor="bio" error={errors.bio}>
        <Textarea id="bio" maxLength={500} placeholder={t("bioPlaceholder")} value={value.bio} onChange={(e) => onChange({ bio: e.target.value })} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={<>{t("occupation")} <span className="text-muted">({c("optional")})</span></>} htmlFor="occupation">
          <Input id="occupation" maxLength={80} value={value.occupation} onChange={(e) => onChange({ occupation: e.target.value })} />
        </Field>
        <Field label={<>{t("education")} <span className="text-muted">({c("optional")})</span></>} htmlFor="education">
          <Input id="education" maxLength={80} value={value.education} onChange={(e) => onChange({ education: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

export function RomeFields({ value, onChange, neighborhoods, errors = {} }: { value: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void; neighborhoods: Neighborhood[]; errors?: Record<string, string> }) {
  const t = useTranslations("onboarding");
  const o = useTranslations("profileOptions");
  return (
    <div className="space-y-6">
      <Field label={t("neighborhood")} htmlFor="neighborhood" error={errors.neighborhood}>
        <Select id="neighborhood" value={value.neighborhood} onChange={(e) => onChange({ neighborhood: e.target.value })}>
          <option value="">{t("chooseNeighborhood")}</option>
          {neighborhoods.map((n) => <option key={n.slug} value={n.slug}>{n.name}</option>)}
        </Select>
      </Field>
      <Field label={t("languages")} error={errors.languages}>
        <ChipGroup options={LANGUAGES} value={value.languages} onChange={(languages) => onChange({ languages })} label={(l) => o(`languages.${l}`)} max={10} />
      </Field>
    </div>
  );
}

export function LifestyleFields({ value, onChange }: { value: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void }) {
  const o = useTranslations("profileOptions");
  return (
    <div className="space-y-5">
      {(Object.keys(LIFESTYLE) as LifestyleKey[]).map((key) => (
        <div key={key}>
          <p className="mb-2 text-sm font-medium text-ink-soft">{o(`lifestyleQuestion.${key}`)}</p>
          <div className="flex flex-wrap gap-2">
            {LIFESTYLE[key].map((answer) => (
              <Chip
                key={answer}
                selected={value.lifestyle[key] === answer}
                onClick={() => onChange({ lifestyle: { ...value.lifestyle, [key]: value.lifestyle[key] === answer ? undefined : answer } })}
              >
                {o(`lifestyle.${key}.${answer}` as "lifestyle.smoking.never")}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InterestsFields({ value, onChange, errors = {} }: { value: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void; errors?: Record<string, string> }) {
  const o = useTranslations("profileOptions");
  return (
    <Field error={errors.interests}>
      <ChipGroup options={INTERESTS} value={value.interests} onChange={(interests) => onChange({ interests })} label={(i) => o(`interests.${i}`)} max={15} />
    </Field>
  );
}

export function ValuesFields({ value, onChange }: { value: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void }) {
  const t = useTranslations("onboarding");
  const o = useTranslations("profileOptions");
  return (
    <div className="space-y-7">
      <ChipGroup options={CORE_VALUES} value={value.core_values} onChange={(core_values) => onChange({ core_values })} label={(v) => o(`values.${v}`)} max={8} />
      <div>
        <p className="mb-3 text-sm font-medium text-ink-soft">{t("personality")}</p>
        <ChipGroup options={PERSONALITY} value={value.personality} onChange={(personality) => onChange({ personality })} label={(p) => o(`personality.${p}`)} max={8} />
      </div>
    </div>
  );
}

export function GoalFields({ value, onChange, errors = {} }: { value: ProfileDraft; onChange: (p: Partial<ProfileDraft>) => void; errors?: Record<string, string> }) {
  const o = useTranslations("profileOptions");
  return (
    <Field error={errors.relationship_goal}>
      <div className="grid gap-3">
        {RELATIONSHIP_GOALS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange({ relationship_goal: g })}
            aria-pressed={value.relationship_goal === g}
            className={cn(
              "rounded-[1.5rem] px-6 py-5 text-left transition-all duration-300 active:scale-[0.98]",
              value.relationship_goal === g ? "bg-brand text-white shadow-glow" : "bg-white/85 text-ink shadow-soft ring-1 ring-white hover:-translate-y-0.5",
            )}
          >
            <span className="font-display text-[1.65rem] leading-tight">{o(`goal.${g}`)}</span>
          </button>
        ))}
      </div>
    </Field>
  );
}

export function PreferenceFields({ value, onChange, errors = {} }: { value: PreferencesDraft; onChange: (p: Partial<PreferencesDraft>) => void; errors?: Record<string, string> }) {
  const t = useTranslations("onboarding");
  const o = useTranslations("profileOptions");
  const ages = Array.from({ length: 82 }, (_, i) => i + 18);
  return (
    <div className="space-y-6">
      <Field label={t("interestedIn")} error={errors.interested_in}>
        <ChipGroup options={GENDERS} value={value.interested_in} onChange={(interested_in) => onChange({ interested_in })} label={(g) => o(`genderPlural.${g}`)} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">{t("ageRange", { min: value.age_min, max: value.age_max })}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={<span className="text-xs text-muted">{t("minAge")}</span>} htmlFor="age_min">
            <Select id="age_min" value={value.age_min} onChange={(e) => onChange({ age_min: Number(e.target.value), age_max: Math.max(value.age_max, Number(e.target.value)) })}>
              {ages.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label={<span className="text-xs text-muted">{t("maxAge")}</span>} htmlFor="age_max" error={errors.age_max}>
            <Select id="age_max" value={value.age_max} onChange={(e) => onChange({ age_max: Number(e.target.value) })}>
              {ages.filter((a) => a >= value.age_min).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
        </div>
      </div>
      <Field label={t("acceptedGoals")} hint={t("acceptedGoalsHint")}>
        <ChipGroup options={RELATIONSHIP_GOALS} value={value.goals} onChange={(goals) => onChange({ goals })} label={(g) => o(`goalShort.${g}`)} />
      </Field>
    </div>
  );
}
