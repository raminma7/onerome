/**
 * Closed vocabularies used by profiles. Values are stable identifiers stored in
 * the database; labels live in the translation files (profileOptions.*).
 */
export const GENDERS = ["woman", "man", "non_binary"] as const;
export type Gender = (typeof GENDERS)[number];

export const RELATIONSHIP_GOALS = ["long_term", "marriage", "open", "figuring_out"] as const;
export type RelationshipGoal = (typeof RELATIONSHIP_GOALS)[number];

export const INTERESTS = [
  "art", "architecture", "history", "museums", "opera", "theatre", "cinema", "music_live", "jazz",
  "reading", "writing", "photography", "design", "fashion", "cooking", "wine", "coffee", "street_food",
  "travel", "hiking", "cycling", "running", "football", "tennis", "yoga", "gym", "dancing",
  "sea", "nature", "gardening", "volunteering", "languages", "tech", "gaming", "pets", "meditation",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const PERSONALITY = [
  "curious", "calm", "adventurous", "romantic", "ironic", "creative", "organised", "spontaneous",
  "empathetic", "ambitious", "introvert", "extrovert",
] as const;

export const CORE_VALUES = [
  "family", "career", "faith", "honesty", "kindness", "freedom", "culture", "sustainability",
  "loyalty", "personal_growth", "community", "humour",
] as const;

export const LANGUAGES = ["it", "en", "es", "fr", "de", "pt", "ro", "ar", "zh", "ru", "fa", "uk", "pl", "other"] as const;

/** Lifestyle questions and their ordered answers (order matters for similarity). */
export const LIFESTYLE = {
  smoking: ["never", "sometimes", "regularly"],
  drinking: ["never", "socially", "often"],
  exercise: ["rarely", "sometimes", "often"],
  children: ["have", "want", "open", "dont_want"],
  pets: ["have", "like", "allergic"],
  rhythm: ["early_bird", "flexible", "night_owl"],
} as const;
export type LifestyleKey = keyof typeof LIFESTYLE;
export type Lifestyle = Partial<{ [K in LifestyleKey]: (typeof LIFESTYLE)[K][number] }>;

export const VENUE_CATEGORIES = ["cafe", "restaurant", "wine_bar", "gelateria", "culture", "park", "experience"] as const;

export const NEIGHBORHOOD_ZONES = ["centro", "nord", "est", "sud", "ovest", "litorale"] as const;
export type Zone = (typeof NEIGHBORHOOD_ZONES)[number];
