"use client";
import { Bell, Compass, Heart, MessageCircleHeart, Shield, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";

type Item = { href: "/discover" | "/likes" | "/connection" | "/notifications" | "/settings" | "/admin"; key: "discover" | "likes" | "connection" | "notifications" | "profile" | "admin"; icon: typeof Compass };

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
  // Server count + live increments since the last server render.
  const [live, setLive] = useState({ base: initialUnread, extra: 0 });
  if (live.base !== initialUnread) setLive({ base: initialUnread, extra: 0 });
  const unread = initialUnread + live.extra;

  // Live unread badge: notifications arrive through Supabase Realtime (RLS-filtered).
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`nav-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () =>
        setLive((l) => ({ ...l, extra: l.extra + 1 })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const items: Item[] = isAdmin ? [...ITEMS, { href: "/admin", key: "admin", icon: Shield }] : ITEMS;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/") || (href === "/connection" && pathname.startsWith("/first-date"));

  const badge = (item: Item) =>
    item.href === "/notifications" && unread > 0 ? (
      <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-bordeaux px-1 text-center text-[10px] font-semibold leading-4 text-ivory">
        {unread > 9 ? "9+" : unread}
      </span>
    ) : item.href === "/connection" && inConnection ? (
      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-gold ring-2 ring-ivory" />
    ) : null;

  return (
    <>
      {/* Desktop / tablet header */}
      <header className="sticky top-0 z-30 hidden border-b border-line/60 bg-ivory/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/discover" aria-label="OneRome"><Logo /></Link>
          <nav className="flex items-center gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                  isActive(item.href) ? "bg-cream text-bordeaux" : "text-ink-soft hover:bg-cream/60",
                )}
              >
                <span className="relative"><item.icon className="size-4" />{badge(item)}</span>
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher persist />
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/50 bg-ivory/90 px-4 backdrop-blur md:hidden">
        <Link href="/discover" aria-label="OneRome"><Logo className="text-xl" /></Link>
        <LanguageSwitcher persist />
      </header>

      {/* Mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-ivory/95 backdrop-blur md:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] transition", active ? "text-bordeaux" : "text-muted")}
                >
                  <span className="relative">
                    <item.icon className={cn("size-6 transition", active && "scale-110")} strokeWidth={active ? 2.2 : 1.7} />
                    {badge(item)}
                  </span>
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
