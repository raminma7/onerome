"use client";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { getBrowserClient } from "@/lib/supabase/client";
import { useErrorText } from "@/lib/use-action";
import { requestVerificationAction } from "@/server/actions/settings";

/** Fallback: a human moderator compares a "OneRome" selfie with the photos. */
export function ManualReview({ userId, pending }: { userId: string; pending: boolean }) {
  const t = useTranslations("verify");
  const errorText = useErrorText();
  const [sent, setSent] = useState(pending);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await getBrowserClient().storage.from("verification").upload(path, file, { contentType: file.type });
    if (error) toast.error(errorText("upload_failed"));
    else {
      const result = await requestVerificationAction(path);
      if (result.ok) setSent(true);
      else toast.error(errorText(result.error));
    }
    setBusy(false);
  }

  return (
    <section className="rounded-[1.75rem] bg-white/70 p-5 ring-1 ring-white">
      <h2 className="text-xl">{t("manualTitle")}</h2>
      {sent ? (
        <Notice className="mt-3">{t("manualPending")}</Notice>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">{t("manualText")}</p>
          <Button variant="outline" size="sm" className="mt-4" loading={busy} onClick={() => input.current?.click()}><Camera /> {t("manualCta")}</Button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="user" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </>
      )}
    </section>
  );
}
