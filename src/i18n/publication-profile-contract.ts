import {
  isLifecycleEnabledForTarget,
  isLifecycleSelectable,
  localeRegistry,
  supportedLocaleCodes,
  type I18nBuildTarget,
  type Locale,
  type LocaleLifecycle,
} from "./locale-registry.ts";
import { routeIds, type RouteId } from "./manifest.ts";

export const I18N_PUBLICATION_PROFILE_ENV =
  "NEXT_PUBLIC_KASPA_I18N_PUBLICATION_PROFILE";

export type RoutePublication = "public" | "preview";

export type I18nPublicationProfile = {
  buildTarget: I18nBuildTarget;
  enabledLocales: readonly Locale[];
  selectableLocales: readonly Locale[];
  productionLocales: readonly Locale[];
  localeLifecycles: Readonly<Record<Locale, LocaleLifecycle>>;
  routePublications: Readonly<
    Record<RouteId, Readonly<Record<Locale, RoutePublication | null>>>
  >;
};

export type I18nPublicationOverrides = {
  localeLifecycles?: Readonly<Partial<Record<Locale, LocaleLifecycle>>>;
  routePublications?: Readonly<
    Partial<
      Record<
        Locale,
        Readonly<Partial<Record<RouteId, RoutePublication | null>>>
      >
    >
  >;
};

function immutableCopy<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

export function createI18nPublicationProfile(
  buildTarget: I18nBuildTarget,
  overrides: I18nPublicationOverrides = {},
): I18nPublicationProfile {
  const localeLifecycles = Object.freeze(
    Object.fromEntries(
      supportedLocaleCodes.map((locale) => [
        locale,
        overrides.localeLifecycles?.[locale] ??
          localeRegistry[locale].lifecycle,
      ]),
    ) as Record<Locale, LocaleLifecycle>,
  );
  const enabledLocales = supportedLocaleCodes.filter((locale) =>
    isLifecycleEnabledForTarget(localeLifecycles[locale], buildTarget),
  );
  const selectableLocales = enabledLocales.filter((locale) =>
    isLifecycleSelectable(localeLifecycles[locale]),
  );
  const productionLocales = enabledLocales.filter(
    (locale) => localeLifecycles[locale] === "production",
  );
  const routePublications = Object.freeze(
    Object.fromEntries(
      routeIds.map((routeId) => [
        routeId,
        Object.freeze(
          Object.fromEntries(
            supportedLocaleCodes.map((locale) => {
              if (!enabledLocales.includes(locale)) return [locale, null];
              const override = overrides.routePublications?.[locale]?.[routeId];
              return [
                locale,
                override !== undefined
                  ? override
                  : localeLifecycles[locale] === "production"
                    ? "public"
                    : "preview",
              ];
            }),
          ) as Record<Locale, RoutePublication | null>,
        ),
      ]),
    ) as Record<RouteId, Readonly<Record<Locale, RoutePublication | null>>>,
  );

  return Object.freeze({
    buildTarget,
    enabledLocales: immutableCopy(enabledLocales),
    selectableLocales: immutableCopy(selectableLocales),
    productionLocales: immutableCopy(productionLocales),
    localeLifecycles,
    routePublications,
  });
}

export function serializeI18nPublicationProfile(
  profile: I18nPublicationProfile,
): string {
  return JSON.stringify(profile);
}
