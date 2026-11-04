import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env.server";
import { resolveUserId, syncSubscription } from "@/lib/billing/sync";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);

/**
 * Stripe webhook. Security:
 *  - the raw body is verified with the endpoint secret (constructEvent);
 *  - each event id is recorded once in stripe_events (idempotency);
 *  - state is always re-read from the Stripe API (ordering-safe).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, serverEnv.stripeWebhookSecret);
  } catch {
    logger.warn("stripe.webhook_invalid_signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  const { error: dupError } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dupError) {
    if (dupError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    logger.error("stripe.webhook_event_store_failed", dupError);
    return NextResponse.json({ error: "storage" }, { status: 500 });
  }

  try {
    let subscriptionId: string | null = null;
    let customerId: string | null = null;
    let metadataUser: string | null = null;

    const obj = event.data.object as unknown as Record<string, unknown>;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      metadataUser = session.client_reference_id ?? session.metadata?.user_id ?? null;
      if (customerId && metadataUser) {
        await admin.from("stripe_customers").upsert({ user_id: metadataUser, stripe_customer_id: customerId }, { onConflict: "user_id" });
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const sub = event.data.object as Stripe.Subscription;
      subscriptionId = sub.id;
      customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      metadataUser = sub.metadata?.user_id ?? null;
    } else if (event.type.startsWith("invoice.")) {
      const parent = obj.parent as { subscription_details?: { subscription?: string } } | undefined;
      subscriptionId = parent?.subscription_details?.subscription ?? (obj.subscription as string | undefined) ?? null;
      customerId = (obj.customer as string | undefined) ?? null;
    }

    if (subscriptionId && customerId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = await resolveUserId(admin, customerId, metadataUser ?? subscription.metadata?.user_id);
      if (!userId) {
        logger.warn("stripe.webhook_unknown_customer", { type: event.type });
      } else {
        await syncSubscription(admin, subscription, userId);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Allow Stripe to retry: forget the event id so the retry is processed.
    await admin.from("stripe_events").delete().eq("id", event.id);
    logger.error("stripe.webhook_processing_failed", error, { type: event.type });
    return NextResponse.json({ error: "processing" }, { status: 500 });
  }
}
