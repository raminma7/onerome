"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import {
  adminReportEvidenceAction, adminResolveReportAction, adminReviewVerificationAction, adminSuspendAction, adminUpdateBookingAction,
} from "@/server/actions/admin";

export function SuspendButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [run, pending] = useAction();
  return (
    <Button size="sm" variant={suspended ? "outline" : "danger"} loading={pending}
      onClick={() => {
        const reason = suspended ? undefined : window.prompt(t("suspendReason")) ?? undefined;
        if (!suspended && reason === undefined) return;
        run(() => adminSuspendAction({ userId, suspend: !suspended, reason }), { onSuccess: () => router.refresh() });
      }}>
      {suspended ? t("unsuspend") : t("suspend")}
    </Button>
  );
}

export function ReportActions({ reportId, hasEvidence, open }: { reportId: string; hasEvidence: boolean; open: boolean }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [evidence, setEvidence] = useState<string | null>(null);
  const [run, pending] = useAction();
  return (
    <>
      {hasEvidence && evidence === null && (
        <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => adminReportEvidenceAction(reportId), { onSuccess: (d) => setEvidence(d.message ?? "") })}>
          {t("viewEvidence")}
        </Button>
      )}
      {evidence !== null && <Notice className="w-full">“{evidence}”</Notice>}
      {open && (
        <>
          <Button size="sm" loading={pending} onClick={() => run(() => adminResolveReportAction({ reportId, status: "actioned" }), { onSuccess: () => router.refresh() })}>{t("resolve")}</Button>
          <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => adminResolveReportAction({ reportId, status: "dismissed" }), { onSuccess: () => router.refresh() })}>{t("dismiss")}</Button>
        </>
      )}
    </>
  );
}

export function VerificationActions({ requestId }: { requestId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [run, pending] = useAction();
  return (
    <div className="flex gap-2">
      <Button size="sm" loading={pending} onClick={() => run(() => adminReviewVerificationAction({ requestId, approve: true }), { onSuccess: () => router.refresh() })}>{t("approve")}</Button>
      <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => adminReviewVerificationAction({ requestId, approve: false }), { onSuccess: () => router.refresh() })}>{t("reject")}</Button>
    </div>
  );
}

export function BookingActions({ bookingId }: { bookingId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [run, pending] = useAction();
  return (
    <div className="flex gap-2">
      <Button size="sm" loading={pending} onClick={() => run(() => adminUpdateBookingAction({ bookingId, status: "confirmed" }), { onSuccess: () => router.refresh() })}>{t("confirmBooking")}</Button>
      <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => adminUpdateBookingAction({ bookingId, status: "declined" }), { onSuccess: () => router.refresh() })}>{t("declineBooking")}</Button>
    </div>
  );
}
