"use client";
import { Bell, Compass, Heart, MessageCircleHeart, Shield, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { NOTIFICATIONS_CHANGED } from "@/lib/notification-events";
import { getBrowserClient } from "@/lib/supabase/client";
import { subscribeAsUser } from "@/lib/supabase/realtime";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";

type Item = {
  href: "/discover" | "/likes" | "/connection" | "/notifications" | "/settings" | "/admin";
  key: "discover" | "likes" | "connection" | "notifications" | "profile" | "admin";
  icon: typeof Compass;
};

const ITEMS: Item[] = [
  { href: "/discover", key: "discover", icon: Compass },
  { href: "/likes", key: "likes", icon: Heart },
  { href: "/connection", key: "connection", icon: MessageCircleHeart },
  { href: "/notifications", key: "notifications", icon: Bell },
  { href: "/settings", key: "profile", icon: UserRound },
];

export function AppNav({ userId, initialUnread, inConnection, isAdmin }: { userId: string; initialUnread: number; inConnection: boolean; isAdmin: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // Unread count: starts from the server value and is re-read from the database whenever
  // notifications change (new ones, read here or elsewhere, deleted).
  const [counter, setCounter] = useState({ base: initialUnread, value: initialUnread });
  if (counter.base !== initialUnread) setCounter({ base: initialUnread, value: initialUnread });
  const unread = counter.value;

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;
    const refresh = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      if (!cancelled && typeof count === "number") setCounter((c) => ({ ...c, value: count }));
    };
    const unsubscribe = subscribeAsUser(`nav-notifications-${userId}`, (channel) =>
      channel.on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        void refresh();
      }),
    );
    const onLocalChange = () => void refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED, onLocalChange);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_CHANGED, onLocalChange);
      unsubscribe();
    };
  }, [userId]);

  const items: Item[] = isAdmin ? [...ITEMS, { href: "/admin", key: "admin", icon: Shield }] : ITEMS;
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/") || (href === "/connection" && pathname.startsWith("/first-date"));

  const badge = (item: Item) =>
    item.href === "/notifications" && unread > 0 ? (
      <span className="bg-brand absolute -right-2 -top-1.5 min-w-[18px] animate-pop rounded-full px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
        {unread > 9 ? "9+" : unread}
      </span>
    ) : item.href === "/connection" && inConnection ? (
      <span className="absolute -right-1 -top-0.5 flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-coral opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-coral ring-2 ring-white" />
      </span>
    ) : null;

  return (
    <>
      {/* Desktop: floating glass top bar */}
      <div className="sticky top-0 z-30 hidden px-6 pt-4 md:block">
        <header className="glass mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full px-3 pl-6 shadow-soft">
          <Link href="/discover" aria-label="OneRome"><Logo className="text-2xl" /></Link>
          <nav className="flex items-center gap-1">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn("relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors", active ? "text-white" : "text-ink-soft hover:text-ink")}>
                  {active && <motion.span layoutId="desk-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                  <span className="relative"><item.icon className="size-4" />{badge(item)}</span>
                  <span className="relative">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
          <LanguageSwitcher persist />
        </header>
      </div>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-x-0 border-t-0 px-4 md:hidden">
        <Link href="/discover" aria-label="OneRome"><Logo className="text-[1.4rem]" /></Link>
        <LanguageSwitcher persist />
      </header>

      {/* Mobile floating tab bar (hidden in the full-screen chat) */}
      <nav hidden={pathname.startsWith("/connection/chat")} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden" aria-label="Main">
        <ul className="glass mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] p-1.5 shadow-lift">
          {ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined}
                  className={cn("relative flex flex-col items-center gap-0.5 rounded-[1.35rem] py-2 text-[10.5px] font-semibold transition-colors", active ? "text-white" : "text-muted")}>
                  {active && <motion.span layoutId="tab-pill" className="bg-brand absolute inset-0 rounded-[1.35rem] shadow-glow" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />}
                  <span className="relative">
                    <item.icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                    {badge(item)}
                  </span>
                  <span className="relative">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
