const AI_ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export const localeCodes = ["en"] as const;
export type Locale = (typeof localeCodes)[number];

export const defaultLocale: Locale = "en";

export type TextDirection = "ltr" | "rtl";

export type LocaleDefinition = {
  code: Locale;
  label: string;
  hrefLang: string;
  dir: TextDirection;
};

const localeDefinitions: Record<Locale, LocaleDefinition> = {
  en: {
    code: "en",
    label: "English",
    hrefLang: "en",
    dir: "ltr",
  },
};

export const isAiDeploymentEnabled = AI_ENABLED_VALUES.has(
  (process.env.NEXT_PUBLIC_KASPA_AI_ENABLED ?? "").trim().toLowerCase(),
);

export function isLocale(value: string | undefined): value is Locale {
  return localeCodes.some((locale) => locale === value);
}

export function getLocaleDefinition(locale: Locale): LocaleDefinition {
  return localeDefinitions[locale];
}

export function listEnabledLocales(): readonly Locale[] {
  return localeCodes;
}
