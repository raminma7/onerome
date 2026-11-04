// Supabase Edge Function: sends Web Push notifications for new in-app notifications.
// Invoked every minute by pg_cron (private.invoke_push_dispatch) with a shared secret.
//
// Required secrets (supabase secrets set ...):
//   PUSH_DISPATCH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TEXT: Record<string, { it: string; en: string; url: string }> = {
  like_received: { it: "Qualcuno ti ha messo like", en: "Someone liked you", url: "/likes" },
  mutual_match: { it: "Nuovo Mutual Match!", en: "New Mutual Match!", url: "/likes?tab=matches" },
  connection_started: { it: "È iniziata una Connessione Esclusiva", en: "An Exclusive Connection has started", url: "/connection/chat" },
  new_message: { it: "Nuovo messaggio", en: "New message", url: "/connection/chat" },
  inactivity_reminder: { it: "Hai un messaggio in attesa: la connessione sta per scadere", en: "A message is waiting: your connection is about to expire", url: "/connection/chat" },
  connection_ended: { it: "La tua connessione è terminata", en: "Your connection has ended", url: "/connection" },
  first_date_update: { it: "Aggiornamento First Date", en: "First Date update", url: "/first-date" },
  booking_status: { it: "Aggiornamento prenotazione", en: "Booking update", url: "/first-date" },
  subscription_status: { it: "Aggiornamento abbonamento", en: "Subscription update", url: "/billing" },
  verification_status: { it: "Verifica del profilo aggiornata", en: "Profile verification updated", url: "/settings" },
};

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (!secret || req.headers.get("x-dispatch-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return new Response("push not configured", { status: 503 });
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:privacy@onerome.app", publicKey, privateKey);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Claim a batch atomically (push_sent_at acts as a lock), so overlapping runs never double-send.
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: pending } = await admin
    .from("notifications")
    .select("id")
    .is("push_sent_at", null)
    .gte("created_at", since)
    .order("created_at")
    .limit(200);
  const ids = (pending ?? []).map((n) => n.id);
  if (ids.length === 0) return Response.json({ sent: 0 });
  const { data: claimed } = await admin
    .from("notifications")
    .update({ push_sent_at: new Date().toISOString() })
    .in("id", ids)
    .is("push_sent_at", null)
    .select("id, user_id, type");
  if (!claimed?.length) return Response.json({ sent: 0 });

  const userIds = [...new Set(claimed.map((n) => n.user_id))];
  const [{ data: subs }, { data: profiles }] = await Promise.all([
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
    admin.from("profiles").select("id, locale").in("id", userIds),
  ]);
  const locale = new Map((profiles ?? []).map((p) => [p.id, p.locale as "it" | "en"]));

  let sent = 0;
  const expired: string[] = [];
  for (const n of claimed) {
    const text = TEXT[n.type];
    if (!text) continue;
    const lang = locale.get(n.user_id) ?? "it";
    // Payload never contains message content or personal data.
    const payload = JSON.stringify({ title: "OneRome", body: text[lang], url: `/${lang}${text.url}`, tag: n.type });
    for (const s of (subs ?? []).filter((x) => x.user_id === n.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(s.id);
      }
    }
  }
  if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);
  return Response.json({ sent, expired: expired.length });
});
