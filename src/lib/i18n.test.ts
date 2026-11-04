import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import it_ from "@/messages/it.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [`${prefix}[${obj.length}]`];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("translations", () => {
  it("Italian and English have exactly the same keys", () => {
    expect(keys(it_).sort()).toEqual(keys(en).sort());
  });
});
