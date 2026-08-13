import { listSelectableLocales } from "../../i18n/config.ts";
import {
  getLocaleDefinition,
  pseudoLocale,
  resolveSupportedLocale,
  type Locale,
  type LocaleDefinition,
} from "../../i18n/locale-registry.ts";
import { isLocaleRouteSetComplete } from "../../i18n/publication.ts";

export type LanguageSelectorLocale = Exclude<Locale, typeof pseudoLocale>;
export type LanguageSelectorOption = Omit<LocaleDefinition, "code"> & {
  code: LanguageSelectorLocale;
};

function isSelectableLocale(locale: Locale): locale is LanguageSelectorLocale {
  return locale !== pseudoLocale;
}

export const LANGUAGE_SELECTOR_OPTIONS: readonly LanguageSelectorOption[] =
  listSelectableLocales()
    .filter(isSelectableLocale)
    .map((locale) => ({
      ...getLocaleDefinition(locale),
      code: locale,
    }));

export const isLanguageSelectorEnabled =
  LANGUAGE_SELECTOR_OPTIONS.length > 1 &&
  LANGUAGE_SELECTOR_OPTIONS.every(({ code }) => isLocaleRouteSetComplete(code));

export function isLanguageSelectorLocale(
  value: string,
): value is LanguageSelectorLocale {
  const locale = resolveSupportedLocale(value);
  return (
    locale !== null &&
    locale !== pseudoLocale &&
    LANGUAGE_SELECTOR_OPTIONS.some(({ code }) => code === locale)
  );
}
