"use client";
import { EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Persistent reminder while the profile is invisible (not verified yet). */
export function HiddenProfileBanner({ reason = "unverified" }: { reason?: "unverified" | "cover" }) {
  const t = useTranslations("verify");
  const pathname = usePathname();
  if (pathname.startsWith("/verify") || pathname.startsWith("/connection/chat") || (reason === "cover" && pathname.startsWith("/settings/profile"))) return null;
  return (
    <div className="mx-auto mb-6 max-w-6xl animate-fade-up">
      <div className="bg-night noise relative flex items-center gap-3 overflow-hidden rounded-[1.5rem] px-4 py-3 text-white shadow-lift">
        <div className="bg-brand pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-50 blur-2xl" />
        <span className="bg-brand relative flex size-9 shrink-0 items-center justify-center rounded-xl"><EyeOff className="size-4" /></span>
        <p className="relative flex-1 text-sm font-medium">{reason === "cover" ? t("coverInvalidBanner") : t("hiddenBanner")}</p>
        <Link href={reason === "cover" ? "/settings/profile" : "/verify"} className="relative shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-white/90">
          {reason === "cover" ? t("changePhoto") : t("hiddenBannerCta")}
        </Link>
      </div>
    </div>
  );
}
