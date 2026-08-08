import {
  I18N_FIXTURE_REQUESTED_POLICY_ENV,
  type I18nFixturePublicationPolicy,
  type I18nFixturePolicyMarker,
} from "./publication-fixture.ts";
import type { LocaleLifecycle } from "./locale-registry.ts";
import type { RoutePublication } from "./publication-profile-contract.ts";

const localeLifecycles = new Set<LocaleLifecycle>([
  "production",
  "preview",
  "test-only",
  "disabled",
]);
const routePublications = new Set<RoutePublication>(["public", "preview"]);
const policyKeys = new Set([
  "localeLifecycleOverrides",
  "routePublicationOverrides",
]);
const markerKeys = new Set(["policy", "nonce", "repositoryRoot"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: ReadonlySet<string>,
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key)) {
      throw new Error(
        `${label} contains unsupported field ${JSON.stringify(key)}`,
      );
    }
  }
}

function assertPolicyKey(key: string, label: string): void {
  if (!/^[A-Za-z0-9-]+$/u.test(key)) {
    throw new Error(`${label} contains invalid key ${JSON.stringify(key)}`);
  }
}

function normalizeLocaleLifecycleOverrides(
  value: unknown,
): Readonly<Record<string, LocaleLifecycle>> {
  if (value === undefined) return Object.freeze({});
  if (!isRecord(value)) {
    throw new Error("localeLifecycleOverrides must be an object");
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([locale, lifecycle]) => {
      assertPolicyKey(locale, "localeLifecycleOverrides");
      if (
        typeof lifecycle !== "string" ||
        !localeLifecycles.has(lifecycle as LocaleLifecycle)
      ) {
        throw new Error(
          `localeLifecycleOverrides.${locale} has an invalid lifecycle`,
        );
      }
      return [locale, lifecycle as LocaleLifecycle] as const;
    });
  return Object.freeze(Object.fromEntries(entries));
}

function normalizeRoutePublicationOverrides(
  value: unknown,
): I18nFixturePublicationPolicy["routePublicationOverrides"] {
  if (value === undefined) return Object.freeze({});
  if (!isRecord(value)) {
    throw new Error("routePublicationOverrides must be an object");
  }

  const localeEntries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([locale, routeOverrides]) => {
      assertPolicyKey(locale, "routePublicationOverrides");
      if (!isRecord(routeOverrides)) {
        throw new Error(
          `routePublicationOverrides.${locale} must be an object`,
        );
      }
      const routeEntries = Object.entries(routeOverrides)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([routeId, publication]) => {
          assertPolicyKey(routeId, `routePublicationOverrides.${locale}`);
          if (
            publication !== null &&
            (typeof publication !== "string" ||
              !routePublications.has(publication as RoutePublication))
          ) {
            throw new Error(
              `routePublicationOverrides.${locale}.${routeId} has an invalid publication`,
            );
          }
          return [routeId, publication as RoutePublication | null] as const;
        });
      return [locale, Object.freeze(Object.fromEntries(routeEntries))] as const;
    });
  return Object.freeze(Object.fromEntries(localeEntries));
}

export function defineI18nFixturePublicationPolicy(
  value: unknown,
): I18nFixturePublicationPolicy {
  if (!isRecord(value)) {
    throw new Error("fixture publication policy must be an object");
  }
  assertExactKeys(value, policyKeys, "fixture publication policy");

  const policy = Object.freeze({
    localeLifecycleOverrides: normalizeLocaleLifecycleOverrides(
      value.localeLifecycleOverrides,
    ),
    routePublicationOverrides: normalizeRoutePublicationOverrides(
      value.routePublicationOverrides,
    ),
  });
  if (
    Object.keys(policy.localeLifecycleOverrides).length === 0 &&
    Object.keys(policy.routePublicationOverrides).length === 0
  ) {
    throw new Error("fixture publication policy must contain an override");
  }
  return policy;
}

export function serializeI18nFixturePublicationPolicy(value: unknown): string {
  return JSON.stringify(defineI18nFixturePublicationPolicy(value));
}

