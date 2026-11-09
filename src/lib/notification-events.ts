"use client";
/**
 * Tiny in-page signal so the navigation badge refreshes immediately after the
 * user reads notifications (Realtime would also deliver the change, a bit later).
 */
export const NOTIFICATIONS_CHANGED = "onerome:notifications-changed";

export function announceNotificationsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}
