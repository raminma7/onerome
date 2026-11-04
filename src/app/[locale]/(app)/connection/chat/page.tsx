import { MessageCircleHeart } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getActiveConnection, getConfigNumber } from "@/lib/data/connection";
import { getPublicProfiles } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { ChatRoom } from "./chat-room";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("chat") };
}

export default async function ChatPage({ params, searchParams }: PageProps<"/[locale]/connection/chat">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("connection");
  const supabase = await createClient();
  const requested = z.uuid().safeParse((await searchParams).c);

  const active = await getActiveConnection(supabase);
  const connectionId = requested.success ? requested.data : active?.connection_id;
  const { data: connection } = connectionId
    ? await supabase.from("connections").select("id, status, user_low, user_high, pending_sender, pending_since, end_reason").eq("id", connectionId).maybeSingle()
    : { data: null };

  if (!connection) {
    return (
      <EmptyState icon={<MessageCircleHeart />} title={t("noneTitle")} text={t("noneText")}>
        <Link href="/likes?tab=matches" className={buttonVariants()}>{t("seeMatches")}</Link>
      </EmptyState>
    );
  }

  const partnerId = connection.user_low === me.id ? connection.user_high : connection.user_low;
  const [{ data: messages }, { data: participants }, profiles, retentionDays] = await Promise.all([
    supabase.from("messages").select("id, sender_id, body, client_id, created_at").eq("connection_id", connection.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("connection_participants").select("user_id, last_read_at").eq("connection_id", connection.id),
    partnerId ? getPublicProfiles(supabase, [partnerId]) : Promise.resolve({} as Awaited<ReturnType<typeof getPublicProfiles>>),
    getConfigNumber(supabase, "closed_chat_retention_days", 90),
  ]);
  const partner = partnerId ? profiles[partnerId] : undefined;
  const isActive = connection.status === "active" && active?.connection_id === connection.id;

  return (
    <ChatRoom
      key={connection.id}
      connectionId={connection.id}
      meId={me.id}
      partner={{ id: partnerId ?? "", name: partner?.display_name ?? "—", photo: partner?.photos[0] ?? null }}
      initialMessages={(messages ?? []).reverse()}
      initialPartnerReadAt={participants?.find((p) => p.user_id !== me.id)?.last_read_at ?? null}
      initialActive={isActive}
      meSubscribed={active?.me_subscribed ?? false}
      partnerSubscribed={active?.partner_subscribed ?? false}
      deadline={isActive ? active!.deadline : null}
      retentionDays={retentionDays}
    />
  );
}
