"use client";
import { Bell, BellRing, CalendarHeart, CreditCard, Heart, HeartHandshake, MessageCircle, BadgeCheck, Clock3, HeartCrack } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/page-header";
import { notificationBodyKey, notificationLink, type NotificationRow } from "@/components/notifications/describe";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import { cn } from "@/lib/utils";
import { announceNotificationsChanged } from "@/lib/notification-events";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/server/actions/notifications";

const ICONS: Record<string, typeof Bell> = {
  like_received: Heart, mutual_match: HeartHandshake, connection_started: HeartHandshake, new_message: MessageCircle,
  inactivity_reminder: Clock3, connection_ended: HeartCrack, first_date_update: CalendarHeart, booking_status: CalendarHeart,
  subscription_status: CreditCard, verification_status: BadgeCheck,
};

export function NotificationList({ userId, initial, pushAvailable }: { userId: string; initial: NotificationRow[]; pushAvailable: boolean }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const router = useRouter();
  const [items, setItems] = useState(initial);

  useEffect(
    () =>
      subscribeAsUser(`notifications-${userId}`, (channel) =>
        channel
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) =>
            setItems((prev) => (prev.some((n) => n.id === (p.new as NotificationRow).id) ? prev : [p.new as NotificationRow, ...prev])),
          )
          // Read elsewhere (e.g. opening the chat marks "new message" as read): keep the list in sync.
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
            const row = p.new as NotificationRow;
            setItems((prev) => prev.map((n) => (n.id === row.id ? { ...n, read_at: row.read_at } : n)));
          }),
      ),
    [userId],
  );

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await markAllNotificationsReadAction();
    announceNotificationsChanged();
    router.refresh();
  }

  /** Opening a notification marks it as seen (optimistically) and updates the badge. */
  function open(n: NotificationRow) {
    if (n.read_at) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    void markNotificationReadAction(n.id).then((result) => {
      if (result.ok) announceNotificationsChanged();
      else setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: null } : x)));
    });
  }

  const body = (n: NotificationRow) => {
    const { key, params } = notificationBodyKey(n);
    if (params.deadline) params.deadline = format.dateTime(new Date(params.deadline), { weekday: "short", hour: "2-digit", minute: "2-digit" });
    return t.has(`body.${key}` as "body.like_received") ? t(`body.${key}` as "body.reminder_you", params as { deadline: string }) : "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pushAvailable ? <PushToggle /> : <span />}
        {items.some((n) => !n.read_at) && <Button variant="ghost" size="sm" onClick={markAll}>{t("markAllRead")}</Button>}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<BellRing />} title={t("empty")} />
      ) : (
        <ul className="divide-y divide-ink/[0.06] overflow-hidden rounded-[1.75rem] bg-white/85 shadow-soft ring-1 ring-white">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <Link href={notificationLink(n)} onClick={() => open(n)} aria-label={!n.read_at ? `${t(`types.${n.type}` as "types.like_received")} (${t("unread")})` : undefined} className={cn("relative flex gap-4 px-5 py-4 transition hover:bg-ink/[0.03]", !n.read_at && "bg-bordeaux-soft/40")}>
                  <span className={cn("squircle mt-0.5 flex size-11 shrink-0 items-center justify-center", !n.read_at ? "bg-brand text-white shadow-glow" : "bg-ink/[0.06] text-muted")}>
                    <Icon className="size-4" />
                  </span>
                  {!n.read_at && <span className="bg-brand absolute right-4 top-4 size-2.5 rounded-full" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2 pr-4">
                      <span className="font-semibold">{t(`types.${n.type}` as "types.like_received")}</span>
                      <span className="shrink-0 text-[11px] text-muted">{format.relativeTime(new Date(n.created_at), now)}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{body(n)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
