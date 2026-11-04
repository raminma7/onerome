"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { resendConfirmationAction } from "@/server/actions/auth";

export function ResendButton({ email }: { email: string }) {
  const t = useTranslations("auth");
  const [run, pending] = useAction();
  return (
    <Button variant="outline" className="mt-8" loading={pending} onClick={() => run(() => resendConfirmationAction({ email }), { success: t("resent") })}>
      {t("resend")}
    </Button>
  );
}
