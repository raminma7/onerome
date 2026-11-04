import { LifeBuoy, ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, Notice } from "@/components/ui/card";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UnblockButton } from "./unblock";

export async function generateMetadata() {
  const t = await getTranslations("safety");
  return { title: t("title") };
}

export default async function SafetyPage({ params }: PageProps<"/[locale]/safety">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("safety");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: blocks }, { data: reports }] = await Promise.all([
    supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", me.id).order("created_at", { ascending: false }),
    supabase.from("reports").select("id, reason, status, created_at").eq("reporter_id", me.id).order("created_at", { ascending: false }),
  ]);
  // Blocked users are no longer visible through public_profiles, so only their display names are shown via a minimal lookup.
  const { data: names } = blocks?.length
    ? await supabase.rpc("get_blocked_users")
    : { data: [] as { user_id: string; display_name: string | null }[] };
  const nameOf = new Map((names ?? []).map((n) => [n.user_id, n.display_name]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("intro")} />
      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-2xl"><ShieldCheck className="size-5 text-bordeaux" /> {t("tipsTitle")}</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {(t.raw("tips") as string[]).map((tip) => <li key={tip}>· {tip}</li>)}
        </ul>
        <Notice tone="warning" className="mt-4"><span className="flex items-center gap-2"><LifeBuoy className="size-4" /> {t("emergency")}</span></Notice>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl">{t("blockedTitle")}</h2>
        {!blocks?.length ? <p className="mt-2 text-sm text-muted">{t("blockedEmpty")}</p> : (
          <ul className="mt-3 divide-y divide-line/70">
            {blocks.map((b) => (
              <li key={b.blocked_id} className="flex items-center justify-between py-3 text-sm">
                <span>{nameOf.get(b.blocked_id) ?? "—"} <span className="text-muted">· {format.dateTime(new Date(b.created_at), { dateStyle: "medium" })}</span></span>
                <UnblockButton target={b.blocked_id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl">{t("reportsTitle")}</h2>
        {!reports?.length ? <p className="mt-2 text-sm text-muted">{t("reportsEmpty")}</p> : (
          <ul className="mt-3 divide-y divide-line/70">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span>{t(`reasons.${r.reason}`)} <span className="text-muted">· {format.dateTime(new Date(r.created_at), { dateStyle: "medium" })}</span></span>
                <Badge tone={r.status === "actioned" ? "success" : "neutral"}>{t(`reportStatus.${r.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
