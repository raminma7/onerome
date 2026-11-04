import { describe, expect, it } from "vitest";
import { formatRemaining } from "@/components/connection/countdown";

describe("formatRemaining", () => {
  it("formats days, hours and minutes", () => {
    expect(formatRemaining(72 * 3_600_000)).toBe("3d 0h");
    expect(formatRemaining(5 * 3_600_000 + 7 * 60_000)).toBe("5h 7m");
    expect(formatRemaining(30_000)).toBe("0m");
    expect(formatRemaining(-1000)).toBe("0m");
  });
});
