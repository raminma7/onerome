import { CalendarHeart, Clock3, MessageCircleHeart } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Countdown, TimerBar } from "@/components/connection/countdown";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Photo } from "@/components/photo";
import { buttonVariants } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getActiveConnection } from "@/lib/data/connection";
import { getPublicProfiles } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { EndConnectionButton } from "./end-button";

export async function generateMetadata() {
  const t = await getTranslations("connection");
  return { title: t("title") };
}

export default async function ConnectionPage({ params }: PageProps<"/[locale]/connection">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("connection");
  const format = await getFormatter();
  const supabase = await createClient();
  const connection = await getActiveConnection(supabase);

  if (!connection) {
    return (
      <>
        <PageHeader title={t("title")} />
        <EmptyState icon={<MessageCircleHeart />} title={t("noneTitle")} text={t("noneText")}>
          <Link href="/likes?tab=matches" className={buttonVariants()}>{t("seeMatches")}</Link>
        </EmptyState>
      </>
    );
  }

  const partner = (await getPublicProfiles(supabase, [connection.partner_id]))[connection.partner_id];
  const name = partner?.display_name ?? "";
  const timerText =
    connection.pending_sender === null ? t("timerEmpty")
    : connection.pending_sender === me.id ? t("timerWaitingPartner", { name })
    : t("timerWaitingYou", { name });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("title")} />
      <Card className="overflow-hidden">
        <div className="bg-travertine-texture flex flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:text-left">
          <Link href={`/profile/${connection.partner_id}`}>
            <Photo src={partner?.photos[0]} alt={name} arch className="h-36 w-28 shadow-lift" />
          </Link>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{t("title")}</p>
            <h2 className="mt-1 text-4xl">{t("with", { name })}</h2>
            <p className="mt-1 text-sm text-muted">{t("since", { date: format.dateTime(new Date(connection.started_at), { dateStyle: "long" }) })}</p>
          </div>
        </div>
        <div className="space-y-3 border-t border-line/70 p-6">
          <p className="flex items-center gap-2 text-sm font-medium"><Clock3 className="size-4 text-bordeaux" /> {timerText}</p>
          <TimerBar since={connection.pending_since} deadline={connection.deadline} />
          <p className="text-xs text-muted"><Countdown deadline={connection.deadline} /></p>
          {(!connection.me_subscribed || !connection.partner_subscribed) && (
            <Notice tone="warning">
              {t("subscriptionPaused")}{" "}
              {!connection.me_subscribed && <Link href="/billing" className="font-medium text-bordeaux underline">{t("renew")}</Link>}
            </Notice>
          )}
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Link href="/connection/chat" className={buttonVariants({ size: "lg" })}><MessageCircleHeart /> {t("openChat")}</Link>
            <Link href="/first-date" className={buttonVariants({ size: "lg", variant: "outline" })}><CalendarHeart /> {t("firstDate")}</Link>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-2xl">{t("rulesTitle")}</h3>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>1. {t("rule1")}</li>
          <li>2. {t("rule2")}</li>
          <li>3. {t("rule3")}</li>
        </ol>
        <div className="mt-5"><EndConnectionButton connectionId={connection.connection_id} /></div>
      </Card>
    </div>
  );
}
