"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import { endConnectionAction } from "@/server/actions/matching";

export function EndConnectionButton({ connectionId, variant = "ghost" }: { connectionId: string; variant?: "ghost" | "outline" }) {
  const t = useTranslations("connection");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [run, pending] = useAction();
  return (
    <>
      <Button variant={variant} className="text-danger" onClick={() => setOpen(true)}>{t("end")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("endConfirmTitle")} description={t("endConfirmText")}>
          <Button variant="danger" className="w-full" loading={pending}
            onClick={() => run(() => endConnectionAction(connectionId), { success: t("ended"), onSuccess: () => { setOpen(false); router.push("/connection"); router.refresh(); } })}>
            {t("endConfirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
