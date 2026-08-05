import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import {
  assertI18nFixturePolicyMarker,
  I18N_FIXTURE_NONCE_ENV,
  I18N_FIXTURE_POLICY_ENV,
  I18N_FIXTURE_POLICY_MARKER,
  I18N_FIXTURE_REQUESTED_NONCE_ENV,
  I18N_FIXTURE_REQUESTED_POLICY_ENV,
  type I18nFixturePolicyMarker,
} from "./publication-policy-validation.ts";

function readFixturePolicyMarker(cwd: string): unknown {
  try {
    return JSON.parse(
      readFileSync(join(cwd, I18N_FIXTURE_POLICY_MARKER), "utf8"),
    );
  } catch {
    return null;
  }
}

export function authorizeI18nFixtureEnvironment(
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
): I18nFixturePolicyMarker | null {
  const requestedPolicy = environment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  const requestedNonce = environment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  const authorizedPolicy = environment[I18N_FIXTURE_POLICY_ENV];
  const authorizedNonce = environment[I18N_FIXTURE_NONCE_ENV];
  const hasRequest =
    requestedPolicy !== undefined || requestedNonce !== undefined;

  if (!hasRequest) {
    if (authorizedPolicy !== undefined || authorizedNonce !== undefined) {
      throw new Error(
        "Authorized fixture publication environment requires a marker-backed request.",
      );
    }
    return null;
  }

  const marker = assertI18nFixturePolicyMarker(
    requestedPolicy,
    requestedNonce,
    readFixturePolicyMarker(cwd),
  );
  if (!marker || !isAbsolute(marker.repositoryRoot)) {
    throw new Error("Fixture repository root must be an absolute path.");
  }

  for (const [name, supplied, expected] of [
    [I18N_FIXTURE_POLICY_ENV, authorizedPolicy, marker.policy],
    [I18N_FIXTURE_NONCE_ENV, authorizedNonce, marker.nonce],
  ] as const) {
    if (supplied !== undefined && supplied !== (expected ?? undefined)) {
      throw new Error(`${name} does not match the fixture policy marker`);
    }
  }

  if (marker.policy === null) {
    delete environment[I18N_FIXTURE_POLICY_ENV];
  } else {
    environment[I18N_FIXTURE_POLICY_ENV] = marker.policy;
  }
  environment[I18N_FIXTURE_NONCE_ENV] = marker.nonce;
  return marker;
}

export const authorizedI18nFixturePolicyMarker =
  authorizeI18nFixtureEnvironment();
