"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { OtpInput } from "@/components/ui/otp-input";
import { Link } from "@/i18n/navigation";
import type { ErrorCode } from "@/lib/errors";
import { useErrorText } from "@/lib/use-action";
import { resendConfirmationAction, verifyEmailCodeAction } from "@/server/actions/auth";

const COOLDOWN = 60;

export function CodeForm({ email }: { email: string }) {
  const t = useTranslations("auth");
  const errorText = useErrorText();
  const [code, setCode] = useState("");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function submit(value = code) {
    if (value.length !== 6 || pending) return;
    setPending(true);
    setError(null);
    const result = await verifyEmailCodeAction({ email, code: value });
    if (result.ok) {
      window.location.assign(result.data.next);
      return;
    }
    setError(result.error);
    setPending(false);
    if (result.error === "invalid_code") setCode("");
  }

  async function resend() {
    setResending(true);
    const result = await resendConfirmationAction({ email });
    setResending(false);
    if (result.ok) {
      toast.success(t("codeSent"));
      setCode("");
      setError(null);
      setCooldown(COOLDOWN);
    } else toast.error(errorText(result.error));
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={submit} disabled={pending} invalid={Boolean(error)} label={t("codeLabel")} />
      {error && <Notice tone="danger">{errorText(error)}</Notice>}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={code.length !== 6}>{t("codeSubmit")}</Button>
      <p className="text-center text-xs text-muted">{t("codeExpires")}</p>
      <div className="flex flex-col items-center gap-2 border-t border-ink/5 pt-5 text-sm">
        <Button type="button" variant="ghost" size="sm" disabled={cooldown > 0} loading={resending} onClick={resend}>
          {cooldown > 0 ? t("codeResendIn", { seconds: cooldown }) : t("codeResend")}
        </Button>
        <Link href="/register" className="text-xs text-muted underline-offset-4 hover:underline">{t("codeWrongEmail")}</Link>
      </div>
    </form>
  );
}
