"use client";
import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { useErrorText } from "@/lib/use-action";
import { loginAction } from "@/server/actions/auth";

export function LoginForm({ verifyError, next }: { verifyError?: boolean; next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();
  const [error, setError] = useState<string | null>(verifyError ? t("verifyFailed") : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await loginAction({ email: form.get("email"), password: form.get("password") });
    if (result.ok) {
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? `/${locale}${next}` : result.data.next;
      window.location.assign(safeNext);
      return;
    }
    if (result.error === "email_not_confirmed") {
      // A fresh code was sent: finish the registration on the code screen.
      router.push(`/verify-email?email=${encodeURIComponent(String(form.get("email") ?? ""))}`);
      return;
    }
    setError(errorText(result.error));
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-bordeaux hover:underline">{t("forgot")}</Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>{t("submitLogin")}</Button>
      <p className="pt-2 text-center text-sm text-muted">
        {t("noAccount")} <Link href="/register" className="font-medium text-bordeaux hover:underline">{t("submitRegister")}</Link>
      </p>
    </form>
  );
}
