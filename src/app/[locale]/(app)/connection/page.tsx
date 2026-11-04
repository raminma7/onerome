import { ArrowUpRight, CalendarHeart, Clock3, HeartHandshake, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Countdown, TimerRing } from "@/components/connection/countdown";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Photo } from "@/components/photo";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
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
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Hero */}
      <section className="bg-night noise relative animate-fade-up overflow-hidden rounded-[2.25rem] p-6 text-white shadow-lift sm:p-8">
        <div className="bg-brand pointer-events-none absolute -right-24 -top-24 size-80 rounded-full opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-apricot/25 blur-3xl" />
        <div className="relative grid grid-cols-[auto_1fr] items-center gap-5 sm:flex sm:gap-7">
          <Link href={`/profile/${connection.partner_id}`} className="relative shrink-0">
            <span className="bg-brand absolute -inset-1.5 rounded-[2.2rem] opacity-80 blur-md" />
            <Photo src={partner?.photos[0]} alt={name} className="relative h-36 w-28 rounded-[1.75rem] ring-4 ring-white/15 sm:h-48 sm:w-36 sm:rounded-[2rem]" />
            <span className="bg-brand absolute -bottom-3 left-1/2 flex size-11 -translate-x-1/2 animate-heartbeat items-center justify-center rounded-full ring-4 ring-night">
              <HeartHandshake className="size-5" />
            </span>
          </Link>
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-apricot ring-1 ring-white/10">
              <span className="size-1.5 animate-pulse rounded-full bg-coral" /> {t("title")}
            </span>
            <h1 className="mt-3 text-[2.2rem] sm:text-5xl">{name}</h1>
            <p className="mt-2 text-sm text-white/60">{t("since", { date: format.dateTime(new Date(connection.started_at), { dateStyle: "long" }) })}</p>
          </div>
          <div className="hidden sm:block">
            <TimerRing since={connection.pending_since} deadline={connection.deadline} />
          </div>
        </div>
        <div className="relative mt-7 flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3.5 ring-1 ring-white/10">
          <Clock3 className="hidden size-5 shrink-0 text-apricot sm:block" />
          <div className="shrink-0 sm:hidden"><TimerRing since={connection.pending_since} deadline={connection.deadline} size={68} /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{timerText}</p>
            <p className="text-xs text-white/55"><Countdown deadline={connection.deadline} /></p>
          </div>
        </div>
      </section>

      {(!connection.me_subscribed || !connection.partner_subscribed) && (
        <Notice tone="warning">
          {t("subscriptionPaused")} {!connection.me_subscribed && <Link href="/billing" className="font-semibold underline">{t("renew")}</Link>}
        </Notice>
      )}

      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/connection/chat" className="bg-brand group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-white shadow-glow transition hover:-translate-y-1">
          <MessageCircleHeart className="size-8" />
          <span className="flex items-end justify-between">
            <span className="font-display text-4xl">{t("openChat")}</span>
            <ArrowUpRight className="size-6 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </Link>
        <Link href="/first-date" className="group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[2rem] bg-white/85 p-6 shadow-soft ring-1 ring-white transition hover:-translate-y-1">
          <CalendarHeart className="size-8 text-coral" />
          <span className="flex items-end justify-between">
            <span className="font-display text-4xl">{t("firstDate")}</span>
            <ArrowUpRight className="size-6 text-muted transition group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </Link>
      </div>

      {/* Rules */}
      <section className="rounded-[2rem] bg-white/85 p-6 shadow-soft ring-1 ring-white">
        <h2 className="flex items-center gap-2 text-3xl"><ShieldCheck className="size-6 text-coral" /> {t("rulesTitle")}</h2>
        <ol className="mt-5 space-y-3">
          {[t("rule1"), t("rule2"), t("rule3")].map((rule, i) => (
            <li key={i} className="flex gap-4 text-[15px] leading-relaxed text-ink-soft">
              <span className="bg-brand-soft flex size-8 shrink-0 items-center justify-center rounded-full font-display text-lg text-bordeaux">{i + 1}</span>
              {rule}
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-ink/5 pt-4"><EndConnectionButton connectionId={connection.connection_id} /></div>
      </section>
    </div>
  );
}
