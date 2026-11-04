import { Heart, HeartHandshake } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Notice } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/profiles";
import { getMySubscription, isSubscriptionActive } from "@/lib/data/subscription";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { LikeBackButton, MatchActions } from "./actions";
import { Photo } from "@/components/photo";

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
  const profiles = await getPublicProfiles(supabase, [
    ...(received ?? []).map((r) => r.user_id),
    ...(matches ?? []).map((m) => m.partner_id),
  ]);
  const meSubscribed = isSubscriptionActive(subscription);

  const tabs = [
    { key: "received", label: t("receivedTab"), count: received?.length ?? 0 },
    { key: "matches", label: t("matchesTab"), count: matches?.filter((m) => m.match_status === "active").length ?? 0 },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} />
      {inConnection && <Notice tone="warning" className="mb-6">{t("lockedNotice")}</Notice>}
      <div className="mb-6 inline-flex rounded-full border border-line bg-white/60 p-1" role="tablist">
        {tabs.map((x) => (
          <Link key={x.key} href={`/likes?tab=${x.key}`} role="tab" aria-selected={tab === x.key}
            className={cn("rounded-full px-5 py-2 text-sm transition", tab === x.key ? "bg-ink text-ivory" : "text-ink-soft")}>
            {x.label} {x.count > 0 && <span className="ml-1 opacity-70">{x.count}</span>}
          </Link>
        ))}
      </div>

      {tab === "received" ? (
        (received ?? []).filter((r) => profiles[r.user_id]).length === 0 ? (
          <EmptyState icon={<Heart />} title={t("receivedTab")} text={t("receivedEmpty")} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(received ?? []).map((r) => {
              const p = profiles[r.user_id];
              if (!p) return null;
              return (
                <li key={r.user_id} className="overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white/80 shadow-soft">
                  <Link href={`/profile/${p.id}`}><Photo src={p.photos[0]} alt={p.display_name ?? ""} className="aspect-[3/4] w-full" /></Link>
                  <div className="p-3">
                    <p className="font-display text-xl leading-tight">{p.display_name}, {p.age}</p>
                    <p className="truncate text-xs text-muted">{p.neighborhood_name}</p>
                    {!inConnection && <LikeBackButton target={p.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (matches ?? []).filter((m) => profiles[m.partner_id]).length === 0 ? (
        <EmptyState icon={<HeartHandshake />} title={t("matchesTab")} text={t("matchesEmpty")} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {(matches ?? []).map((m) => {
            const p = profiles[m.partner_id];
            if (!p) return null;
            const isMyConnection = m.connection_status === "active";
            return (
              <li key={m.match_id} className={cn("flex gap-4 rounded-[var(--radius-card)] border border-line/70 bg-white/80 p-4 shadow-soft", m.match_status === "closed" && "opacity-60")}>
                <Link href={`/profile/${p.id}`} className="shrink-0"><Photo src={p.photos[0]} alt={p.display_name ?? ""} arch className="h-32 w-24" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-display text-2xl leading-tight">{p.display_name}, {p.age}</p>
                  <p className="text-xs text-muted">{t("matchedOn", { date: format.dateTime(new Date(m.matched_at), { dateStyle: "medium" }) })}</p>
                  <div className="mt-auto pt-3">
                    <MatchActions
                      matchId={m.match_id}
                      name={p.display_name ?? ""}
                      state={
                        isMyConnection ? "current"
                        : m.match_status === "closed" ? "closed"
                        : inConnection ? "locked"
                        : !meSubscribed ? "need_sub"
                        : !m.partner_subscribed ? "partner_need_sub"
                        : m.partner_in_connection ? "partner_busy"
                        : "ready"
                      }
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
