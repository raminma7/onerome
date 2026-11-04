import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Subscription = Tables<"subscriptions">;

/** Mirrors private.has_active_subscription() for display purposes (the DB remains the authority). */
export function isSubscriptionActive(sub: Pick<Subscription, "status" | "current_period_end"> | null | undefined) {
  if (!sub) return false;
  return ["active", "trialing"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
}

export async function getMySubscription(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(5);
  const rows = data ?? [];
  // Prefer an active subscription over historical ones.
  return rows.find(isSubscriptionActive) ?? rows[0] ?? null;
}
