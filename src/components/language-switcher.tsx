"use client";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { updateLocaleAction } from "@/server/actions/settings";
import { cn } from "@/lib/utils";

/**
 * Switches between IT and EN. Client state that must survive the switch
 * (e.g. onboarding drafts) is persisted in sessionStorage by its owner.
 * When signed in, the choice is also stored in the profile.
 */
export function LanguageSwitcher({ persist = false, className }: { persist?: boolean; className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function change(next: "it" | "en") {
    if (next === locale) return;
    startTransition(async () => {
      if (persist) await updateLocaleAction(next);
      // @ts-expect-error -- params of the current route are forwarded unchanged
      router.replace({ pathname, params }, { locale: next, scroll: false });
    });
  }

  return (
    <div className={cn("inline-flex rounded-full border border-line bg-white/60 p-0.5 text-xs font-medium", className)} role="group" aria-label="Language">
      {(["it", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => change(l)}
          aria-pressed={locale === l}
          className={cn("rounded-full px-3 py-1.5 uppercase transition", locale === l ? "bg-ink text-ivory" : "text-muted hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
