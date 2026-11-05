import { z } from "zod";
import { CORE_VALUES, GENDERS, INTERESTS, LANGUAGES, LIFESTYLE, PERSONALITY, RELATIONSHIP_GOALS } from "@/lib/domain/options";

/** Age in full years on `today` (Europe/Rome calendar date is close enough for an age gate). */
export function ageFromBirthDate(birth: string, today = new Date()) {
  const d = new Date(birth + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return NaN;
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  const m = today.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date")
  .refine((v) => ageFromBirthDate(v) >= 18, "adult")
  .refine((v) => ageFromBirthDate(v) <= 110, "date");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("email").max(254),
  password: z.string().min(10, "passwordMin").max(128),
  birthDate,
  acceptTerms: z.literal(true, { error: "required" }),
  confirmAdult: z.literal(true, { error: "required" }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("email"),
  password: z.string().min(1, "required").max(128),
});

const lifestyleShape = Object.fromEntries(
  Object.entries(LIFESTYLE).map(([key, values]) => [key, z.enum(values as unknown as [string, ...string[]]).optional()]),
) as Record<keyof typeof LIFESTYLE, z.ZodOptional<z.ZodEnum>>;

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "nameLength").max(40, "nameLength"),
  gender: z.enum(GENDERS),
  bio: z.string().trim().max(500, "max").optional().default(""),
  occupation: z.string().trim().max(80, "max").optional().default(""),
  education: z.string().trim().max(80, "max").optional().default(""),
  neighborhood: z.string().min(1, "required").max(40),
  languages: z.array(z.enum(LANGUAGES)).min(1, "chooseOne").max(10),
  interests: z.array(z.enum(INTERESTS)).min(3, "minInterests").max(15),
  personality: z.array(z.enum(PERSONALITY)).max(8),
  core_values: z.array(z.enum(CORE_VALUES)).max(8),
  lifestyle: z.object(lifestyleShape),
  relationship_goal: z.enum(RELATIONSHIP_GOALS),
});

export const preferencesSchema = z
  .object({
    interested_in: z.array(z.enum(GENDERS)).min(1, "chooseOne"),
    age_min: z.number().int().min(18).max(99),
    age_max: z.number().int().min(18).max(99),
    goals: z.array(z.enum(RELATIONSHIP_GOALS)).max(4),
  })
  .refine((v) => v.age_max >= v.age_min, { message: "ageRange", path: ["age_max"] });

export const onboardingSchema = z.object({
  profile: profileSchema,
  preferences: preferencesSchema,
  consents: z.object({
    terms: z.literal(true),
    sensitive_data: z.literal(true),
    marketing: z.boolean(),
  }),
});

export const emailCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email("email"),
  code: z.string().trim().regex(/^\d{6}$/, "code"),
});

export const uuid = z.uuid();
export const localeSchema = z.enum(["it", "en"]);

export type ProfileInput = z.infer<typeof profileSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
