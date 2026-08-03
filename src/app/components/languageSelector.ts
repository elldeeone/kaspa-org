import {
  getLocaleDefinition,
  listSelectableLocales,
  pseudoLocale,
  resolveSupportedLocale,
  type Locale,
  type LocaleDefinition,
} from "../../i18n/config.ts";
import { localizePathname } from "../../i18n/pathname.ts";

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

export function buildLanguageHref(
  pathname: string,
  locale: LanguageSelectorLocale,
  search: string,
  hash: string,
): string {
  const localizedPathname = localizePathname(pathname, locale) ?? pathname;
  return `${localizedPathname}${search}${hash}`;
}
