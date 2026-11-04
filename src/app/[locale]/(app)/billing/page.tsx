import { Check, CreditCard, Lock, Sparkles } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, Notice } from "@/components/ui/card";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getMySubscription, isSubscriptionActive } from "@/lib/data/subscription";
import { isStripeConfigured } from "@/lib/env.server";
import { isStripeTestMode } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { BillingButtons } from "./buttons";

export async function generateMetadata() {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function BillingPage({ params, searchParams }: PageProps<"/[locale]/billing">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const { status: returnStatus } = await searchParams;
  const t = await getTranslations("billing");
  const c = await getTranslations("common");
  const format = await getFormatter();
  const supabase = await createClient();
  const sub = await getMySubscription(supabase, me.id);
  const active = isSubscriptionActive(sub);
  const { data: customer } = await supabase.from("stripe_customers").select("user_id").eq("user_id", me.id).maybeSingle();
  const statusKey = (sub?.status ?? "none") as "active";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} />
      {returnStatus === "success" && <Notice tone="success">{t("success")}</Notice>}
      {returnStatus === "cancelled" && <Notice>{t("cancelled")}</Notice>}
      {!isStripeConfigured && <Notice tone="warning" title={c("notConfigured")}>{c("notConfiguredHint")}</Notice>}

      <Card className="overflow-hidden !rounded-[2.25rem] !p-0">
        <div className="bg-night noise relative overflow-hidden p-7 text-white">
          <div className="bg-brand pointer-events-none absolute -right-20 -top-24 size-72 rounded-full opacity-60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-apricot/25 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-apricot"><Sparkles className="size-4" /> {t("planName")}</p>
              <p className="relative mt-3 font-display text-6xl">{t("price")}</p>
            </div>
            <Badge className="relative" tone={active ? "success" : sub?.status === "past_due" ? "danger" : "glass"}>{t(`status.${statusKey}`)}</Badge>
          </div>
          {sub?.current_period_end && active && (
            <p className="relative mt-4 text-sm text-white/70">
              {sub.cancel_at_period_end
                ? t("endsOn", { date: format.dateTime(new Date(sub.current_period_end), { dateStyle: "long" }) })
                : t("renewsOn", { date: format.dateTime(new Date(sub.current_period_end), { dateStyle: "long" }) })}
            </p>
          )}
        </div>
        <div className="space-y-5 p-7">
          {sub?.status === "past_due" && <Notice tone="danger">{t("pastDueText")}</Notice>}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted">{t("includes")}</p>
            <ul className="space-y-2">
              {(t.raw("features") as string[]).map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px]"><span className="bg-brand flex size-6 shrink-0 items-center justify-center rounded-full text-white"><Check className="size-3.5" strokeWidth={3} /></span> {f}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted">{t("freeIncludes")}</p>
          <BillingButtons active={active} hasCustomer={Boolean(customer)} disabled={!isStripeConfigured} />
          {customer && <p className="text-xs text-muted"><CreditCard className="mr-1 inline size-3.5" />{t("manageHint")}</p>}
          <p className="flex items-start gap-2 text-xs text-muted"><Lock className="mt-0.5 size-3.5 shrink-0" />{t("secure")}</p>
          {isStripeConfigured && isStripeTestMode && <p className="text-xs text-gold">{t("testMode")}</p>}
        </div>
      </Card>
    </div>
  );
}
