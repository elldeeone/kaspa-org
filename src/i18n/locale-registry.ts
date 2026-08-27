export const spanishLocale = "es" as const;
export const frenchLocale = "fr" as const;
export const chineseLocale = "zh-CN" as const;
export const supportedLocaleCodes = [
  "en",
  spanishLocale,
  frenchLocale,
  chineseLocale,
] as const;
export type Locale = (typeof supportedLocaleCodes)[number];
export type TextDirection = "ltr" | "rtl";

export type LocaleDefinition = {
  code: Locale;
  label: string;
  hrefLang: string;
  dir: TextDirection;
};

export const localeRegistry: Readonly<Record<Locale, LocaleDefinition>> = {
  en: {
    code: "en",
    label: "English",
    hrefLang: "en",
    dir: "ltr",
  },
  es: {
    code: "es",
    label: "Español",
    hrefLang: "es",
    dir: "ltr",
  },
  fr: {
    code: "fr",
    label: "Français",
    hrefLang: "fr",
    dir: "ltr",
  },
  "zh-CN": {
    code: "zh-CN",
    label: "简体中文",
    hrefLang: "zh-CN",
    dir: "ltr",
  },
};

export const defaultLocale = "en" as const satisfies Locale;

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
