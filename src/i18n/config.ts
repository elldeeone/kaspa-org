const AI_ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

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

export const i18nBuildTarget = resolveI18nBuildTarget(
  process.env.NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET,
);
export const pseudoLocale = "en-XA" as const;
export const spanishLocale = "es" as const;
export const supportedLocaleCodes = [
  "en",
  pseudoLocale,
  spanishLocale,
] as const;
export type Locale = (typeof supportedLocaleCodes)[number];
export type TextDirection = "ltr" | "rtl";
export type LocaleLifecycle =
  | "production"
  | "preview"
  | "test-only"
  | "disabled";

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
};

export const defaultLocale = "en" as const satisfies Locale;

export function isLifecycleEnabledForTarget(
  lifecycle: LocaleLifecycle,
  target: I18nBuildTarget,
): boolean {
  if (lifecycle === "disabled") return false;
  if (target === "production") return lifecycle === "production";
  return true;
}

export function isLifecycleSelectable(lifecycle: LocaleLifecycle): boolean {
  return lifecycle === "production" || lifecycle === "preview";
}

export function isLocaleEnabledForTarget(
  locale: Locale,
  target: I18nBuildTarget,
): boolean {
  return isLifecycleEnabledForTarget(localeRegistry[locale].lifecycle, target);
}

export function isLocaleEnabled(locale: Locale): boolean {
  return isLocaleEnabledForTarget(locale, i18nBuildTarget);
}

export function isLocaleProductionReady(locale: Locale): boolean {
  return localeRegistry[locale].lifecycle === "production";
}

export const localeCodes: readonly Locale[] =
  supportedLocaleCodes.filter(isLocaleEnabled);
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

export function getLocaleDefinition(locale: Locale): LocaleDefinition {
  return localeRegistry[locale];
}

export function listEnabledLocales(): readonly Locale[] {
  return localeCodes;
}

export function listSelectableLocales(): readonly Locale[] {
  return localeCodes.filter((locale) =>
    isLifecycleSelectable(localeRegistry[locale].lifecycle),
  );
}
