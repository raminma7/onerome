/**
 * Minimal structured logger that never prints personal data.
 * Keys that may contain PII are redacted before output.
 */
const REDACT = /(email|password|token|secret|body|message|birth|phone|address|name|authorization|cookie)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT.test(k) ? "[redacted]" : sanitize(v, depth + 1)]),
  );
}

function log(level: "info" | "warn" | "error", event: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, ...((sanitize(meta) as object) ?? {}), at: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) => log("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => log("warn", event, meta),
  error: (event: string, error?: unknown, meta?: Record<string, unknown>) =>
    log("error", event, {
      ...meta,
      error: error instanceof Error ? { name: error.name, code: (error as { code?: string }).code } : (error as { code?: string })?.code,
    }),
};
