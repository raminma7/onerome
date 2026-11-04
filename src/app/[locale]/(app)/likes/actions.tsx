"use client";
import { Heart, MessageCircleHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import { likeAction, startConnectionAction } from "@/server/actions/matching";

export function LikeBackButton({ target }: { target: string }) {
  const t = useTranslations("likes");
  const d = useTranslations("discover");
  const router = useRouter();
  const [run, pending] = useAction();
  return (
    <Button size="sm" className="mt-3 w-full" variant="glass" loading={pending}
      onClick={() => run(() => likeAction(target), { success: d("matched"), onSuccess: () => router.push("/likes?tab=matches") })}>
      <Heart /> {t("likeBack")}
    </Button>
  );
}

type State = "ready" | "current" | "closed" | "locked" | "need_sub" | "partner_need_sub" | "partner_busy";

export function MatchActions({ matchId, name, state }: { matchId: string; name: string; state: State }) {
  const t = useTranslations("likes");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [run, pending] = useAction();

  if (state === "current") return <Link href="/connection" className={buttonVariants({ size: "sm" })}><MessageCircleHeart /> {t("inConnection")}</Link>;
  if (state === "closed") return <p className="text-sm font-medium text-muted">{t("closed")}</p>;
  if (state === "locked") return <p className="text-sm text-muted">{t("lockedNotice")}</p>;
  if (state === "need_sub") return <Link href="/billing" className={buttonVariants({ size: "sm", variant: "outline" })}>{t("needsSubscription")}</Link>;
  if (state === "partner_need_sub") return <p className="text-sm text-muted">{t("partnerNeedsSubscription", { name })}</p>;
  if (state === "partner_busy") return <p className="text-sm text-muted">{t("partnerBusy", { name })}</p>;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><MessageCircleHeart /> {t("startConnection")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("startConfirmTitle")} description={t("startConfirmText", { name })}>
          <div className="bg-brand-soft mb-5 flex items-center gap-3 rounded-2xl p-4 text-sm text-bordeaux"><MessageCircleHeart className="size-5 shrink-0" /> 1 : 1 · 72h</div>
          <Button size="lg" className="w-full" loading={pending}
            onClick={() => run(() => startConnectionAction(matchId), { onSuccess: () => router.push("/connection/chat") })}>
            {t("startConfirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
