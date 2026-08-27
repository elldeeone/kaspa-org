import {
  getLocaleDefinition,
  resolveSupportedLocale,
  supportedLocaleCodes,
  type Locale,
  type LocaleDefinition,
} from "../../i18n/locale-registry.ts";

export type LanguageSelectorLocale = Locale;
export type LanguageSelectorOption = Omit<LocaleDefinition, "code"> & {
  code: LanguageSelectorLocale;
};

export const LANGUAGE_SELECTOR_OPTIONS: readonly LanguageSelectorOption[] =
  supportedLocaleCodes.map((locale) => ({
    ...getLocaleDefinition(locale),
    code: locale,
  }));

export const isLanguageSelectorEnabled = LANGUAGE_SELECTOR_OPTIONS.length > 1;

export function isLanguageSelectorLocale(
  value: string,
): value is LanguageSelectorLocale {
  return resolveSupportedLocale(value) !== null;
}
