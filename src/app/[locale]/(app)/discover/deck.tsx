"use client";
import { ChevronDown, Compass, Heart, Info, X } from "lucide-react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/page-header";
import { Photo } from "@/components/photo";
import {
  PhotoCarousel, ProfileDetails, ProfileHeading, ScoreBadge, type CompatibilityView, type ProfileViewData,
} from "@/components/profile/profile-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { useErrorText } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { likeAction, passAction } from "@/server/actions/matching";

export type DeckCard = { profile: ProfileViewData; compatibility: CompatibilityView };

const SWIPE = 110;

export function DiscoverDeck({ cards, myPhoto, canLike = true }: { cards: DeckCard[]; myPhoto?: string | null; canLike?: boolean }) {
  const t = useTranslations("discover");
  const errorText = useErrorText();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<ProfileViewData | null>(null);
  const [details, setDetails] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-14, 14]);
  const likeOpacity = useTransform(x, [20, SWIPE], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE, -20], [1, 0]);
  const detailsRef = useRef<HTMLDivElement>(null);
  const card = cards[index];
  const next = cards[index + 1];

  const tv = useTranslations("verify");
  const router = useRouter();

  async function act(kind: "like" | "pass") {
    if (!card || busy) return;
    if (kind === "like" && !canLike) {
      // Browse-only until the face verification succeeds.
      animate(x, 0, { type: "spring", bounce: 0.35 });
      toast(tv("browseOnly"), { action: { label: tv("hiddenBannerCta"), onClick: () => router.push("/verify") } });
      return;
    }
    setBusy(true);
    const fly = animate(x, kind === "like" ? 600 : -600, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
    const result = kind === "like" ? await likeAction(card.profile.id) : await passAction(card.profile.id);
    await fly;
    if (!result.ok) {
      toast.error(errorText(result.error));
      if (result.error === "exclusive_connection_active") window.location.reload();
      if (result.error !== "target_unavailable") {
        animate(x, 0, { type: "spring", bounce: 0.3 });
        setBusy(false);
        return;
      }
    } else if (kind === "like" && result.data && "status" in result.data && result.data.status === "matched") {
      setMatched(card.profile);
    }
    x.set(0);
    setDetails(false);
    setIndex((i) => i + 1);
    setBusy(false);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE || info.velocity.x > 600) act("like");
    else if (info.offset.x < -SWIPE || info.velocity.x < -600) act("pass");
    else animate(x, 0, { type: "spring", bounce: 0.35 });
  }

  if (!card) {
    return <EmptyState icon={<Compass />} title={t("emptyTitle")} text={t("emptyText")} />;
  }

  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        {/* Card stack */}
        <div className="relative mx-auto w-full max-w-[440px] lg:sticky lg:top-28 lg:self-start">
          <div className="relative h-[calc(100dvh-18.5rem)] max-h-[680px] min-h-[360px] lg:h-[calc(100dvh-17rem)]">
            {next && (
              <div className="absolute inset-0 translate-y-3 scale-[0.95] overflow-hidden rounded-[2.25rem] opacity-70 shadow-soft">
                <Photo src={next.profile.photos[0]} alt="" className="size-full" />
              </div>
            )}
            <motion.article
              key={card.profile.id}
              style={{ x, rotate }}
              drag={busy ? false : "x"}
              dragSnapToOrigin={false}
              dragElastic={0.9}
              onDragEnd={onDragEnd}
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
              className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-[2.25rem] shadow-lift active:cursor-grabbing"
            >
              <PhotoCarousel photos={card.profile.photos} name={card.profile.display_name ?? ""} className="size-full">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute right-4 top-7 z-10"><ScoreBadge score={card.compatibility.score} /></div>
                <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-6 top-16 z-10 -rotate-12 rounded-2xl border-4 border-success px-4 py-1 text-3xl font-black uppercase tracking-wider text-success">
                  {t("like")}
                </motion.div>
                <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute right-6 top-16 z-10 rotate-12 rounded-2xl border-4 border-white px-4 py-1 text-3xl font-black uppercase tracking-wider text-white">
                  {t("pass")}
                </motion.div>
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-6 pb-14 lg:pb-6">
                  <ProfileHeading profile={card.profile} />
                  <button type="button" onClick={() => { setDetails(true); detailsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                    className="glass-dark flex size-11 shrink-0 items-center justify-center rounded-full text-white lg:hidden" aria-label={t("details")}>
                    <Info className="size-5" />
                  </button>
                </div>
              </PhotoCarousel>
            </motion.article>
          </div>

          {/* Actions: overlap the card edge on mobile, below it on desktop */}
          <div className="relative z-20 -mt-9 flex items-center justify-center gap-5 lg:mt-5">
            <button onClick={() => act("pass")} disabled={busy} aria-label={t("pass")}
              className="flex size-16 items-center justify-center rounded-full bg-white text-ink-soft shadow-lift ring-1 ring-ink/5 transition hover:scale-105 active:scale-90 disabled:opacity-50">
              <X className="size-7" strokeWidth={2.5} />
            </button>
            <button onClick={() => act("like")} disabled={busy} aria-label={t("like")}
              className="bg-brand flex size-20 items-center justify-center rounded-full text-white shadow-glow transition hover:scale-105 active:scale-90 disabled:opacity-50">
              <Heart className="size-9" fill="currentColor" />
            </button>
            <button onClick={() => { setDetails((d) => !d); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
              aria-label={t("details")}
              className="flex size-16 items-center justify-center rounded-full bg-white text-ink-soft shadow-lift ring-1 ring-ink/5 transition hover:scale-105 active:scale-90 lg:hidden">
              <ChevronDown className={cn("size-7 transition-transform", details && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div ref={detailsRef} key={`d-${card.profile.id}`} className={cn("scroll-mt-20 animate-fade-up lg:block", details ? "block" : "hidden")}>
          <ProfileDetails profile={card.profile} compatibility={card.compatibility} />
        </div>
      </div>

      {/* Match celebration */}
      <Dialog open={!!matched} onOpenChange={(o) => !o && setMatched(null)}>
        <DialogContent title={t("matched")} hideTitle className="overflow-hidden !bg-night text-white sm:max-w-lg">
          <div className="pointer-events-none absolute inset-0 bg-night" />
          <div className="bg-brand pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 rounded-full opacity-60 blur-3xl" />
          <div className="relative flex flex-col items-center pb-2 pt-6 text-center">
            <div className="relative mb-8 flex h-56 w-72 items-center justify-center">
              <div className="absolute left-4 top-2 h-52 w-36 -rotate-[10deg] overflow-hidden rounded-[1.75rem] shadow-lift ring-4 ring-white/90 animate-pop">
                <Photo src={myPhoto} alt="" className="size-full" />
              </div>
              <div className="absolute right-4 top-2 h-52 w-36 rotate-[10deg] overflow-hidden rounded-[1.75rem] shadow-lift ring-4 ring-white/90 animate-pop [animation-delay:120ms]">
                <Photo src={matched?.photos[0]} alt="" className="size-full" />
              </div>
              <div className="bg-brand relative z-10 mt-40 flex size-16 animate-heartbeat items-center justify-center rounded-full shadow-glow ring-4 ring-night">
                <Heart className="size-7 text-white" fill="currentColor" />
              </div>
            </div>
            <p className="font-display text-6xl text-brand-light">{t("matched")}</p>
            <p className="mt-3 text-white/75">{matched ? t("matchedText", { name: matched.display_name ?? "" }) : ""}</p>
            <div className="mt-8 flex w-full flex-col gap-3">
              <Link href="/likes?tab=matches" className={buttonVariants({ size: "lg" })}>{t("goToMatches")}</Link>
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setMatched(null)}>{t("keepDiscovering")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
