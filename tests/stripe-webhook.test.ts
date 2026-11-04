import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");

// --- mocks -----------------------------------------------------------------
const db = {
  events: new Set<string>(),
  subscriptions: new Map<string, Record<string, unknown>>(),
  customers: new Map<string, string>([["cus_1", "user-1"]]),
  notifications: [] as unknown[],
};
const retrieve = vi.fn();

vi.mock("@/lib/env.server", () => ({
  serverEnv: { stripeWebhookSecret: SECRET, stripeSecretKey: "sk_test_dummy", stripePriceId: "price_1", supabaseServiceRoleKey: "x" },
  isStripeConfigured: true,
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: stripe.webhooks, subscriptions: { retrieve } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const q: Record<string, unknown> = {};
      const api = {
        insert: async (row: Record<string, unknown>) => {
          if (table === "stripe_events") {
            if (db.events.has(row.id as string)) return { error: { code: "23505" } };
            db.events.add(row.id as string);
          }
          if (table === "notifications") db.notifications.push(row);
          return { error: null };
        },
        upsert: async (row: Record<string, unknown>) => {
          if (table === "subscriptions") db.subscriptions.set(row.id as string, row);
          if (table === "stripe_customers") db.customers.set(row.stripe_customer_id as string, row.user_id as string);
          return { error: null };
        },
        delete: () => ({ eq: async (_: string, id: string) => (db.events.delete(id), { error: null }) }),
        select: () => api,
        eq: (k: string, v: string) => ((q[k] = v), api),
        maybeSingle: async () => {
          if (table === "stripe_customers") {
            const user = db.customers.get(q.stripe_customer_id as string);
            return { data: user ? { user_id: user } : null };
          }
          if (table === "subscriptions") {
            const s = db.subscriptions.get(q.id as string);
            return { data: s ? { status: s.status } : null };
          }
          return { data: null };
        },
      };
      return api;
    },
  }),
}));

const { POST } = await import("@/app/api/stripe/webhook/route");

function request(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } });
}

const subscription = (status: string) => ({
  id: "sub_1", object: "subscription", status, customer: "cus_1", cancel_at_period_end: false, canceled_at: null, metadata: {},
  items: { data: [{ price: { id: "price_1" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
});

describe("Stripe webhook", () => {
  beforeEach(() => {
    db.events.clear();
    db.subscriptions.clear();
    db.notifications = [];
    retrieve.mockReset();
  });

  it("rejects requests with an invalid signature", async () => {
    const res = await POST(request({ id: "evt_x", type: "customer.subscription.updated", data: { object: subscription("active") } }, "whsec_wrong") as never);
    expect(res.status).toBe(400);
    expect(db.subscriptions.size).toBe(0);
  });

  it("syncs the subscription from the Stripe API, not from the event payload", async () => {
    retrieve.mockResolvedValue(subscription("active"));
    // The event says past_due (stale), the API says active: the API wins.
    const res = await POST(request({ id: "evt_1", type: "customer.subscription.updated", data: { object: subscription("past_due") } }) as never);
    expect(res.status).toBe(200);
    expect(db.subscriptions.get("sub_1")).toMatchObject({ user_id: "user-1", status: "active" });
    expect(db.notifications).toHaveLength(1);
  });

  it("processes each event only once", async () => {
    retrieve.mockResolvedValue(subscription("active"));
    const event = { id: "evt_dup", type: "customer.subscription.created", data: { object: subscription("active") } };
    await POST(request(event) as never);
    const second = await POST(request(event) as never);
    expect(await second.json()).toMatchObject({ duplicate: true });
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it("forgets the event when processing fails so Stripe can retry", async () => {
    retrieve.mockRejectedValue(new Error("network"));
    const res = await POST(request({ id: "evt_fail", type: "customer.subscription.updated", data: { object: subscription("active") } }) as never);
    expect(res.status).toBe(500);
    expect(db.events.has("evt_fail")).toBe(false);
  });

  it("ignores unrelated event types", async () => {
    const res = await POST(request({ id: "evt_other", type: "charge.refunded", data: { object: {} } }) as never);
    expect(res.status).toBe(200);
    expect(db.events.size).toBe(0);
  });
});
