import en from "@/messages/en.json";

/** Error codes the UI knows how to translate (errors.<code>). */
export type ErrorCode = keyof typeof en.errors;

const KNOWN = new Set(Object.keys(en.errors));

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T) {
  return { ok: true as const, data };
}

export function fail(error: ErrorCode): { ok: false; error: ErrorCode } {
  return { ok: false, error };
}

/**
 * Maps a Supabase/Postgres error to a stable error code. Database RPCs raise
 * P0001 with the code as message (see private.raise_error). Anything unknown
 * becomes "generic" so internal details never reach the client.
 */
export function toErrorCode(error: unknown): ErrorCode {
  if (!error || typeof error !== "object") return "generic";
  const e = error as { message?: string; code?: string };
  const message = e.message ?? "";
  if (KNOWN.has(message)) return message as ErrorCode;
  if (e.code === "42501") return "forbidden";
  if (e.code === "23505") return "generic";
  if (/invalid login credentials/i.test(message)) return "invalid_credentials";
  if (/email not confirmed/i.test(message)) return "not_authenticated";
  if (/already registered|already been registered/i.test(message)) return "email_taken";
  if (/password/i.test(message) && /weak|short|characters/i.test(message)) return "weak_password";
  if (/underage/.test(message)) return "underage";
  return "generic";
}
