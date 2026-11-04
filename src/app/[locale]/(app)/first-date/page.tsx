import { CalendarHeart } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getActiveConnection } from "@/lib/data/connection";
import { getPublicProfiles } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { FirstDatePlanner } from "./planner";

export async function generateMetadata() {
  const t = await getTranslations("firstDate");
  return { title: t("title") };
}

export default async function FirstDatePage({ params }: PageProps<"/[locale]/first-date">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const me = await requireActiveProfile();
  const t = await getTranslations("firstDate");
  const supabase = await createClient();
  const connection = await getActiveConnection(supabase);

  const { data: venues } = await supabase.from("venues").select("*").eq("is_active", true).order("name");

  if (!connection) {
    return (
      <>
        <PageHeader title={t("title")} />
        <EmptyState icon={<CalendarHeart />} title={t("title")} text={t("noConnection")}>
          <Link href="/connection" className={buttonVariants()}>{t("title")}</Link>
        </EmptyState>
      </>
    );
  }

  const [{ data: plan }, { data: c }, profiles] = await Promise.all([
    supabase.from("date_plans").select("*").eq("connection_id", connection.connection_id).maybeSingle(),
    supabase.from("connections").select("user_low").eq("id", connection.connection_id).single(),
    getPublicProfiles(supabase, [connection.partner_id]),
  ]);
  const { data: booking } = plan
    ? await supabase.from("booking_requests").select("status").eq("date_plan_id", plan.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const meIsLow = c?.user_low === me.id;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} subtitle={t("intro")} />
      <FirstDatePlanner
        connectionId={connection.connection_id}
        meId={me.id}
        partnerName={profiles[connection.partner_id]?.display_name ?? ""}
        locale={locale}
        plan={plan ? {
          status: plan.status,
          meOptedIn: Boolean(meIsLow ? plan.low_opted_in_at : plan.high_opted_in_at),
          partnerOptedIn: Boolean(meIsLow ? plan.high_opted_in_at : plan.low_opted_in_at),
          meConfirmed: Boolean(meIsLow ? plan.low_confirmed_at : plan.high_confirmed_at),
          partnerConfirmed: Boolean(meIsLow ? plan.high_confirmed_at : plan.low_confirmed_at),
          venueId: plan.venue_id,
          scheduledFor: plan.scheduled_for,
          proposedByMe: plan.proposed_by === me.id,
        } : null}
        bookingStatus={booking?.status ?? null}
        venues={venues ?? []}
      />
    </div>
  );
}
