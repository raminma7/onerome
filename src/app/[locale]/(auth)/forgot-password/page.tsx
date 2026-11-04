"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { forgotPasswordAction } from "@/server/actions/auth";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [run, pending] = useAction();
  return (
    <>
      <h1 className="text-4xl">{t("forgotTitle")}</h1>
      <p className="mt-2 text-muted">{t("forgotSubtitle")}</p>
      <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => forgotPasswordAction({ email }), { onSuccess: () => setSent(true) }); }}>
        {sent && <Notice tone="success">{t("linkSent")}</Notice>}
        <Field label={t("email")} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={pending}>{t("sendLink")}</Button>
      </form>
    </>
  );
}
