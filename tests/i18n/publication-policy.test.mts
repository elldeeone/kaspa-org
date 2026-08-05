import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  defaultLocale,
  getLocaleLifecycle,
  isLocaleEnabledForTarget,
  pseudoLocale,
  spanishLocale,
  supportedLocaleCodes,
} from "../../src/i18n/config.ts";
import { createPublicationPolicy, routeIds } from "../../src/i18n/manifest.ts";
import {
  assertI18nFixturePolicyReferences,
  createI18nFixturePolicyMarker,
  defineI18nFixturePublicationPolicy,
  I18N_FIXTURE_NONCE_ENV,
  I18N_FIXTURE_POLICY_ENV,
  I18N_FIXTURE_POLICY_MARKER,
  I18N_FIXTURE_REQUESTED_NONCE_ENV,
  I18N_FIXTURE_REQUESTED_POLICY_ENV,
  resolveI18nFixturePublicationPolicy,
  serializeI18nFixturePublicationPolicy,
} from "../../src/i18n/publication-policy-validation.ts";
import { authorizeI18nFixtureEnvironment } from "../../src/i18n/publication-policy-node.ts";
import { assertProductionLocaleComplete } from "../../src/i18n/site.ts";

const require = createRequire(import.meta.url);
const repositoryRoot = resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);
const loadConfigPath = require.resolve("next/dist/server/config");
const nextConstantsPath = require.resolve("next/constants");
const configProbeScript = `
const loadConfig = require(${JSON.stringify(loadConfigPath)}).default;
const {PHASE_PRODUCTION_BUILD} = require(${JSON.stringify(nextConstantsPath)});
function describe(error) {
  const messages = [];
  const seen = new Set();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    messages.push(current instanceof Error ? current.message : String(current));
    current = current.cause;
  }
  return messages.join("\\n");
}
(async () => {
  const loadedConfig = await loadConfig(
    PHASE_PRODUCTION_BUILD,
    process.cwd(),
    {rawConfig: true, silent: true}
  );
  const config = loadedConfig.default ?? loadedConfig;
  process.stdout.write(JSON.stringify({
    outputFileTracingRoot: config.outputFileTracingRoot ?? null,
    turbopackRoot: config.turbopack?.root ?? null
  }));
})().catch((error) => {
  process.stderr.write(describe(error));
  process.exitCode = 1;
});
`;

const fixtureNonce = "a".repeat(64);
const rollbackPolicy = defineI18nFixturePublicationPolicy({
  localeLifecycleOverrides: { es: "preview" },
});
const unpublishedAssetsPolicy = defineI18nFixturePublicationPolicy({
  routePublicationOverrides: { en: { assets: null } },
});
const partialSpanishPolicy = defineI18nFixturePublicationPolicy({
  routePublicationOverrides: { es: { assets: null } },
});

function runNextConfigProbe(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>> = {},
) {
  const childEnvironment = { ...process.env };
  delete childEnvironment[I18N_FIXTURE_POLICY_ENV];
  delete childEnvironment[I18N_FIXTURE_NONCE_ENV];
  delete childEnvironment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  delete childEnvironment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  Object.assign(childEnvironment, environment, {
    NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "production",
    NEXT_TELEMETRY_DISABLED: "1",
  });
  return spawnSync(process.execPath, ["-e", configProbeScript], {
    cwd,
    env: childEnvironment,
    encoding: "utf8",
  });
}

async function createConfigProbeDirectory(label: string): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), `kaspa-next-config-${label}-`));
  await Promise.all([
    symlink(
      join(repositoryRoot, "next.config.ts"),
      join(cwd, "next.config.ts"),
      "file",
    ),
    symlink(
      join(repositoryRoot, "src"),
      join(cwd, "src"),
      process.platform === "win32" ? "junction" : "dir",
    ),
    symlink(
      join(repositoryRoot, "node_modules"),
      join(cwd, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    ),
  ]);
  return cwd;
}

test("publication policies use one generic validated contract", () => {
  const serializedRollback = serializeI18nFixturePublicationPolicy({
    localeLifecycleOverrides: { es: "preview" },
  });
  assert.deepEqual(
    resolveI18nFixturePublicationPolicy(serializedRollback, fixtureNonce),
    rollbackPolicy,
  );
  assert.equal(resolveI18nFixturePublicationPolicy(undefined, undefined), null);

  const production = createPublicationPolicy("production");
  const preview = createPublicationPolicy("preview");
  const rollback = createPublicationPolicy("production", rollbackPolicy);
  const unpublishedAssets = createPublicationPolicy(
    "production",
    unpublishedAssetsPolicy,
  );
  const partialSpanish = createPublicationPolicy(
    "production",
    partialSpanishPolicy,
  );

  for (const routeId of routeIds) {
    assert.equal(production.getRoutePublication(routeId, "en"), "public");
    assert.equal(
      production.getRoutePublication(routeId, spanishLocale),
      "public",
    );
    assert.equal(production.getRoutePublication(routeId, pseudoLocale), null);
    assert.equal(preview.getRoutePublication(routeId, "en"), "public");
    assert.equal(preview.getRoutePublication(routeId, spanishLocale), "public");
    assert.equal(preview.getRoutePublication(routeId, pseudoLocale), "preview");
    assert.equal(rollback.getRoutePublication(routeId, "en"), "public");
    assert.equal(rollback.getRoutePublication(routeId, spanishLocale), null);
  }

  assert.equal(getLocaleLifecycle(spanishLocale, rollbackPolicy), "preview");
  assert.equal(
    isLocaleEnabledForTarget(spanishLocale, "production", rollbackPolicy),
    false,
  );
  assert.equal(
    unpublishedAssets.getRoutePublication("assets", defaultLocale),
    null,
  );
  assert.equal(
    unpublishedAssets.getRoutePublication("lore", defaultLocale),
    "public",
  );
  assert.equal(
    partialSpanish.getRoutePublication("assets", spanishLocale),
    null,
  );
  assert.equal(
    partialSpanish.getRoutePublication("lore", spanishLocale),
    "public",
  );
  assert.throws(
    () =>
      assertProductionLocaleComplete(
        spanishLocale,
        partialSpanish.getRoutePublication,
      ),
    /logoAssets:es requires public destination \/assets/u,
  );

  assert.throws(
    () =>
      assertI18nFixturePolicyReferences(
        defineI18nFixturePublicationPolicy({
          localeLifecycleOverrides: { zz: "preview" },
        }),
        supportedLocaleCodes,
        routeIds,
      ),
    /unknown locale zz/u,
  );
  assert.throws(
    () =>
      assertI18nFixturePolicyReferences(
        defineI18nFixturePublicationPolicy({
          routePublicationOverrides: { en: { missing: null } },
        }),
        supportedLocaleCodes,
        routeIds,
      ),
    /unknown route missing/u,
  );
  assert.throws(
    () =>
      defineI18nFixturePublicationPolicy({
        routePublicationOverrides: { en: { assets: "hidden" } },
      }),
    /invalid publication/u,
  );
});

