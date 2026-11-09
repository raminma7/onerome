"use client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "./client";

/**
 * Subscribes to a Realtime channel AS THE SIGNED-IN USER.
 *
 * The browser client loads the session from cookies asynchronously; joining a
 * channel before that happens registers the subscription with the anon key, and
 * RLS then (correctly) filters out every private row — no live events arrive.
 * So the user's access token is attached first, then the channel is joined.
 *
 * Returns a cleanup function for useEffect.
 */
export function subscribeAsUser(name: string, configure: (channel: RealtimeChannel) => RealtimeChannel): () => void {
  const supabase = getBrowserClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    const { data } = await supabase.auth.getSession();
    await supabase.realtime.setAuth(data.session?.access_token ?? null);
    if (cancelled) return;
    channel = configure(supabase.channel(name)).subscribe();
  })();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
