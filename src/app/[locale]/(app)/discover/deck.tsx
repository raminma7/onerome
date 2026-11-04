"use client";
import { Compass, Heart, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/page-header";
import { CompatibilityBlock, PhotoCarousel, ProfileDetails, ProfileHeading, type CompatibilityView, type ProfileViewData } from "@/components/profile/profile-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { useErrorText } from "@/lib/use-action";
import { likeAction, passAction } from "@/server/actions/matching";

export type DeckCard = { profile: ProfileViewData; compatibility: CompatibilityView };

export function DiscoverDeck({ cards }: { cards: DeckCard[] }) {
  const t = useTranslations("discover");
  const c = useTranslations("compat");
  const errorText = useErrorText();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [matched, setMatched] = useState<ProfileViewData | null>(null);
  const card = cards[index];

  async function act(kind: "like" | "pass") {
    if (!card || busy) return;
    setBusy(true);
    const result = kind === "like" ? await likeAction(card.profile.id) : await passAction(card.profile.id);
    if (!result.ok) {
      toast.error(errorText(result.error));
      if (result.error === "exclusive_connection_active") window.location.reload();
      setBusy(false);
      if (result.error !== "target_unavailable") return;
    } else if (kind === "like" && result.data && "status" in result.data && result.data.status === "matched") {
      setMatched(card.profile);
    }
    setLeaving(kind === "like" ? "right" : "left");
    setTimeout(() => {
      setIndex((i) => i + 1);
      setLeaving(null);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);
  }

  if (!card) {
    return <EmptyState icon={<Compass />} title={t("emptyTitle")} text={t("emptyText")} />;
  }

  return (
    <>
      <article
        key={card.profile.id}
        className={`mx-auto grid max-w-5xl gap-6 transition-all duration-300 md:grid-cols-[minmax(0,420px)_1fr] ${
          leaving === "right" ? "translate-x-16 rotate-2 opacity-0" : leaving === "left" ? "-translate-x-16 -rotate-2 opacity-0" : "animate-fade-up"
        }`}
      >
        <div className="relative">
          <PhotoCarousel photos={card.profile.photos} name={card.profile.display_name ?? ""} className="h-[52dvh] w-full rounded-[2rem] shadow-lift md:aspect-[3/4] md:h-auto" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[2rem] bg-gradient-to-t from-ink/80 via-ink/30 to-transparent p-6 pt-20 text-ivory">
            <ProfileHeading profile={card.profile} />
          </div>
          <span className="absolute right-4 top-6 rounded-full bg-ivory/95 px-3 py-1.5 text-sm font-medium text-bordeaux shadow" aria-label={c("label")}>
            {card.compatibility.score}%
          </span>
        </div>

        <div className="space-y-6 pb-28 md:pb-0">
          <div className="md:hidden"><CompatibilityBlock compatibility={card.compatibility} /></div>
          <div className="hidden md:block"><ProfileDetails profile={card.profile} compatibility={card.compatibility} /></div>
          <div className="md:hidden"><ProfileDetails profile={card.profile} /></div>

          {/* Desktop actions */}
          <div className="hidden gap-3 md:flex">
            <Button variant="outline" size="lg" onClick={() => act("pass")} disabled={busy}><X /> {t("pass")}</Button>
            <Button size="lg" onClick={() => act("like")} disabled={busy}><Heart /> {t("like")}</Button>
          </div>
        </div>
      </article>

      {/* Mobile floating actions */}
      <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center gap-6 md:hidden">
        <button onClick={() => act("pass")} disabled={busy} aria-label={t("pass")}
          className="flex size-16 items-center justify-center rounded-full border border-line bg-ivory text-ink-soft shadow-lift transition active:scale-90 disabled:opacity-50">
          <X className="size-7" />
        </button>
        <button onClick={() => act("like")} disabled={busy} aria-label={t("like")}
          className="flex size-16 items-center justify-center rounded-full bg-bordeaux text-ivory shadow-lift transition active:scale-90 disabled:opacity-50">
          <Heart className="size-7" fill="currentColor" />
        </button>
      </div>

      <Dialog open={!!matched} onOpenChange={(o) => !o && setMatched(null)}>
        <DialogContent title={t("matched")} description={matched ? t("matchedText", { name: matched.display_name ?? "" }) : undefined}>
          {matched?.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={matched.photos[0]} alt="" className="arch mx-auto mb-6 h-56 w-44 object-cover shadow-lift" />
          )}
          <div className="flex flex-col gap-3">
            <Link href="/likes?tab=matches" className={buttonVariants({ size: "lg" })}>{t("goToMatches")}</Link>
            <Button variant="ghost" onClick={() => setMatched(null)}>{t("keepDiscovering")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
