"use client";
import { BadgeCheck, Bell, EyeOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import { deleteAccountAction, updateVisibilityAction } from "@/server/actions/settings";

export function VisibilitySettings({ isHidden, notifyLikes }: { isHidden: boolean; notifyLikes: boolean }) {
  const t = useTranslations("settings");
  const [hidden, setHidden] = useState(isHidden);
  const [likes, setLikes] = useState(notifyLikes);
  const [run] = useAction();
  return (
    <section>
      <h2 className="mb-2 px-4 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("visibility")}</h2>
      <div className="divide-y divide-ink/[0.06] overflow-hidden rounded-[1.75rem] bg-white/85 shadow-soft ring-1 ring-white">
      <label className="flex items-center gap-3.5 px-4 py-3.5">
        <IconTile className="bg-[#6c5b7b]"><EyeOff /></IconTile>
        <span className="flex-1">
          <span className="block text-[15px] font-medium">{t("hideProfile")}</span>
          <span className="block text-xs text-muted">{t("hideProfileHint")}</span>
        </span>
        <Switch checked={hidden} onCheckedChange={(v) => { setHidden(v); run(() => updateVisibilityAction({ is_hidden: v }), { onError: () => setHidden(!v) }); }} />
      </label>
      <label className="flex items-center gap-3.5 px-4 py-3.5">
        <IconTile className="bg-[#ff9f0a]"><Bell /></IconTile>
        <span className="flex-1 text-[15px] font-medium">{t("notifyLikes")}</span>
        <Switch checked={likes} onCheckedChange={(v) => { setLikes(v); run(() => updateVisibilityAction({ notify_likes: v }), { onError: () => setLikes(!v) }); }} />
      </label>
      </div>
    </section>
  );
}

export function VerificationCard({ status }: { status: string }) {
  const t = useTranslations("settings");
  const tv = useTranslations("verify");
  const verified = status === "verified";
  return (
    <Link href="/verify" className="flex items-center gap-3.5 rounded-[1.75rem] bg-white/85 p-4 shadow-soft ring-1 ring-white transition hover:-translate-y-0.5">
      <IconTile className={verified ? "bg-sky-500" : "bg-brand"}><BadgeCheck /></IconTile>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">{t("verification")}</span>
        <span className="block text-xs text-muted">{verified ? tv("verifiedTitle") : tv("hiddenBanner")}</span>
      </span>
      {!verified && <span className="bg-brand rounded-full px-3 py-1.5 text-xs font-semibold text-white">{tv("hiddenBannerCta")}</span>}
    </Link>
  );
}

export function DeleteAccount() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [run, pending] = useAction();
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-danger/5">
        <IconTile className="bg-danger"><Trash2 /></IconTile>
        <span className="flex-1">
          <span className="block text-[15px] font-medium text-danger">{t("deleteAccount")}</span>
          <span className="block text-xs text-muted">{t("deleteHint")}</span>
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("deleteConfirmTitle")} description={t("deleteConfirmText")}>
          <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder={t("deleteConfirmWord")} aria-label={t("deleteConfirmWord")} />
          <Button variant="danger" className="mt-4 w-full" loading={pending} disabled={word.trim().toUpperCase() !== t("deleteConfirmWord")}
            onClick={() => run(() => deleteAccountAction(word), { success: t("deleted"), onSuccess: () => { router.replace("/"); router.refresh(); } })}>
            {t("deleteAccount")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
