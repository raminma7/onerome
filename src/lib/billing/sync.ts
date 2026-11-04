import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Admin = SupabaseClient<Database>;
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

const STATUSES: SubscriptionStatus[] = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"];

/** Maps a Stripe subscription to our row. Period end lives on the item in recent API versions. */
export function toSubscriptionRow(sub: Stripe.Subscription, userId: string) {
  const item = sub.items?.data?.[0];
  const periodEnd =
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;
  const status = (STATUSES.includes(sub.status as SubscriptionStatus) ? sub.status : "incomplete") as SubscriptionStatus;
  return {
    id: sub.id,
    user_id: userId,
    status,
    price_id: item?.price?.id ?? null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  };
}

/** Finds the OneRome user behind a Stripe customer (metadata first, then our mapping table). */
export async function resolveUserId(admin: Admin, customerId: string, metadataUserId?: string | null) {
  if (metadataUserId) return metadataUserId;
  const { data } = await admin.from("stripe_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Upserts the subscription from the authoritative Stripe object and notifies the
 * user when the status changes. Always re-fetch from Stripe before calling
 * this, so out-of-order webhook deliveries cannot regress the state.
 */
export async function syncSubscription(admin: Admin, sub: Stripe.Subscription, userId: string) {
  const row = toSubscriptionRow(sub, userId);
  const { data: previous } = await admin.from("subscriptions").select("status").eq("id", row.id).maybeSingle();
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "id" });
  if (error) throw error;
  if (previous?.status !== row.status) {
    await admin.from("notifications").insert({ user_id: userId, type: "subscription_status", data: { status: row.status } });
  }
  return row;
}
