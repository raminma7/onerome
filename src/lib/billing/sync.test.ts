import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { toSubscriptionRow } from "./sync";

describe("toSubscriptionRow", () => {
  it("reads the period end from the subscription item", () => {
    const sub = {
      id: "sub_123",
      status: "active",
      cancel_at_period_end: true,
      canceled_at: null,
      items: { data: [{ price: { id: "price_1" }, current_period_end: 1_900_000_000 }] },
    } as unknown as Stripe.Subscription;
    const row = toSubscriptionRow(sub, "user-1");
    expect(row).toMatchObject({ id: "sub_123", user_id: "user-1", status: "active", price_id: "price_1", cancel_at_period_end: true });
    expect(row.current_period_end).toBe(new Date(1_900_000_000 * 1000).toISOString());
  });

  it("maps unknown statuses to incomplete", () => {
    const sub = { id: "sub_x", status: "weird", items: { data: [] } } as unknown as Stripe.Subscription;
    expect(toSubscriptionRow(sub, "u").status).toBe("incomplete");
  });
});
