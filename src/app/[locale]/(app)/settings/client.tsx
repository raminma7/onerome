"use client";
import { BadgeCheck, Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
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
    <Card className="space-y-5 p-5">
      <h2 className="text-2xl">{t("visibility")}</h2>
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-sm">{t("hideProfile")}</span>
          <span className="block text-xs text-muted">{t("hideProfileHint")}</span>
        </span>
        <Switch checked={hidden} onCheckedChange={(v) => { setHidden(v); run(() => updateVisibilityAction({ is_hidden: v }), { onError: () => setHidden(!v) }); }} />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm">{t("notifyLikes")}</span>
        <Switch checked={likes} onCheckedChange={(v) => { setLikes(v); run(() => updateVisibilityAction({ notify_likes: v }), { onError: () => setLikes(!v) }); }} />
      </label>
    </Card>
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
    <Card className="space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-2xl">{t("verification")} {current === "verified" && <BadgeCheck className="size-5 text-gold" />}</h2>
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
    </Card>
  );
}

export function DeleteAccount() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [run, pending] = useAction();
  return (
    <div className="border-t border-line/70 pt-4">
      <Button variant="ghost" className="px-0 text-danger hover:bg-transparent" onClick={() => setOpen(true)}>{t("deleteAccount")}</Button>
      <p className="text-xs text-muted">{t("deleteHint")}</p>
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
