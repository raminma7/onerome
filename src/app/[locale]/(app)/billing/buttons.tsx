"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { createCheckoutAction, createPortalAction } from "@/server/actions/billing";

export function BillingButtons({ active, hasCustomer, disabled }: { active: boolean; hasCustomer: boolean; disabled: boolean }) {
  const t = useTranslations("billing");
  const [run, pending] = useAction();
  const go = (action: typeof createCheckoutAction) => run(action, { onSuccess: ({ url }) => window.location.assign(url) });
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {!active && <Button size="lg" disabled={disabled} loading={pending} onClick={() => go(createCheckoutAction)}>{t("subscribe")}</Button>}
      {hasCustomer && <Button size="lg" variant="outline" disabled={disabled} loading={pending} onClick={() => go(createPortalAction)}>{t("manage")}</Button>}
    </div>
  );
}
