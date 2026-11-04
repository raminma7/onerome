/**
 * OneRome compatibility score (v1).
 *
 * Deliberately simple, explainable and tunable: a weighted sum of factor
 * similarities computed only from what both people declared. No randomness,
 * no psychological claims. Hard filters (age, mutual preferences,
 * availability, blocks) are applied in the database BEFORE this runs.
 */
import { LIFESTYLE, type Lifestyle, type LifestyleKey, type RelationshipGoal, type Zone } from "@/lib/domain/options";

export interface CompatibilityProfile {
  relationship_goal: RelationshipGoal | null;
  /** Goals this person accepts in a partner (empty = any). */
  pref_goals?: RelationshipGoal[] | null;
  interests: string[];
  languages: string[];
  core_values: string[];
  personality: string[];
  lifestyle: Lifestyle;
  neighborhood: string | null;
  neighborhood_zone: Zone | string | null;
}

export type Factor = "goals" | "interests" | "values" | "lifestyle" | "languages" | "proximity";

export type Weights = Record<Factor, number>;

export const DEFAULT_WEIGHTS: Weights = {
  goals: 30,
  interests: 20,
  values: 15,
  lifestyle: 15,
  languages: 10,
  proximity: 10,
};

/** A reason is a translation key plus parameters, so it renders in IT and EN. */
export interface Reason {
  key: `compat.${string}`;
  params?: Record<string, string | number>;
  strength: number; // 0..1, used for ordering
}

export interface CompatibilityResult {
  score: number; // 0..100 integer
  factors: Record<Factor, number>; // 0..1 similarity per factor (NaN-free)
  reasons: Reason[];
  shared: { interests: string[]; values: string[]; languages: string[] };
}

const GOAL_DISTANCE: Record<RelationshipGoal, Record<RelationshipGoal, number>> = {
  long_term: { long_term: 1, marriage: 0.85, figuring_out: 0.5, open: 0.25 },
  marriage: { marriage: 1, long_term: 0.85, figuring_out: 0.35, open: 0.1 },
  figuring_out: { figuring_out: 1, long_term: 0.5, open: 0.6, marriage: 0.35 },
  open: { open: 1, figuring_out: 0.6, long_term: 0.25, marriage: 0.1 },
};

function intersect(a: string[] = [], b: string[] = []) {
  const set = new Set(b);
  return [...new Set(a)].filter((x) => set.has(x));
}

/** Overlap coefficient softened towards Jaccard: rewards shared items without punishing long lists too hard. */
function overlap(a: string[] = [], b: string[] = []) {
  if (a.length === 0 || b.length === 0) return null;
  const shared = intersect(a, b).length;
  const union = new Set([...a, ...b]).size;
  const jaccard = shared / union;
  const coefficient = shared / Math.min(new Set(a).size, new Set(b).size);
  return 0.5 * jaccard + 0.5 * coefficient;
}

function goalSimilarity(a: CompatibilityProfile, b: CompatibilityProfile) {
  if (!a.relationship_goal || !b.relationship_goal) return null;
  return GOAL_DISTANCE[a.relationship_goal][b.relationship_goal];
}

function lifestyleSimilarity(a: Lifestyle, b: Lifestyle) {
  const keys = (Object.keys(LIFESTYLE) as LifestyleKey[]).filter((k) => a?.[k] && b?.[k]);
  if (keys.length === 0) return { value: null as number | null, matches: [] as LifestyleKey[] };
  const matches: LifestyleKey[] = [];
  let total = 0;
  for (const key of keys) {
    const scale = LIFESTYLE[key] as readonly string[];
    const ia = scale.indexOf(a[key] as string);
    const ib = scale.indexOf(b[key] as string);
    let sim: number;
    if (key === "children") {
      // Wanting vs not wanting children is a strong mismatch.
      const conflict = (a[key] === "want" && b[key] === "dont_want") || (a[key] === "dont_want" && b[key] === "want");
      sim = ia === ib ? 1 : conflict ? 0 : 0.6;
    } else {
      sim = 1 - Math.abs(ia - ib) / (scale.length - 1);
    }
    if (sim === 1) matches.push(key);
    total += sim;
  }
  return { value: total / keys.length, matches };
}

