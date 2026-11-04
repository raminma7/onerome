"use client";
import { BadgeCheck, Bell, Camera, EyeOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconTile, Notice } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "@/i18n/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { useAction, useErrorText } from "@/lib/use-action";
import { deleteAccountAction, requestVerificationAction, updateVisibilityAction } from "@/server/actions/settings";

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

export function VerificationCard({ userId, status }: { userId: string; status: string }) {
  const t = useTranslations("settings");
  const errorText = useErrorText();
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await getBrowserClient().storage.from("verification").upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(errorText("upload_failed"));
    } else {
      const result = await requestVerificationAction(path);
      if (result.ok) setCurrent("pending");
      else toast.error(errorText(result.error));
    }
    setBusy(false);
  }

  return (
    <section className="space-y-3 rounded-[1.75rem] bg-white/85 p-5 shadow-soft ring-1 ring-white">
      <h2 className="flex items-center gap-3 text-[1.7rem]"><IconTile className="bg-sky-500"><BadgeCheck /></IconTile>{t("verification")}</h2>
      {current === "verified" ? (
        <Notice tone="success">{t("verificationDone")}</Notice>
      ) : current === "pending" ? (
        <Notice>{t("verificationPending")}</Notice>
      ) : (
        <>
          {current === "rejected" && <Notice tone="warning">{t("verificationRejected")}</Notice>}
          <p className="text-sm text-muted">{t("verificationText")}</p>
          <Button variant="outline" loading={busy} onClick={() => input.current?.click()}><Camera /> {t("uploadSelfie")}</Button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="user" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </>
      )}
    </section>
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
