import { describe, expect, it } from "vitest";
import { computeCompatibility, rankCandidates, type CompatibilityProfile } from "./index";

const base: CompatibilityProfile = {
  relationship_goal: "long_term",
  pref_goals: [],
  interests: ["art", "cinema", "wine", "travel"],
  languages: ["it", "en"],
  core_values: ["family", "honesty"],
  personality: ["curious"],
  lifestyle: { smoking: "never", drinking: "socially", exercise: "often", children: "want" },
  neighborhood: "monti",
  neighborhood_zone: "centro",
};

describe("computeCompatibility", () => {
  it("gives 100 to an identical profile", () => {
    expect(computeCompatibility(base, base).score).toBe(100);
  });

  it("is deterministic and symmetric", () => {
    const other = { ...base, interests: ["art", "football"], neighborhood: "eur", neighborhood_zone: "sud" };
    const a = computeCompatibility(base, other);
    expect(computeCompatibility(base, other)).toEqual(a);
    expect(computeCompatibility(other, base).score).toBe(a.score);
  });

  it("always returns an integer between 0 and 100", () => {
    const opposite: CompatibilityProfile = {
      relationship_goal: "open",
      interests: ["gaming"],
      languages: ["zh"],
      core_values: ["freedom"],
      personality: [],
      lifestyle: { smoking: "regularly", drinking: "often", exercise: "rarely", children: "dont_want" },
      neighborhood: "ostia",
      neighborhood_zone: "litorale",
    };
    const result = computeCompatibility({ ...base, neighborhood_zone: "nord", neighborhood: "talenti" }, opposite);
    expect(Number.isInteger(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThan(25);
  });

  it("rewards shared interests and explains why", () => {
    const fewShared = computeCompatibility(base, { ...base, interests: ["art", "gaming", "tech", "gym"] });
    const manyShared = computeCompatibility(base, { ...base, interests: ["art", "cinema", "wine", "jazz"] });
    expect(manyShared.score).toBeGreaterThan(fewShared.score);
    const reason = manyShared.reasons.find((r) => r.key === "compat.sharedInterests");
    expect(reason?.params?.count).toBe(3);
  });

  it("treats wanting vs not wanting children as a lifestyle conflict", () => {
    const conflict = computeCompatibility(base, { ...base, lifestyle: { ...base.lifestyle, children: "dont_want" } });
    expect(conflict.factors.lifestyle).toBeLessThan(0.8);
  });

  it("caps the score when relationship goals are not accepted", () => {
    const result = computeCompatibility({ ...base, pref_goals: ["marriage"] }, { ...base, relationship_goal: "open" });
    expect(result.score).toBeLessThanOrEqual(40);
  });

  it("ignores missing factors instead of penalising them", () => {
    const sparse = computeCompatibility(base, { ...base, lifestyle: {}, core_values: [] });
    expect(sparse.score).toBe(100);
  });

  it("honours custom weights", () => {
    const other = { ...base, neighborhood: "eur", neighborhood_zone: "sud" };
    const proximityHeavy = computeCompatibility(base, other, { goals: 0, interests: 0, values: 0, lifestyle: 0, languages: 0, proximity: 1 });
    expect(proximityHeavy.score).toBe(55);
  });

  it("ranks candidates by score", () => {
    const ranked = rankCandidates(base, [
      { ...base, interests: ["gaming"], relationship_goal: "open" as const },
      { ...base },
    ]);
    expect(ranked[0].compatibility.score).toBe(100);
    expect(ranked[1].compatibility.score).toBeLessThan(100);
  });
});
