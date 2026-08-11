import type { LocaleLifecycle } from "./locale-registry.ts";
import type { RoutePublication } from "./publication-profile-contract.ts";

export const I18N_FIXTURE_POLICY_MARKER =
  ".kaspa-i18n-publication-fixture.json";
export const I18N_FIXTURE_REQUESTED_POLICY_ENV =
  "KASPA_I18N_REQUESTED_FIXTURE_POLICY";
export const I18N_FIXTURE_REQUESTED_NONCE_ENV =
  "KASPA_I18N_REQUESTED_FIXTURE_NONCE";

export type I18nFixturePublicationPolicy = {
  localeLifecycleOverrides: Readonly<Record<string, LocaleLifecycle>>;
  routePublicationOverrides: Readonly<
    Record<string, Readonly<Record<string, RoutePublication | null>>>
  >;
};

export type I18nFixturePolicyMarker = {
  policy: string | null;
  nonce: string;
  repositoryRoot: string;
};
