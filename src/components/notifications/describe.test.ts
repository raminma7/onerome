import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import { notificationBodyKey, notificationLink } from "./describe";

const types = Object.keys(en.notifications.types);
const samples = [
  ...types.map((type) => ({ type, data: {} })),
  { type: "inactivity_reminder", data: { awaiting: "partner", deadline: "x" } },
  { type: "inactivity_reminder", data: { awaiting: "anyone" } },
  ...["manual", "timeout", "block", "report", "account_deleted", "admin"].map((reason) => ({ type: "connection_ended", data: { reason } })),
  { type: "connection_ended", data: { reason: "manual", by_me: true } },
  ...["invited", "unlocked", "proposed", "confirmed", "cancelled"].map((event) => ({ type: "first_date_update", data: { event } })),
  ...["requested", "confirmed", "declined", "cancelled"].map((status) => ({ type: "booking_status", data: { status } })),
  ...["active", "past_due", "canceled", "unpaid"].map((status) => ({ type: "subscription_status", data: { status } })),
  ...["verified", "rejected"].map((status) => ({ type: "verification_status", data: { status } })),
];

describe("notification descriptions", () => {
  it("every notification resolves to an existing translation", () => {
    for (const s of samples) {
      const { key } = notificationBodyKey(s);
      expect(en.notifications.body, `${s.type} -> ${key}`).toHaveProperty(key);
    }
  });

  it("links closed connections to their read-only chat", () => {
    expect(notificationLink({ type: "connection_ended", data: { connection_id: "abc" } })).toBe("/connection/chat?c=abc");
  });
});
