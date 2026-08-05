export const I18N_FIXTURE_POLICY_MARKER =
  ".kaspa-i18n-publication-fixture.json";
export const I18N_FIXTURE_REQUESTED_POLICY_ENV =
  "KASPA_I18N_REQUESTED_FIXTURE_POLICY";
export const I18N_FIXTURE_REQUESTED_NONCE_ENV =
  "KASPA_I18N_REQUESTED_FIXTURE_NONCE";
export const I18N_FIXTURE_POLICY_ENV =
  "NEXT_PUBLIC_KASPA_I18N_AUTHORIZED_FIXTURE_POLICY";
export const I18N_FIXTURE_NONCE_ENV =
  "NEXT_PUBLIC_KASPA_I18N_AUTHORIZED_FIXTURE_NONCE";

export type LocaleLifecycle =
  | "production"
  | "preview"
  | "test-only"
  | "disabled";
export type RoutePublication = "public" | "preview";

export type I18nFixturePublicationPolicy = {
  localeLifecycleOverrides: Readonly<Record<string, LocaleLifecycle>>;
  routePublicationOverrides: Readonly<
    Record<string, Readonly<Record<string, RoutePublication | null>>>
  >;
};

export function decodeAuthorizedI18nFixturePublicationPolicy(
  serializedPolicy: string | undefined,
  fixtureNonce: string | undefined,
): I18nFixturePublicationPolicy | null {
  if (!serializedPolicy?.trim()) return null;
  if (!fixtureNonce || !/^[a-f0-9]{64}$/u.test(fixtureNonce)) {
    throw new Error(
      `${I18N_FIXTURE_POLICY_ENV} requires a valid fixture nonce`,
    );
  }
  return JSON.parse(serializedPolicy) as I18nFixturePublicationPolicy;
}

export function getFixtureLocaleLifecycleOverride(
  policy: I18nFixturePublicationPolicy | null,
  locale: string,
): LocaleLifecycle | undefined {
  return policy?.localeLifecycleOverrides[locale];
}

export function getFixtureRoutePublicationOverride(
  policy: I18nFixturePublicationPolicy | null,
  locale: string,
  routeId: string,
): RoutePublication | null | undefined {
  return policy?.routePublicationOverrides[locale]?.[routeId];
}