test("i18n CLIs authorize fixture policy before shared config", () => {
  const serializedPolicy =
    serializeI18nFixturePublicationPolicy(rollbackPolicy);
  const unauthorizedEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    [I18N_FIXTURE_POLICY_ENV]: serializedPolicy,
    [I18N_FIXTURE_NONCE_ENV]: fixtureNonce,
  };
  assert.throws(
    () =>
      authorizeI18nFixtureEnvironment(repositoryRoot, unauthorizedEnvironment),
    /marker-backed request/u,
  );

  delete unauthorizedEnvironment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  delete unauthorizedEnvironment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  for (const [relativePath, args] of [
    ["scripts/i18n/build-example-artifacts.mts", ["--check"]],
    ["scripts/i18n/production-smoke.mts", []],
    ["scripts/i18n/validate.mts", []],
    ["scripts/i18n/validate-client-payload.mts", []],
  ] as const) {
    const result = spawnSync(
      process.execPath,
      [
        "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
        "--experimental-strip-types",
        relativePath,
        ...args,
      ],
      {
        cwd: repositoryRoot,
        env: unauthorizedEnvironment,
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0, relativePath);
    assert.match(
      `${result.stdout}${result.stderr}`,
      /marker-backed request/u,
      relativePath,
    );
  }
});

test("next.config authorizes fixture markers before exposing fixture roots", async (t) => {
  const serializedPolicy =
    serializeI18nFixturePublicationPolicy(rollbackPolicy);
  const requestedEnvironment = {
    [I18N_FIXTURE_REQUESTED_POLICY_ENV]: serializedPolicy,
    [I18N_FIXTURE_REQUESTED_NONCE_ENV]: fixtureNonce,
  };

  await t.test("normal config exposes no fixture roots", async () => {
    const cwd = await createConfigProbeDirectory("normal");
    try {
      const result = runNextConfigProbe(cwd);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), {
        outputFileTracingRoot: null,
        turbopackRoot: null,
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  await t.test("matching marker exposes the authorized root", async () => {
    const cwd = await createConfigProbeDirectory("match");
    try {
      const marker = createI18nFixturePolicyMarker(
        rollbackPolicy,
        fixtureNonce,
        repositoryRoot,
      );
      await writeFile(
        join(cwd, I18N_FIXTURE_POLICY_MARKER),
        JSON.stringify(marker),
        "utf8",
      );
      const result = runNextConfigProbe(cwd, requestedEnvironment);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), {
        outputFileTracingRoot: repositoryRoot,
        turbopackRoot: repositoryRoot,
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  for (const [scenario, policy, expectedError] of [
    [
      "unknown-locale",
      { localeLifecycleOverrides: { zz: "preview" } },
      /unknown locale zz/u,
    ],
    [
      "unknown-route",
      { routePublicationOverrides: { en: { missing: null } } },
      /unknown route missing/u,
    ],
  ] as const) {
    await t.test(`${scenario} policy fails closed`, async () => {
      const cwd = await createConfigProbeDirectory(scenario);
      try {
        const marker = createI18nFixturePolicyMarker(
          policy,
          fixtureNonce,
          repositoryRoot,
        );
        await writeFile(
          join(cwd, I18N_FIXTURE_POLICY_MARKER),
          JSON.stringify(marker),
          "utf8",
        );
        const result = runNextConfigProbe(cwd, {
          [I18N_FIXTURE_REQUESTED_POLICY_ENV]: marker.policy ?? undefined,
          [I18N_FIXTURE_REQUESTED_NONCE_ENV]: marker.nonce,
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, expectedError);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }

  for (const scenario of ["missing", "malformed", "mismatched"] as const) {
    await t.test(`${scenario} marker fails closed`, async () => {
      const cwd = await createConfigProbeDirectory(scenario);
      try {
        if (scenario === "malformed") {
          await writeFile(join(cwd, I18N_FIXTURE_POLICY_MARKER), "{", "utf8");
        }
        if (scenario === "mismatched") {
          const marker = createI18nFixturePolicyMarker(
            rollbackPolicy,
            "b".repeat(64),
            repositoryRoot,
          );
          await writeFile(
            join(cwd, I18N_FIXTURE_POLICY_MARKER),
            JSON.stringify(marker),
            "utf8",
          );
        }
        const result = runNextConfigProbe(cwd, requestedEnvironment);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /marker and nonce/u);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }
});
