import { defineRouting } from "next-intl/routing";

export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "it",
  localePrefix: "always",
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

/** Narrows a route param to a supported locale (falls back to the default). */
export function toLocale(value: string): Locale {
  return (locales as readonly string[]).includes(value) ? (value as Locale) : routing.defaultLocale;
}
