import "server-only";
import Stripe from "stripe";
import { isStripeConfigured, serverEnv } from "@/lib/env.server";

let stripe: Stripe | null = null;

/** Returns the Stripe client, or null when Stripe keys are not configured. */
export function getStripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  stripe ??= new Stripe(serverEnv.stripeSecretKey, { appInfo: { name: "OneRome" }, maxNetworkRetries: 2 });
  return stripe;
}

export const isStripeTestMode = serverEnv.stripeSecretKey.startsWith("sk_test_");
