import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card, Notice } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ReportActions, SuspendButton } from "../widgets";

export default async function AdminReports() {
  const t = await getTranslations("admin");
  const s = await getTranslations("safety");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: reports } = await supabase.rpc("admin_list_reports", { p_limit: 200 });
  return (
    <div className="space-y-4">
      <Notice>{t("evidenceNotice")}</Notice>
      {!reports?.length && <p className="text-sm text-muted">{t("noRows")}</p>}
      {reports?.map((r) => (
        <Card key={r.id} className="space-y-2 p-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="danger">{s(`reasons.${r.reason}`)}</Badge>
            <Badge>{s(`reportStatus.${r.status}`)}</Badge>
            <span className="text-xs text-muted">{format.dateTime(new Date(r.created_at), { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <p><span className="text-muted">→</span> <strong>{r.reported_name ?? "—"}</strong> <span className="text-muted">({r.reporter_name ?? "—"})</span></p>
          {r.details && <p className="text-ink-soft">“{r.details}”</p>}
          {r.resolution_note && <p className="text-xs text-muted">{r.resolution_note}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ReportActions reportId={r.id} hasEvidence={r.has_message_evidence} open={["open", "reviewing"].includes(r.status)} />
            {r.reported_user_id && <SuspendButton userId={r.reported_user_id} suspended={false} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
