import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSubscriptions() {
  const t = await getTranslations("admin");
  const b = await getTranslations("billing");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: subs } = await supabase.rpc("admin_list_subscriptions", { p_limit: 300 });
  return (
    <Card className="divide-y divide-line/70 overflow-hidden">
      {!subs?.length && <p className="p-5 text-sm text-muted">{t("noRows")}</p>}
      {subs?.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <div className="flex-1">
            <p className="font-medium">{s.display_name ?? "—"}</p>
            <p className="font-mono text-xs text-muted">{s.id}</p>
          </div>
          <Badge tone={s.status === "active" ? "success" : s.status === "past_due" ? "danger" : "neutral"}>{b(`status.${s.status}`)}</Badge>
          {s.current_period_end && <span className="text-xs text-muted">{format.dateTime(new Date(s.current_period_end), { dateStyle: "medium" })}{s.cancel_at_period_end ? " ✕" : ""}</span>}
        </div>
      ))}
    </Card>
  );
}
