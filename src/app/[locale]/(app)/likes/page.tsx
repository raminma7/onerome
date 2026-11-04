import { Heart, HeartHandshake, Lock } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Photo } from "@/components/photo";
import { Notice } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/profiles";
import { getMySubscription, isSubscriptionActive } from "@/lib/data/subscription";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { LikeBackButton, MatchActions } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("likes");
  return { title: t("title") };
}

export default async function LikesPage({ params, searchParams }: PageProps<"/[locale]/likes">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const tab = (await searchParams).tab === "matches" ? "matches" : "received";
  const t = await getTranslations("likes");
  const format = await getFormatter();
  const supabase = await createClient();

  const [{ data: received }, { data: matches }, subscription, { data: active }] = await Promise.all([
    supabase.rpc("get_received_likes"),
    supabase.rpc("get_my_matches"),
    getMySubscription(supabase, me.id),
    supabase.from("connection_participants").select("connection_id").eq("user_id", me.id).eq("is_active", true).maybeSingle(),
  ]);
  const inConnection = Boolean(active);
  const profiles = await getPublicProfiles(supabase, [...(received ?? []).map((r) => r.user_id), ...(matches ?? []).map((m) => m.partner_id)]);
  const meSubscribed = isSubscriptionActive(subscription);
  const receivedList = (received ?? []).filter((r) => profiles[r.user_id]);
  const matchList = (matches ?? []).filter((m) => profiles[m.partner_id]);
  const activeMatches = matchList.filter((m) => m.match_status === "active");

  const tabs = [
    { key: "received", label: t("receivedTab"), count: receivedList.length, icon: Heart },
    { key: "matches", label: t("matchesTab"), count: activeMatches.length, icon: HeartHandshake },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} />
      {inConnection && <Notice tone="warning" className="mb-6 flex items-center gap-2"><Lock className="mr-2 inline size-4" />{t("lockedNotice")}</Notice>}

      <div className="mb-7 flex rounded-full bg-ink/[0.06] p-1 sm:inline-flex" role="tablist">
        {tabs.map((x) => (
          <Link key={x.key} href={`/likes?tab=${x.key}`} role="tab" aria-selected={tab === x.key}
            className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-[13px] font-semibold transition-all sm:flex-none sm:px-5 sm:text-sm", tab === x.key ? "bg-white text-ink shadow-soft" : "text-muted hover:text-ink")}>
            <x.icon className={cn("size-4", tab === x.key && "text-coral")} />
            {x.label}
            {x.count > 0 && <span className={cn("rounded-full px-2 py-0.5 text-[11px]", tab === x.key ? "bg-brand text-white" : "bg-ink/10")}>{x.count}</span>}
          </Link>
        ))}
      </div>

      {tab === "received" ? (
        receivedList.length === 0 ? (
          <EmptyState icon={<Heart />} title={t("receivedTab")} text={t("receivedEmpty")} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {receivedList.map((r, i) => {
              const p = profiles[r.user_id];
              return (
                <li key={r.user_id} className="group relative aspect-[3/4] animate-fade-up overflow-hidden rounded-[1.75rem] shadow-lift" style={{ animationDelay: `${i * 60}ms` }}>
                  <Link href={`/profile/${p.id}`} className="absolute inset-0">
                    <Photo src={p.photos[0]} alt={p.display_name ?? ""} className="size-full transition duration-700 group-hover:scale-105" />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <span className="bg-brand absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-white shadow-glow"><Heart className="size-4" fill="currentColor" /></span>
                  <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
                    <p className="font-display text-[1.7rem] leading-none">{p.display_name} <span className="font-sans text-base font-light">{p.age}</span></p>
                    <p className="mt-1 truncate text-xs text-white/75">{p.neighborhood_name}</p>
                    {!inConnection && <LikeBackButton target={p.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : matchList.length === 0 ? (
        <EmptyState icon={<HeartHandshake />} title={t("matchesTab")} text={t("matchesEmpty")} />
      ) : (
        <>
          {/* Story-style row of active matches */}
          {activeMatches.length > 0 && (
            <div className="scrollbar-none -mx-4 mb-6 flex gap-4 overflow-x-auto px-4 pb-2">
              {activeMatches.map((m) => {
                const p = profiles[m.partner_id];
                return (
                  <Link key={m.match_id} href={`/profile/${p.id}`} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
                    <span className="bg-brand rounded-full p-[3px] shadow-glow">
                      <span className="block rounded-full bg-ivory p-[2px]"><Photo src={p.photos[0]} alt="" className="size-[68px] rounded-full" /></span>
                    </span>
                    <span className="w-full truncate text-xs font-semibold">{p.display_name}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {matchList.map((m, i) => {
              const p = profiles[m.partner_id];
              const isMyConnection = m.connection_status === "active";
              return (
                <li key={m.match_id} style={{ animationDelay: `${i * 60}ms` }}
                  className={cn("flex animate-fade-up gap-4 rounded-[1.75rem] bg-white/85 p-3 pr-5 shadow-soft ring-1 ring-white", m.match_status === "closed" && "opacity-55", isMyConnection && "ring-2 ring-coral/50")}>
                  <Link href={`/profile/${p.id}`} className="shrink-0"><Photo src={p.photos[0]} alt={p.display_name ?? ""} className="h-36 w-28 rounded-[1.35rem]" /></Link>
                  <div className="flex min-w-0 flex-1 flex-col py-1">
                    <p className="font-display text-[2rem] leading-none">{p.display_name} <span className="font-sans text-lg font-light text-muted">{p.age}</span></p>
                    <p className="mt-1.5 text-xs text-muted">{t("matchedOn", { date: format.dateTime(new Date(m.matched_at), { dateStyle: "medium" }) })}</p>
                    <div className="mt-auto pt-3">
                      <MatchActions matchId={m.match_id} name={p.display_name ?? ""}
                        state={isMyConnection ? "current" : m.match_status === "closed" ? "closed" : inConnection ? "locked" : !meSubscribed ? "need_sub" : !m.partner_subscribed ? "partner_need_sub" : m.partner_in_connection ? "partner_busy" : "ready"} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
