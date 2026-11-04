"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  ["/admin", "overview"], ["/admin/users", "users"], ["/admin/reports", "reports"], ["/admin/verifications", "verifications"],
  ["/admin/venues", "venues"], ["/admin/bookings", "bookings"], ["/admin/subscriptions", "subscriptions"],
] as const;

export function AdminTabs() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4">
      {TABS.map(([href, key]) => (
        <Link key={href} href={href} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm", pathname === href ? "bg-ink text-ivory" : "text-ink-soft hover:bg-cream")}>
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
