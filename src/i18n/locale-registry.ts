export const i18nBuildTargets = ["production", "preview", "test"] as const;
export type I18nBuildTarget = (typeof i18nBuildTargets)[number];

export function resolveI18nBuildTarget(
  value: string | undefined,
): I18nBuildTarget {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "production";
  if (
    normalized === "production" ||
    normalized === "preview" ||
    normalized === "test"
  ) {
    return normalized;
  }
  throw new Error(
    `Invalid NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: ${JSON.stringify(value)}`,
  );
}

export type LocaleLifecycle =
  | "production"
  | "preview"
  | "test-only"
  | "disabled";

export const pseudoLocale = "en-XA" as const;
export const spanishLocale = "es" as const;
export const germanLocale = "de" as const;
export const frenchLocale = "fr" as const;
export const chineseLocale = "zh-CN" as const;
export const russianLocale = "ru" as const;
export const indonesianLocale = "id-ID" as const;
export const brazilianPortugueseLocale = "pt-BR" as const;
export const japaneseLocale = "ja" as const;
export const koreanLocale = "ko" as const;
export const supportedLocaleCodes = [
  "en",
  pseudoLocale,
  spanishLocale,
  germanLocale,
  frenchLocale,
  chineseLocale,
  russianLocale,
  indonesianLocale,
  brazilianPortugueseLocale,
  japaneseLocale,
  koreanLocale,
] as const;
export type Locale = (typeof supportedLocaleCodes)[number];
export type TextDirection = "ltr" | "rtl";

export type LocaleDefinition = {
  code: Locale;
  label: string;
  hrefLang: string;
  dir: TextDirection;
  lifecycle: LocaleLifecycle;
};

export const localeRegistry: Readonly<Record<Locale, LocaleDefinition>> = {
  en: {
    code: "en",
    label: "English",
    hrefLang: "en",
    dir: "ltr",
    lifecycle: "production",
  },
  "en-XA": {
    code: "en-XA",
    label: "Pseudo",
    hrefLang: "en-XA",
    dir: "ltr",
    lifecycle: "test-only",
  },
  es: {
    code: "es",
    label: "Español",
    hrefLang: "es",
    dir: "ltr",
    lifecycle: "production",
  },
  de: {
    code: "de",
    label: "Deutsch",
    hrefLang: "de",
    dir: "ltr",
    lifecycle: "production",
  },
  fr: {
    code: "fr",
    label: "Français",
    hrefLang: "fr",
    dir: "ltr",
    lifecycle: "production",
  },
  "zh-CN": {
    code: "zh-CN",
    label: "简体中文",
    hrefLang: "zh-CN",
    dir: "ltr",
    lifecycle: "production",
  },
  ru: {
    code: "ru",
    label: "Русский",
    hrefLang: "ru",
    dir: "ltr",
    lifecycle: "production",
  },
  "id-ID": {
    code: "id-ID",
    label: "Bahasa Indonesia",
    hrefLang: "id-ID",
    dir: "ltr",
    lifecycle: "production",
  },
  "pt-BR": {
    code: "pt-BR",
    label: "Português (Brasil)",
    hrefLang: "pt-BR",
    dir: "ltr",
    lifecycle: "production",
  },
  ja: {
    code: "ja",
    label: "日本語",
    hrefLang: "ja",
    dir: "ltr",
    lifecycle: "preview",
  },
  ko: {
    code: "ko",
    label: "한국어",
    hrefLang: "ko",
    dir: "ltr",
    lifecycle: "preview",
  },
};

export const defaultLocale = "en" as const satisfies Locale;

export function isLifecycleEnabledForTarget(
  lifecycle: LocaleLifecycle,
  target: I18nBuildTarget,
): boolean {
  if (lifecycle === "disabled") return false;
  if (target === "production") return lifecycle === "production";
  if (target === "preview") {
    return lifecycle === "production" || lifecycle === "preview";
  }
  return true;
}

export function isLifecycleSelectable(lifecycle: LocaleLifecycle): boolean {
  return lifecycle === "production" || lifecycle === "preview";
}

export function getLocaleDefinition(locale: Locale): LocaleDefinition {
  return localeRegistry[locale];
}

export function resolveSupportedLocale(
  value: string | undefined,
): Locale | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return (
    supportedLocaleCodes.find(
      (locale) => locale.toLowerCase() === normalized,
    ) ?? null
  );
}
