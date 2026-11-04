/** Turns a stored notification (type + data) into a link and translation keys. */
export type NotificationRow = { id: string; type: string; data: Record<string, unknown>; read_at: string | null; created_at: string };

export function notificationLink(n: Pick<NotificationRow, "type" | "data">): string {
  const connection = typeof n.data.connection_id === "string" ? n.data.connection_id : null;
  switch (n.type) {
    case "like_received": return "/likes";
    case "mutual_match": return "/likes?tab=matches";
    case "connection_started":
    case "new_message":
    case "inactivity_reminder": return "/connection/chat";
    case "connection_ended": return connection ? `/connection/chat?c=${connection}` : "/connection";
    case "first_date_update":
    case "booking_status": return "/first-date";
    case "subscription_status": return "/billing";
    case "verification_status": return "/settings";
    default: return "/notifications";
  }
}

/** Key inside notifications.body.* plus ICU params. */
export function notificationBodyKey(n: Pick<NotificationRow, "type" | "data">): { key: string; params: Record<string, string> } {
  const d = n.data as Record<string, string | boolean | undefined>;
  switch (n.type) {
    case "inactivity_reminder":
      return { key: `reminder_${d.awaiting ?? "you"}`, params: { deadline: String(d.deadline ?? "") } };
    case "connection_ended":
      return { key: d.reason === "manual" && d.by_me ? "ended_manual_me" : `ended_${d.reason ?? "manual"}`, params: {} };
    case "first_date_update":
      return { key: `first_date_${d.event ?? "confirmed"}`, params: {} };
    case "booking_status":
      return { key: `booking_${d.status ?? "requested"}`, params: {} };
    case "subscription_status":
      return { key: ["active", "past_due", "canceled"].includes(String(d.status)) ? `subscription_${d.status}` : "subscription_other", params: {} };
    case "verification_status":
      return { key: `verification_${d.status ?? "verified"}`, params: {} };
    default:
      return { key: n.type, params: {} };
  }
}
