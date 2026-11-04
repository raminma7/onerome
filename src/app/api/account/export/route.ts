import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GDPR access/portability: every personal record the user can read, as JSON. */
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const [profile, preferences, photos, consents, likesSent, likesReceived, passes, blocks, matches, connections, messages, subscriptions, notifications, reports] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("preferences").select("*").eq("user_id", userId).single(),
      supabase.from("profile_photos").select("storage_path, position, created_at").eq("user_id", userId),
      supabase.from("consents").select("kind, version, granted, created_at").eq("user_id", userId),
      supabase.from("likes").select("to_user, created_at").eq("from_user", userId),
      supabase.from("likes").select("from_user, created_at").eq("to_user", userId),
      supabase.from("passes").select("to_user, created_at").eq("from_user", userId),
      supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", userId),
      supabase.from("matches").select("*"),
      supabase.from("connections").select("id, match_id, status, started_at, ended_at, end_reason"),
      supabase.from("messages").select("connection_id, body, created_at").eq("sender_id", userId),
      supabase.from("subscriptions").select("status, current_period_end, cancel_at_period_end, created_at").eq("user_id", userId),
      supabase.from("notifications").select("type, data, read_at, created_at").eq("user_id", userId),
      supabase.from("reports").select("id, reason, status, created_at").eq("reporter_id", userId),
    ]);

  const body = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    email: claims?.claims?.email,
    profile: profile.data,
    preferences: preferences.data,
    photos: photos.data,
    consents: consents.data,
    likes_sent: likesSent.data,
    likes_received: likesReceived.data,
    passes: passes.data,
    blocks: blocks.data,
    matches: matches.data,
    connections: connections.data,
    messages_sent: messages.data,
    subscriptions: subscriptions.data,
    notifications: notifications.data,
    reports_sent: reports.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="onerome-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
