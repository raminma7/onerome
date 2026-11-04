"use client";
import { Bell, BellRing, CalendarHeart, CreditCard, Heart, HeartHandshake, MessageCircle, BadgeCheck, Clock3, HeartCrack } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/page-header";
import { notificationBodyKey, notificationLink, type NotificationRow } from "@/components/notifications/describe";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction } from "@/server/actions/notifications";

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

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) =>
        setItems((prev) => [p.new as NotificationRow, ...prev]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await markAllNotificationsReadAction();
    router.refresh();
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
        <ul className="divide-y divide-line/70 overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-white/70">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <Link href={notificationLink(n)} className={cn("flex gap-4 px-5 py-4 transition hover:bg-cream/60", !n.read_at && "bg-bordeaux-soft/30")}>
                  <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full", !n.read_at ? "bg-bordeaux text-ivory" : "bg-cream text-muted")}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{t(`types.${n.type}` as "types.like_received")}</span>
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
