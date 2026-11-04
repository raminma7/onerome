import "server-only";

export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceId: process.env.STRIPE_PRICE_ID ?? "",
};

export const isStripeConfigured = Boolean(
  serverEnv.stripeSecretKey && serverEnv.stripeWebhookSecret && serverEnv.stripePriceId,
);
