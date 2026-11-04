import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { isPushConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { NotificationList } from "./list";
import type { NotificationRow } from "@/components/notifications/describe";

export async function generateMetadata() {
  const t = await getTranslations("notifications");
  return { title: t("title") };
}

export default async function NotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, type, data, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />
      <NotificationList userId={me.id} initial={(data ?? []) as NotificationRow[]} pushAvailable={isPushConfigured} />
    </div>
  );
}
