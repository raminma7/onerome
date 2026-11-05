"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { useErrorText } from "@/lib/use-action";
import { registerSchema } from "@/lib/validation/schemas";
import { registerAction } from "@/server/actions/auth";

const DRAFT_KEY = "onerome.register.draft";
type Draft = { email: string; birthDate: string; acceptTerms: boolean; confirmAdult: boolean };

export function RegisterForm() {
  const t = useTranslations("auth");
  const v = useTranslations("validation");
  const errorText = useErrorText();
  const router = useRouter();
  // Draft (without password) survives a language switch.
  const [draft, setDraft] = useState<Draft>({ email: "", birthDate: "", acceptTerms: false, confirmAdult: false });
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted draft once on mount
      if (saved) setDraft((d) => ({ ...d, ...JSON.parse(saved) }));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse({ ...draft, password });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        map[key] ??= v.has(issue.message as "required") ? v(issue.message as "required") : v("required");
      }
      setErrors(map);
      return;
    }
    setErrors({});
    setPending(true);
    const result = await registerAction({ ...draft, password });
    setPending(false);
    if (!result.ok) {
      setFormError(errorText(result.error));
      return;
    }
    sessionStorage.removeItem(DRAFT_KEY);
    router.push(`/verify-email?email=${encodeURIComponent(result.data.email)}`);
  }

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      {formError && <Notice tone="danger">{formError}</Notice>}
      <Field label={t("email")} htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" value={draft.email} aria-invalid={!!errors.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
      </Field>
      <Field label={t("password")} htmlFor="password" hint={t("passwordHint")} error={errors.password}>
        <Input id="password" type="password" autoComplete="new-password" value={password} aria-invalid={!!errors.password}
          onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label={t("birthDate")} htmlFor="birthDate" hint={t("birthDateHint")} error={errors.birthDate}>
        <Input id="birthDate" type="date" max={maxDate.toISOString().slice(0, 10)} min="1910-01-01" value={draft.birthDate}
          aria-invalid={!!errors.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} />
      </Field>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-bordeaux)]" checked={draft.confirmAdult}
          onChange={(e) => setDraft({ ...draft, confirmAdult: e.target.checked })} />
        <span>{t("confirmAdult")}{errors.confirmAdult && <span className="block text-danger">{v("required")}</span>}</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-bordeaux)]" checked={draft.acceptTerms}
          onChange={(e) => setDraft({ ...draft, acceptTerms: e.target.checked })} />
        <span>
          {t.rich("acceptTerms", {
            terms: (c) => <Link href="/terms" target="_blank" className="text-bordeaux underline">{c}</Link>,
            privacy: (c) => <Link href="/privacy" target="_blank" className="text-bordeaux underline">{c}</Link>,
          })}
          {errors.acceptTerms && <span className="block text-danger">{v("required")}</span>}
        </span>
      </label>
      <Button type="submit" className="w-full" size="lg" loading={pending}>{t("submitRegister")}</Button>
      <p className="pt-2 text-center text-sm text-muted">
        {t("haveAccount")} <Link href="/login" className="font-medium text-bordeaux hover:underline">{t("submitLogin")}</Link>
      </p>
    </form>
  );
}
