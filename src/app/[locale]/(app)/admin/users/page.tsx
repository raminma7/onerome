import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { SuspendButton } from "../widgets";

const FILTERS = ["all", "suspended", "reported", "verification_pending"] as const;

export default async function AdminUsers({ searchParams }: PageProps<"/[locale]/admin/users">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const filter = FILTERS.includes(sp.filter as (typeof FILTERS)[number]) ? (sp.filter as (typeof FILTERS)[number]) : "all";
  const t = await getTranslations("admin");
  const b = await getTranslations("billing");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: users } = await supabase.rpc("admin_search_users", { p_query: q || undefined, p_filter: filter, p_limit: 100 });
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder={t("search")} className="max-w-sm" />
        <input type="hidden" name="filter" value={filter} />
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={{ pathname: "/admin/users", query: { q, filter: f } }} className={cn("rounded-full border px-3 py-1 text-xs", filter === f ? "border-ink bg-ink text-ivory" : "border-line")}>{t(`filter.${f}`)}</Link>
        ))}
      </div>
      <Card className="divide-y divide-line/70 overflow-hidden">
        {!users?.length && <p className="p-5 text-sm text-muted">{t("noRows")}</p>}
        {users?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <div className="min-w-48 flex-1">
              <p className="font-medium">{u.display_name ?? "—"} {u.age ? `· ${u.age}` : ""} {u.role === "admin" && <Badge tone="gold">admin</Badge>}</p>
              <p className="text-xs text-muted">{u.email} · {format.dateTime(new Date(u.created_at), { dateStyle: "medium" })}</p>
            </div>
            <Badge>{u.verification}</Badge>
            {u.subscription_status && <Badge tone={u.subscription_status === "active" ? "success" : "neutral"}>{b(`status.${u.subscription_status}`)}</Badge>}
            {u.reports_against > 0 && <Badge tone="danger">{u.reports_against} ⚑</Badge>}
            {u.suspended_at && <Badge tone="danger">{t("filter.suspended")}</Badge>}
            {u.role !== "admin" && <SuspendButton userId={u.id} suspended={Boolean(u.suspended_at)} />}
          </div>
        ))}
      </Card>
    </div>
  );
}