export function resolveI18nFixturePublicationPolicy(
  value: string | undefined,
  fixtureNonce: string | undefined,
): I18nFixturePublicationPolicy | null {
  if (!value?.trim()) return null;
  if (!fixtureNonce || !/^[a-f0-9]{64}$/u.test(fixtureNonce)) {
    throw new Error(
      `${I18N_FIXTURE_REQUESTED_POLICY_ENV} requires a valid fixture nonce`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      `${I18N_FIXTURE_REQUESTED_POLICY_ENV} must contain valid JSON`,
    );
  }
  return defineI18nFixturePublicationPolicy(parsed);
}

export function createI18nFixturePolicyMarker(
  policy: unknown | null,
  nonce: string,
  repositoryRoot: string,
): I18nFixturePolicyMarker {
  const serializedPolicy =
    policy === null ? null : serializeI18nFixturePublicationPolicy(policy);
  if (serializedPolicy !== null) {
    resolveI18nFixturePublicationPolicy(serializedPolicy, nonce);
  } else if (!/^[a-f0-9]{64}$/u.test(nonce)) {
    throw new Error("fixture marker requires a valid nonce");
  }
  if (!repositoryRoot.trim()) {
    throw new Error("fixture repository root must not be empty");
  }
  return { policy: serializedPolicy, nonce, repositoryRoot };
}

export function parseI18nFixturePolicyMarker(
  value: unknown,
): I18nFixturePolicyMarker {
  if (!isRecord(value)) {
    throw new Error("fixture publication-policy marker must be an object");
  }
  assertExactKeys(value, markerKeys, "fixture publication-policy marker");
  if (
    (value.policy !== null && typeof value.policy !== "string") ||
    typeof value.nonce !== "string" ||
    typeof value.repositoryRoot !== "string" ||
    !value.repositoryRoot.trim()
  ) {
    throw new Error("fixture publication-policy marker is malformed");
  }
  if (value.policy !== null) {
    resolveI18nFixturePublicationPolicy(value.policy, value.nonce);
  } else if (!/^[a-f0-9]{64}$/u.test(value.nonce)) {
    throw new Error("fixture publication-policy marker has an invalid nonce");
  }
  return {
    policy: value.policy,
    nonce: value.nonce,
    repositoryRoot: value.repositoryRoot,
  };
}

export function assertI18nFixturePolicyMarker(
  requestedPolicy: string | undefined,
  requestedNonce: string | undefined,
  marker: unknown,
): I18nFixturePolicyMarker | null {
  if (!requestedPolicy && !requestedNonce) return null;
  if (!requestedNonce) {
    throw new Error(
      "Fixture publication policy does not match its marker and nonce.",
    );
  }

  let parsedMarker: I18nFixturePolicyMarker;
  try {
    parsedMarker = parseI18nFixturePolicyMarker(marker);
  } catch {
    throw new Error(
      "Fixture publication policy does not match its marker and nonce.",
    );
  }
  if (
    parsedMarker.policy !== (requestedPolicy ?? null) ||
    parsedMarker.nonce !== requestedNonce
  ) {
    throw new Error(
      "Fixture publication policy does not match its marker and nonce.",
    );
  }
  return parsedMarker;
}

export function assertI18nFixturePolicyLocales(
  policy: I18nFixturePublicationPolicy | null,
  locales: readonly string[],
): void {
  if (!policy) return;
  const allowedLocales = new Set(locales);
  const configuredLocales = new Set([
    ...Object.keys(policy.localeLifecycleOverrides),
    ...Object.keys(policy.routePublicationOverrides),
  ]);
  for (const locale of configuredLocales) {
    if (!allowedLocales.has(locale)) {
      throw new Error(
        `Fixture publication policy references unknown locale ${locale}`,
      );
    }
  }
}

export function assertI18nFixturePolicyRoutes(
  policy: I18nFixturePublicationPolicy | null,
  routeIds: readonly string[],
): void {
  if (!policy) return;
  const allowedRouteIds = new Set(routeIds);
  for (const routeOverrides of Object.values(
    policy.routePublicationOverrides,
  )) {
    for (const routeId of Object.keys(routeOverrides)) {
      if (!allowedRouteIds.has(routeId)) {
        throw new Error(
          `Fixture publication policy references unknown route ${routeId}`,
        );
      }
    }
  }
}

export function assertI18nFixturePolicyReferences(
  policy: I18nFixturePublicationPolicy | null,
  locales: readonly string[],
  routeIds: readonly string[],
): void {
  assertI18nFixturePolicyLocales(policy, locales);
  assertI18nFixturePolicyRoutes(policy, routeIds);
}
