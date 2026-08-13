import { resolveSupportedLocale, type Locale } from "./locale-registry.ts";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

type LanguagePreference = {
  raw: string;
  locale: Intl.Locale | null;
};

function parseLanguagePreference(raw: string): LanguagePreference {
  const [languageRange = ""] = raw.split(";", 1);
  const tag = languageRange.trim();

  if (!tag || tag === "*") return { raw, locale: null };

  try {
    return { raw, locale: new Intl.Locale(tag) };
  } catch {
    return { raw, locale: null };
  }
}

function isTraditionalChinese(locale: Intl.Locale | null): boolean {
  return locale?.language === "zh" && locale.maximize().script === "Hant";
}

function isGenericChinese(locale: Intl.Locale | null): boolean {
  return (
    locale?.language === "zh" &&
    locale.script === undefined &&
    locale.region === undefined
  );
}

export function sanitizeAcceptLanguage(
  value: string | null,
  detectableLocales: readonly Locale[],
): string | null {
  if (!value) return value;

  const preferences = value
    .split(",")
    .map((entry) => parseLanguagePreference(entry.trim()));
  const hasTraditionalChinesePreference = preferences.some(({ locale }) =>
    isTraditionalChinese(locale),
  );

  const sanitized = preferences.filter(({ locale }) => {
    if (hasTraditionalChinesePreference) {
      if (isTraditionalChinese(locale) || isGenericChinese(locale)) {
        return false;
      }
    }

    if (!locale) return true;
    const supportedLocale = resolveSupportedLocale(locale.toString());
    return (
      supportedLocale === null || detectableLocales.includes(supportedLocale)
    );
  });

  return sanitized.length > 0
    ? sanitized.map(({ raw }) => raw).join(",")
    : null;
}

export function sanitizeLocaleCookie(
  value: string | null,
  detectableLocales: readonly Locale[],
): string | null {
  if (!value) return value;

  const sanitized = value.split(";").filter((entry) => {
    const separator = entry.indexOf("=");
    if (separator === -1) return true;

    const name = entry.slice(0, separator).trim();
    if (name !== LOCALE_COOKIE_NAME) return true;

    const encodedValue = entry.slice(separator + 1).trim();
    let decodedValue: string;
    try {
      decodedValue = decodeURIComponent(encodedValue);
    } catch {
      return false;
    }
    const locale = resolveSupportedLocale(decodedValue);
    return locale !== null && detectableLocales.includes(locale);
  });

  const header = sanitized.map((entry) => entry.trim()).join("; ");
  return header || null;
}

export function serializeLocalePreferenceCookie(locale: Locale): string {
  return `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; SameSite=Lax`;
}

export function persistLocalePreference(locale: Locale): void {
  document.cookie = serializeLocalePreferenceCookie(locale);
}
