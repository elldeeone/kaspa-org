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
  frenchLocale,
  germanLocale,
  pseudoLocale,
  spanishLocale,
  supportedLocaleCodes,
} from "../../src/i18n/locale-registry.ts";
import { routeIds } from "../../src/i18n/manifest.ts";
import {
  I18N_FIXTURE_POLICY_MARKER,
  I18N_FIXTURE_REQUESTED_NONCE_ENV,
  I18N_FIXTURE_REQUESTED_POLICY_ENV,
} from "../../src/i18n/publication-fixture.ts";
import {
  assertI18nFixturePolicyReferences,
  createI18nFixturePolicyMarker,
  defineI18nFixturePublicationPolicy,
  resolveI18nFixturePublicationPolicy,
  serializeI18nFixturePublicationPolicy,
} from "../../src/i18n/publication-policy-validation.ts";
import {
  createI18nPublicationProfile,
  I18N_PUBLICATION_PROFILE_ENV,
  serializeI18nPublicationProfile,
} from "../../src/i18n/publication-profile-contract.ts";
import { installI18nPublicationProfile } from "../../src/i18n/publication-profile-node.ts";
import { assertProductionLocaleComplete } from "../../src/i18n/site-validation.ts";

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
  const exportedConfig = loadedConfig.default ?? loadedConfig;
  const config = typeof exportedConfig === "function"
    ? await exportedConfig(PHASE_PRODUCTION_BUILD, {defaultConfig: {}})
    : await exportedConfig;
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
function runNextConfigProbe(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>> = {},
) {
  const childEnvironment = { ...process.env };
  delete childEnvironment[I18N_PUBLICATION_PROFILE_ENV];
  delete childEnvironment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  delete childEnvironment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  Object.assign(
    childEnvironment,
    {
      NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    environment,
  );
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

test("fixture policy resolves once into the generic publication profile", () => {
  const serializedRollback = serializeI18nFixturePublicationPolicy({
    localeLifecycleOverrides: { es: "preview" },
  });
  assert.deepEqual(
    resolveI18nFixturePublicationPolicy(serializedRollback, fixtureNonce),
    rollbackPolicy,
  );
  assert.equal(resolveI18nFixturePublicationPolicy(undefined, undefined), null);

  const production = createI18nPublicationProfile("production");
  const preview = createI18nPublicationProfile("preview");
  const testProfile = createI18nPublicationProfile("test");
  const rollback = createI18nPublicationProfile("production", {
    localeLifecycles: { es: "preview" },
  });
  const unpublishedAssets = createI18nPublicationProfile("production", {
    routePublications: { en: { assets: null } },
  });
  const partialSpanish = createI18nPublicationProfile("production", {
    routePublications: { es: { assets: null } },
  });

  for (const routeId of routeIds) {
    assert.equal(production.routePublications[routeId].en, "public");
    assert.equal(
      production.routePublications[routeId][spanishLocale],
      "public",
    );
    assert.equal(production.routePublications[routeId][germanLocale], "public");
    assert.equal(production.routePublications[routeId][frenchLocale], null);
    assert.equal(production.routePublications[routeId][pseudoLocale], null);
    assert.equal(preview.routePublications[routeId].en, "public");
    assert.equal(preview.routePublications[routeId][spanishLocale], "public");
    assert.equal(preview.routePublications[routeId][germanLocale], "public");
    assert.equal(preview.routePublications[routeId][frenchLocale], "preview");
    assert.equal(preview.routePublications[routeId][pseudoLocale], null);
    assert.equal(
      testProfile.routePublications[routeId][frenchLocale],
      "preview",
    );
    assert.equal(
      testProfile.routePublications[routeId][pseudoLocale],
      "preview",
    );
    assert.equal(rollback.routePublications[routeId].en, "public");
    assert.equal(rollback.routePublications[routeId][spanishLocale], null);
  }

  assert.equal(rollback.localeLifecycles[spanishLocale], "preview");
  assert.equal(rollback.enabledLocales.includes(spanishLocale), false);
  assert.equal(unpublishedAssets.routePublications.assets[defaultLocale], null);
  assert.equal(
    unpublishedAssets.routePublications.lore[defaultLocale],
    "public",
  );
  assert.equal(partialSpanish.routePublications.assets[spanishLocale], null);
  assert.equal(partialSpanish.routePublications.lore[spanishLocale], "public");
  assert.throws(
    () =>
      assertProductionLocaleComplete(
        spanishLocale,
        (routeId, locale) => partialSpanish.routePublications[routeId][locale],
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

test("i18n CLIs reject externally resolved publication profiles", () => {
  const unauthorizedEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    [I18N_PUBLICATION_PROFILE_ENV]: serializeI18nPublicationProfile(
      createI18nPublicationProfile("production", {
        localeLifecycles: { es: "preview" },
      }),
    ),
  };
  assert.throws(
    () =>
      installI18nPublicationProfile(repositoryRoot, unauthorizedEnvironment),
    /marker-backed Node adapter/u,
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
      /marker-backed Node adapter/u,
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

  await t.test(
    "Vercel Production accepts real review locales without the pseudo locale",
    async () => {
      const cwd = await createConfigProbeDirectory("vercel-review");
      try {
        const result = runNextConfigProbe(cwd, {
          NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "preview",
          VERCEL_ENV: "production",
        });
        assert.equal(result.status, 0, result.stderr);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  );

  await t.test(
    "Vercel Production rejects the test-only pseudo locale",
    async () => {
      const cwd = await createConfigProbeDirectory("vercel-test");
      try {
        const result = runNextConfigProbe(cwd, {
          NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "test",
          VERCEL_ENV: "production",
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /private en-XA pseudo-locale/u);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    },
  );

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

  await t.test("fixture policy requires the production target", async () => {
    const cwd = await createConfigProbeDirectory("preview-policy");
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
      const result = runNextConfigProbe(cwd, {
        ...requestedEnvironment,
        NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "preview",
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /requires the production target/u);
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
