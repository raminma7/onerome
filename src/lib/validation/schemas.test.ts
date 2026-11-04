import { describe, expect, it } from "vitest";
import { ageFromBirthDate, registerSchema } from "./schemas";

describe("age gate", () => {
  it("computes full years", () => {
    expect(ageFromBirthDate("2000-06-15", new Date("2018-06-14T12:00:00Z"))).toBe(17);
    expect(ageFromBirthDate("2000-06-15", new Date("2018-06-15T12:00:00Z"))).toBe(18);
  });

  it("rejects minors at registration", () => {
    const year = new Date().getUTCFullYear() - 17;
    const result = registerSchema.safeParse({
      email: "a@b.it",
      password: "0123456789",
      birthDate: `${year}-01-01`,
      acceptTerms: true,
      confirmAdult: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts adults", () => {
    const result = registerSchema.safeParse({
      email: "A@B.it ",
      password: "0123456789",
      birthDate: "1990-01-01",
      acceptTerms: true,
      confirmAdult: true,
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.email).toBe("a@b.it");
  });
});
