import {
  isLifecycleEnabledForTarget,
  localeRegistry,
  pseudoLocale,
  type I18nBuildTarget,
  type Locale,
  type LocaleLifecycle,
} from "./locale-registry.ts";
import { i18nPublicationProfile } from "./publication-profile.ts";

const AI_ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export const i18nBuildTarget = i18nPublicationProfile.buildTarget;

export function isLocaleEnabledForTarget(
  locale: Locale,
  target: I18nBuildTarget,
): boolean {
  if (target === i18nPublicationProfile.buildTarget) {
    return i18nPublicationProfile.enabledLocales.includes(locale);
  }
  return isLifecycleEnabledForTarget(localeRegistry[locale].lifecycle, target);
}

export function isLocaleEnabled(locale: Locale): boolean {
  return i18nPublicationProfile.enabledLocales.includes(locale);
}

export function getLocaleLifecycle(locale: Locale): LocaleLifecycle {
  return i18nPublicationProfile.localeLifecycles[locale];
}

export function isLocaleProductionReady(locale: Locale): boolean {
  return i18nPublicationProfile.productionLocales.includes(locale);
}

export const localeCodes: readonly Locale[] =
  i18nPublicationProfile.enabledLocales;
export const isPseudoLocaleEnabled = isLocaleEnabled(pseudoLocale);

export const isAiDeploymentEnabled = AI_ENABLED_VALUES.has(
  (process.env.NEXT_PUBLIC_KASPA_AI_ENABLED ?? "").trim().toLowerCase(),
);

export function isLocale(value: string | undefined): value is Locale {
  return localeCodes.some((locale) => locale === value);
}

export function resolveLocale(value: string | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return (
    localeCodes.find((locale) => locale.toLowerCase() === normalized) ?? null
  );
}

export function listEnabledLocales(): readonly Locale[] {
  return i18nPublicationProfile.enabledLocales;
}

export function listSelectableLocales(): readonly Locale[] {
  return i18nPublicationProfile.selectableLocales;
}
