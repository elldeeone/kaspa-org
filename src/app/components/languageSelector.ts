import {
  defaultLocale,
  getLocaleDefinition,
  listSelectableLocales,
  pseudoLocale,
  resolveSupportedLocale,
  supportedLocaleCodes,
  type Locale,
  type LocaleDefinition,
} from "../../i18n/config.ts";

export type LanguageSelectorLocale = Exclude<Locale, typeof pseudoLocale>;
export type LanguageSelectorOption = Omit<LocaleDefinition, "code"> & {
  code: LanguageSelectorLocale;
};

function isSelectableLocale(locale: Locale): locale is LanguageSelectorLocale {
  return locale !== pseudoLocale;
}

export function createLanguageSelectorOptions(
  locales: readonly Locale[],
): readonly LanguageSelectorOption[] {
  return locales.filter(isSelectableLocale).map((locale) => ({
    ...getLocaleDefinition(locale),
    code: locale,
  }));
}

export const LANGUAGE_SELECTOR_OPTIONS = createLanguageSelectorOptions(
  listSelectableLocales(),
);

export function isLanguageSelectorLocale(
  value: string,
): value is LanguageSelectorLocale {
  const locale = resolveSupportedLocale(value);
  return locale !== null && locale !== pseudoLocale;
}

export function shouldShowLanguageSelector(
  options: readonly LanguageSelectorOption[],
  isRouteSetComplete: (locale: LanguageSelectorLocale) => boolean,
): boolean {
  return (
    options.length > 1 && options.every(({ code }) => isRouteSetComplete(code))
  );
}

function removeRegisteredLocalePrefix(pathname: string): string {
  const normalizedPathname = pathname.toLowerCase();
  const prefix = supportedLocaleCodes.find((locale) => {
    const normalizedPrefix = `/${locale.toLowerCase()}`;
    return (
      normalizedPathname === normalizedPrefix ||
      normalizedPathname.startsWith(`${normalizedPrefix}/`)
    );
  });
  if (!prefix) return pathname;

  const unprefixedPathname = pathname.slice(prefix.length + 1);
  return unprefixedPathname || "/";
}

export function buildLanguageHref(
  pathname: string,
  locale: LanguageSelectorLocale,
  search: string,
  hash: string,
): string {
  const unprefixedPathname = removeRegisteredLocalePrefix(pathname);
  const localeCode = getLocaleDefinition(locale).code;
  const localizedPathname =
    locale === defaultLocale
      ? unprefixedPathname
      : unprefixedPathname === "/"
        ? `/${localeCode}`
        : `/${localeCode}${unprefixedPathname}`;
  return `${localizedPathname}${search}${hash}`;
}
