"use client";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { PhotoManager, type ManagedPhoto } from "@/components/profile/photo-manager";
import {
  BasicsFields, GoalFields, InterestsFields, LifestyleFields, PreferenceFields, RomeFields, ValuesFields,
  type Neighborhood, type PreferencesDraft, type ProfileDraft,
} from "@/components/profile/profile-fields";
import { Button } from "@/components/ui/button";
import { Notice, Progress } from "@/components/ui/card";
import { useErrorText } from "@/lib/use-action";
import { preferencesSchema, profileSchema } from "@/lib/validation/schemas";
import { completeOnboardingAction } from "@/server/actions/onboarding";

const STEPS = ["basics", "photos", "rome", "lifestyle", "interests", "values", "goals", "preferences", "consent"] as const;
type Step = (typeof STEPS)[number];

/** Fields validated at each step (subset of the profile schema). */
const STEP_FIELDS: Partial<Record<Step, (keyof ProfileDraft)[]>> = {
  basics: ["display_name", "gender", "bio", "occupation", "education"],
  rome: ["neighborhood", "languages"],
  interests: ["interests"],
  goals: ["relationship_goal"],
};

type Draft = { step: number; profile: ProfileDraft; preferences: PreferencesDraft; consents: { terms: boolean; sensitive_data: boolean; marketing: boolean } };

export function OnboardingWizard(props: {
  userId: string;
  neighborhoods: Neighborhood[];
  photos: ManagedPhoto[];
  initialProfile: ProfileDraft;
  initialPreferences: PreferencesDraft;
}) {
  const t = useTranslations("onboarding");
  const v = useTranslations("validation");
  const c = useTranslations("common");
  const errorText = useErrorText();
  const storageKey = `onerome.onboarding.${props.userId}`;

  const [draft, setDraft] = useState<Draft>({
    step: 0,
    profile: props.initialProfile,
    preferences: props.initialPreferences,
    consents: { terms: false, sensitive_data: false, marketing: false },
  });
  const [photoCount, setPhotoCount] = useState(props.photos.length);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Draft persistence: switching language remounts the page, answers are restored from sessionStorage.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore once on mount
      if (saved) setDraft((d) => ({ ...d, ...JSON.parse(saved) }));
    } catch {}
    setHydrated(true);
  }, [storageKey]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {}
  }, [draft, hydrated, storageKey]);

  const step = STEPS[draft.step];
  const setProfile = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, profile: { ...d.profile, ...p } }));
  const setPrefs = (p: Partial<PreferencesDraft>) => setDraft((d) => ({ ...d, preferences: { ...d.preferences, ...p } }));
  const go = (delta: number) => {
    setErrors({});
    setFormError(null);
    setDraft((d) => ({ ...d, step: Math.min(STEPS.length - 1, Math.max(0, d.step + delta)) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const translateIssue = (message: string) => (v.has(message as "required") ? v(message as "required") : v("required"));

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    const fields = STEP_FIELDS[step];
    if (fields) {
      const parsed = profileSchema.safeParse(draft.profile);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]) as keyof ProfileDraft;
          if (fields.includes(key)) next[key] ??= translateIssue(issue.message);
        }
      }
    }
    if (step === "photos" && photoCount < 1) next.photos = t("photosIntro");
    if (step === "preferences") {
      const parsed = preferencesSchema.safeParse(draft.preferences);
      if (!parsed.success) for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= translateIssue(issue.message);
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function finish() {
    if (!draft.consents.terms || !draft.consents.sensitive_data) {
      setFormError(errorText("consent_required"));
      return;
    }
    setSaving(true);
    setFormError(null);
    const result = await completeOnboardingAction({ profile: draft.profile, preferences: draft.preferences, consents: draft.consents });
    if (!result.ok) {
      setSaving(false);
      setFormError(errorText(result.error));
      return;
    }
    sessionStorage.removeItem(storageKey);
    window.location.assign(window.location.pathname.replace(/\/onboarding$/, "/discover"));
  }

  const intro = useMemo(
    () =>
      ({
        basics: t("basicsIntro"), photos: t("photosIntro"), rome: t("romeIntro"), lifestyle: t("lifestyleIntro"),
        interests: t("interestsIntro"), values: t("valuesIntro"), goals: t("goalsIntro"), preferences: t("preferencesIntro"),
        consent: t("consentIntro"),
      })[step],
    [step, t],
  );

  return (
    <div className="bg-travertine-texture min-h-dvh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
        <Logo className="text-xl" />
        <LanguageSwitcher persist />
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-32">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{t("step", { current: draft.step + 1, total: STEPS.length })}</p>
        <Progress value={((draft.step + 1) / STEPS.length) * 100} className="mt-3" />
        <section key={step} className="mt-8 animate-fade-up">
          <h1 className="text-4xl sm:text-5xl">{t(`steps.${step}`)}</h1>
          <p className="mb-8 mt-2 text-muted">{intro}</p>

          {step === "basics" && <BasicsFields value={draft.profile} onChange={setProfile} errors={errors} />}
          {step === "photos" && (
            <>
              <PhotoManager userId={props.userId} initial={props.photos} onChange={setPhotoCount} />
              {errors.photos && <Notice tone="danger" className="mt-4">{errorText("photo_required")}</Notice>}
            </>
          )}
          {step === "rome" && <RomeFields value={draft.profile} onChange={setProfile} neighborhoods={props.neighborhoods} errors={errors} />}
          {step === "lifestyle" && <LifestyleFields value={draft.profile} onChange={setProfile} />}
          {step === "interests" && <InterestsFields value={draft.profile} onChange={setProfile} errors={errors} />}
          {step === "values" && <ValuesFields value={draft.profile} onChange={setProfile} />}
          {step === "goals" && <GoalFields value={draft.profile} onChange={setProfile} errors={errors} />}
          {step === "preferences" && <PreferenceFields value={draft.preferences} onChange={setPrefs} errors={errors} />}
          {step === "consent" && (
            <div className="space-y-4">
              {(["sensitive_data", "terms", "marketing"] as const).map((key) => (
                <label key={key} className="flex items-start gap-3 rounded-2xl border border-line bg-white/60 p-4 text-sm leading-relaxed text-ink-soft">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[var(--color-bordeaux)]"
                    checked={draft.consents[key]}
                    onChange={(e) => setDraft((d) => ({ ...d, consents: { ...d.consents, [key]: e.target.checked } }))}
                  />
                  {t(key === "sensitive_data" ? "consentSensitive" : key === "terms" ? "consentTerms" : "consentMarketing")}
                </label>
              ))}
            </div>
          )}
          {formError && <Notice tone="danger" className="mt-6">{formError}</Notice>}
        </section>
      </main>

      <footer className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line/60 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <Button variant="ghost" onClick={() => go(-1)} disabled={draft.step === 0 || saving}>
            <ArrowLeft /> {c("back")}
          </Button>
          {step === "consent" ? (
            <Button size="lg" onClick={finish} loading={saving}>{saving ? t("finishing") : t("finish")}</Button>
          ) : (
            <Button size="lg" onClick={() => validateStep() && go(1)}>{c("continue")}</Button>
          )}
        </div>
      </footer>
    </div>
  );
}
