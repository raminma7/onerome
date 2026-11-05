import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailCodeSchema } from "@/lib/validation/schemas";

const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "it" }));
vi.mock("@/i18n/navigation", () => ({ redirect: () => {} }));

const { verifyEmailCodeAction } = await import("@/server/actions/auth");

describe("emailCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(emailCodeSchema.safeParse({ email: "A@b.it", code: " 123456 " }).success).toBe(true);
    for (const code of ["12345", "1234567", "12a456", "", "12 456"]) {
      expect(emailCodeSchema.safeParse({ email: "a@b.it", code }).success).toBe(false);
    }
  });
});

describe("verifyEmailCodeAction", () => {
  beforeEach(() => verifyOtp.mockReset());

  it("completes the registration with the right code", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(await verifyEmailCodeAction({ email: "A@B.it", code: "123456" })).toEqual({ ok: true, data: { next: "/it/onboarding" } });
    expect(verifyOtp).toHaveBeenCalledWith({ email: "a@b.it", token: "123456", type: "signup" });
  });

  it("maps wrong/expired and throttled codes", async () => {
    verifyOtp.mockResolvedValue({ error: { status: 403, code: "otp_expired", message: "Token has expired or is invalid" } });
    expect(await verifyEmailCodeAction({ email: "a@b.it", code: "000000" })).toEqual({ ok: false, error: "invalid_code" });
    verifyOtp.mockResolvedValue({ error: { status: 400, code: "bad", message: "invalid token" } });
    expect(await verifyEmailCodeAction({ email: "a@b.it", code: "000000" })).toEqual({ ok: false, error: "invalid_code" });
    verifyOtp.mockResolvedValue({ error: { status: 429, message: "rate limit" } });
    expect(await verifyEmailCodeAction({ email: "a@b.it", code: "000000" })).toEqual({ ok: false, error: "rate_limited" });
  });

  it("rejects malformed input without calling Supabase", async () => {
    expect(await verifyEmailCodeAction({ email: "a@b.it", code: "12" })).toEqual({ ok: false, error: "invalid_code" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
