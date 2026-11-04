"use server";
import { getLocale } from "next-intl/server";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { isSubscriptionActive } from "@/lib/data/subscription";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getOrCreateCustomer(userId: string, email: string | undefined) {
  const stripe = getStripe()!;
  const admin = createAdminClient();
  const { data } = await admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (data) return data.stripe_customer_id;
  const customer = await stripe.customers.create(
    { email, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  await admin.from("stripe_customers").upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: "user_id" });
  return customer.id;
}

export async function createCheckoutAction(): Promise<ActionResult<{ url: string }>> {
  const stripe = getStripe();
  if (!stripe) return fail("service_unavailable");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return fail("not_authenticated");

  const { data: subs } = await supabase.from("subscriptions").select("status, current_period_end").eq("user_id", userId);
  if ((subs ?? []).some(isSubscriptionActive)) return createPortalAction();

  try {
    const locale = await getLocale();
    const customer = await getOrCreateCustomer(userId, claims?.claims?.email as string | undefined);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: userId,
      line_items: [{ price: serverEnv.stripePriceId, quantity: 1 }],
      subscription_data: { metadata: { user_id: userId } },
      metadata: { user_id: userId },
      locale: locale === "it" ? "it" : "en",
      allow_promotion_codes: true,
      success_url: `${publicEnv.siteUrl}/${locale}/billing?status=success`,
      cancel_url: `${publicEnv.siteUrl}/${locale}/billing?status=cancelled`,
    });
    return session.url ? ok({ url: session.url }) : fail("generic");
  } catch (error) {
    logger.error("billing.checkout_failed", error);
    return fail("service_unavailable");
  }
}

export async function createPortalAction(): Promise<ActionResult<{ url: string }>> {
  const stripe = getStripe();
  if (!stripe) return fail("service_unavailable");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return fail("not_authenticated");
  const { data } = await supabase.from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (!data) return fail("not_found");
  try {
    const locale = await getLocale();
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${publicEnv.siteUrl}/${locale}/billing`,
      locale: locale === "it" ? "it" : "en",
    });
    return ok({ url: session.url });
  } catch (error) {
    logger.error("billing.portal_failed", error);
    return fail("service_unavailable");
  }
}