function proximity(a: CompatibilityProfile, b: CompatibilityProfile) {
  if (!a.neighborhood || !b.neighborhood) return null;
  if (a.neighborhood === b.neighborhood) return 1;
  if (a.neighborhood_zone && a.neighborhood_zone === b.neighborhood_zone) return 0.75;
  if (a.neighborhood_zone === "centro" || b.neighborhood_zone === "centro") return 0.55;
  return 0.3;
}

export function computeCompatibility(
  me: CompatibilityProfile,
  other: CompatibilityProfile,
  weights: Weights = DEFAULT_WEIGHTS,
): CompatibilityResult {
  const sharedInterests = intersect(me.interests, other.interests);
  const sharedValues = intersect(me.core_values, other.core_values);
  const sharedLanguages = intersect(me.languages, other.languages);
  const life = lifestyleSimilarity(me.lifestyle ?? {}, other.lifestyle ?? {});

  const raw: Record<Factor, number | null> = {
    goals: goalSimilarity(me, other),
    interests: overlap(me.interests, other.interests),
    values: overlap(me.core_values, other.core_values),
    lifestyle: life.value,
    languages: me.languages.length && other.languages.length ? (sharedLanguages.length > 0 ? 1 : 0) : null,
    proximity: proximity(me, other),
  };

  // Factors with missing data are excluded and their weight redistributed,
  // so incomplete profiles are neither rewarded nor punished arbitrarily.
  let weighted = 0;
  let usedWeight = 0;
  const factors = {} as Record<Factor, number>;
  for (const factor of Object.keys(weights) as Factor[]) {
    const value = raw[factor];
    factors[factor] = value ?? 0;
    if (value === null) continue;
    weighted += value * weights[factor];
    usedWeight += weights[factor];
  }
  let score = usedWeight > 0 ? (weighted / usedWeight) * 100 : 0;

  // A partner whose goal is outside my accepted goals (or vice versa) cannot score high.
  const goalAccepted =
    (!me.pref_goals?.length || (other.relationship_goal && me.pref_goals.includes(other.relationship_goal))) &&
    (!other.pref_goals?.length || (me.relationship_goal && other.pref_goals.includes(me.relationship_goal)));
  if (!goalAccepted) score = Math.min(score, 40);

  score = Math.round(Math.max(0, Math.min(100, score)));

  const reasons: Reason[] = [];
  if (raw.goals !== null && raw.goals >= 0.85) {
    reasons.push({
      key: me.relationship_goal === other.relationship_goal ? "compat.sameGoal" : "compat.compatibleGoals",
      params: { goal: other.relationship_goal ?? "" },
      strength: raw.goals,
    });
  }
  if (sharedInterests.length > 0) {
    reasons.push({
      key: "compat.sharedInterests",
      params: { count: sharedInterests.length, items: sharedInterests.slice(0, 3).join(",") },
      strength: Math.min(1, sharedInterests.length / 4),
    });
  }
  if (sharedValues.length > 0) {
    reasons.push({
      key: "compat.sharedValues",
      params: { count: sharedValues.length, items: sharedValues.slice(0, 2).join(",") },
      strength: Math.min(1, sharedValues.length / 3),
    });
  }
  if (life.value !== null && life.value >= 0.75) {
    reasons.push({ key: "compat.similarLifestyle", params: { items: life.matches.slice(0, 2).join(",") }, strength: life.value });
  }
  if (raw.proximity === 1) {
    reasons.push({ key: "compat.sameNeighborhood", strength: 0.7 });
  } else if (raw.proximity !== null && raw.proximity >= 0.75) {
    reasons.push({ key: "compat.sameArea", strength: 0.5 });
  }
  if (sharedLanguages.length > 1) {
    reasons.push({ key: "compat.sharedLanguages", params: { count: sharedLanguages.length }, strength: 0.4 });
  }
  reasons.sort((a, b) => b.strength - a.strength);

  return {
    score,
    factors,
    reasons: reasons.slice(0, 4),
    shared: { interests: sharedInterests, values: sharedValues, languages: sharedLanguages },
  };
}

/** Ranks candidates by score, keeping recency (input order) as tie-breaker. */
export function rankCandidates<T extends CompatibilityProfile>(me: CompatibilityProfile, candidates: T[], weights?: Weights) {
  return candidates
    .map((candidate, index) => ({ candidate, index, result: computeCompatibility(me, candidate, weights) }))
    .sort((a, b) => b.result.score - a.result.score || a.index - b.index)
    .map(({ candidate, result }) => ({ ...candidate, compatibility: result }));
}
