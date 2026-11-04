"use client";
import { Ban, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import { blockAction, reportAction } from "@/server/actions/matching";

const REASONS = ["harassment", "inappropriate_content", "fake_profile", "scam", "spam", "underage", "other"] as const;

export function ReportDialog({ target, name, messageId, open, onOpenChange, onDone }: {
  target: string; name: string; messageId?: string; open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void;
}) {
  const t = useTranslations("safety");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("harassment");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(false);
  const [run, pending] = useAction();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("reportTitle", { name })}>
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          run(() => reportAction({ target, reason, details, messageId, block }), {
            success: t("reportSent"),
            onSuccess: () => { onOpenChange(false); onDone?.(); },
          });
        }}>
          <Field label={t("reportReason")} htmlFor="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
            </Select>
          </Field>
          <Field label={t("reportDetails")} htmlFor="details">
            <Textarea id="details" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--color-bordeaux)]" checked={block} onChange={(e) => setBlock(e.target.checked)} />
            {t("alsoBlock")}
          </label>
          <Notice>{t("reportEndsConnection")}</Notice>
          <Button type="submit" variant="danger" className="w-full" loading={pending}>{t("reportSubmit")}</Button>
          <p className="text-center text-xs text-muted">{t("emergency")}</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BlockDialog({ target, name, open, onOpenChange, onDone }: { target: string; name: string; open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const t = useTranslations("safety");
  const [run, pending] = useAction();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("blockTitle", { name })} description={t("blockText")}>
        <Button variant="danger" className="w-full" loading={pending}
          onClick={() => run(() => blockAction(target), { success: t("blocked"), onSuccess: () => { onOpenChange(false); onDone?.(); } })}>
          {t("blockConfirm")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Report + block buttons for a profile page. */
export function ProfileSafetyActions({ target, name }: { target: string; name: string }) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [report, setReport] = useState(false);
  const [block, setBlock] = useState(false);
  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => setReport(true)}><Flag /> {t("report")}</Button>
      <Button variant="ghost" size="sm" onClick={() => setBlock(true)}><Ban /> {t("block")}</Button>
      <ReportDialog target={target} name={name} open={report} onOpenChange={setReport} onDone={() => router.refresh()} />
      <BlockDialog target={target} name={name} open={block} onOpenChange={setBlock} onDone={() => router.push("/discover")} />
    </div>
  );
}
