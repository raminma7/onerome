"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import { resetPasswordAction } from "@/server/actions/auth";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [run, pending] = useAction();
  return (
    <>
      <h1 className="text-4xl">{t("resetTitle")}</h1>
      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => resetPasswordAction({ password }), { success: t("passwordUpdated"), onSuccess: () => router.push("/discover") }); }}>
        <Field label={t("password")} htmlFor="password" hint={t("passwordHint")}>
          <Input id="password" type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={pending}>{t("updatePassword")}</Button>
      </form>
    </>
  );
}
