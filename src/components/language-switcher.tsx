"use client";
import { motion } from "motion/react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useId, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { updateLocaleAction } from "@/server/actions/settings";

/**
 * IT/EN segmented switch. Client state that must survive the switch (e.g.
 * onboarding drafts) is persisted in sessionStorage by its owner. When signed
 * in, the choice is also stored in the profile.
 */
export function LanguageSwitcher({ persist = false, className, dark }: { persist?: boolean; className?: string; dark?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();
  const pillId = useId();

  function change(next: "it" | "en") {
    if (next === locale) return;
    startTransition(async () => {
      if (persist) await updateLocaleAction(next);
      // @ts-expect-error -- params of the current route are forwarded unchanged
      router.replace({ pathname, params }, { locale: next, scroll: false });
    });
  }

  return (
    <div className={cn("relative inline-flex rounded-full p-1 text-xs font-bold", dark ? "bg-white/10 ring-1 ring-white/15" : "bg-ink/[0.06]", className)} role="group" aria-label="Language">
      {(["it", "en"] as const).map((l) => (
        <button key={l} type="button" disabled={pending} onClick={() => change(l)} aria-pressed={locale === l}
          className={cn("relative rounded-full px-3 py-1.5 uppercase transition-colors", locale === l ? (dark ? "text-ink" : "text-white") : dark ? "text-white/70" : "text-muted hover:text-ink")}>
          {locale === l && <motion.span layoutId={pillId} className={cn("absolute inset-0 rounded-full", dark ? "bg-white" : "bg-ink")} transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}
