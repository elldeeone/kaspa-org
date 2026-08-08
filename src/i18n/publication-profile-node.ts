import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import {
  I18N_FIXTURE_POLICY_MARKER,
  I18N_FIXTURE_REQUESTED_NONCE_ENV,
  I18N_FIXTURE_REQUESTED_POLICY_ENV,
  type I18nFixturePolicyMarker,
} from "./publication-fixture.ts";
import {
  resolveI18nBuildTarget,
  supportedLocaleCodes,
  type Locale,
  type LocaleLifecycle,
} from "./locale-registry.ts";
import { routeIds, type RouteId } from "./manifest.ts";
import {
  assertI18nFixturePolicyMarker,
  assertI18nFixturePolicyReferences,
  resolveI18nFixturePublicationPolicy,
} from "./publication-policy-validation.ts";
import {
  createI18nPublicationProfile,
  I18N_PUBLICATION_PROFILE_ENV,
  serializeI18nPublicationProfile,
  type I18nPublicationProfile,
  type RoutePublication,
} from "./publication-profile-contract.ts";

export type InstalledI18nPublicationProfile = {
  marker: I18nFixturePolicyMarker | null;
  profile: I18nPublicationProfile;
};

function readFixturePolicyMarker(cwd: string): unknown {
  try {
    return JSON.parse(
      readFileSync(join(cwd, I18N_FIXTURE_POLICY_MARKER), "utf8"),
    );
  } catch {
    return null;
  }
}

export function installI18nPublicationProfile(
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
): InstalledI18nPublicationProfile {
  if (environment[I18N_PUBLICATION_PROFILE_ENV] !== undefined) {
    throw new Error(
      "Resolved i18n publication profiles can only be installed by the marker-backed Node adapter.",
    );
  }

  const requestedPolicy = environment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  const requestedNonce = environment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  const marker = assertI18nFixturePolicyMarker(
    requestedPolicy,
    requestedNonce,
    readFixturePolicyMarker(cwd),
  );
  if (marker && !isAbsolute(marker.repositoryRoot)) {
    throw new Error("Fixture repository root must be an absolute path.");
  }

  const policy = resolveI18nFixturePublicationPolicy(
    requestedPolicy,
    requestedNonce,
  );
  assertI18nFixturePolicyReferences(policy, supportedLocaleCodes, routeIds);
  const buildTarget = resolveI18nBuildTarget(
    environment.NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET,
  );
  if (policy && buildTarget !== "production") {
    throw new Error(
      `${I18N_FIXTURE_REQUESTED_POLICY_ENV} requires the production target`,
    );
  }

  const profile = createI18nPublicationProfile(
    buildTarget,
    policy
      ? {
          localeLifecycles: policy.localeLifecycleOverrides as Partial<
            Record<Locale, LocaleLifecycle>
          >,
          routePublications: policy.routePublicationOverrides as Partial<
            Record<Locale, Partial<Record<RouteId, RoutePublication | null>>>
          >,
        }
      : undefined,
  );
  environment[I18N_PUBLICATION_PROFILE_ENV] =
    serializeI18nPublicationProfile(profile);

  return { marker, profile };
}
