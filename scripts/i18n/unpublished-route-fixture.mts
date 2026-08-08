import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, join, relative, sep } from "node:path";

import {
  I18N_FIXTURE_POLICY_MARKER,
  I18N_FIXTURE_REQUESTED_NONCE_ENV,
  I18N_FIXTURE_REQUESTED_POLICY_ENV,
  type I18nFixturePolicyMarker,
} from "../../src/i18n/publication-fixture.ts";
import {
  createI18nFixturePolicyMarker,
  parseI18nFixturePolicyMarker,
} from "../../src/i18n/publication-policy-validation.ts";
import { I18N_PUBLICATION_PROFILE_ENV } from "../../src/i18n/publication-profile-contract.ts";

const require = createRequire(import.meta.url);
const nextCliPath = require.resolve("next/dist/bin/next");
const excludedRootEntries = new Set([
  ".git",
  ".next",
  ".vercel",
  "blob-report",
  "coverage",
  "lighthouse",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export type ProductionFixture = {
  root: string;
  dispose: () => Promise<void>;
};

export type UnpublishedRouteFixture = ProductionFixture;

async function readFixturePolicyMarker(
  fixtureRoot: string,
): Promise<I18nFixturePolicyMarker | null> {
  try {
    return parseI18nFixturePolicyMarker(
      JSON.parse(
        await readFile(join(fixtureRoot, I18N_FIXTURE_POLICY_MARKER), "utf8"),
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function resolveFixtureEnvironment(
  fixtureRoot: string,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<NodeJS.ProcessEnv> {
  const marker = await readFixturePolicyMarker(fixtureRoot);
  const resolvedEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    ...environment,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  const suppliedRequestedPolicy =
    resolvedEnvironment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  const suppliedRequestedNonce =
    resolvedEnvironment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  const suppliedPublicationProfile =
    resolvedEnvironment[I18N_PUBLICATION_PROFILE_ENV];
  delete resolvedEnvironment[I18N_FIXTURE_REQUESTED_POLICY_ENV];
  delete resolvedEnvironment[I18N_FIXTURE_REQUESTED_NONCE_ENV];
  delete resolvedEnvironment[I18N_PUBLICATION_PROFILE_ENV];

  if (suppliedPublicationProfile !== undefined) {
    throw new Error(
      "Fixture commands cannot accept a pre-resolved publication profile",
    );
  }

  if (!marker) {
    if (
      suppliedRequestedPolicy !== undefined ||
      suppliedRequestedNonce !== undefined
    ) {
      throw new Error("Fixture policy environment requires a fixture marker");
    }
    return resolvedEnvironment;
  }

  for (const [name, expected] of [
    [I18N_FIXTURE_REQUESTED_POLICY_ENV, marker.policy],
    [I18N_FIXTURE_REQUESTED_NONCE_ENV, marker.nonce],
  ] as const) {
    const supplied =
      name === I18N_FIXTURE_REQUESTED_POLICY_ENV
        ? suppliedRequestedPolicy
        : suppliedRequestedNonce;
    if (supplied !== undefined && supplied !== (expected ?? undefined)) {
      throw new Error(`${name} does not match the fixture policy marker`);
    }
  }

  if (marker.policy !== null) {
    resolvedEnvironment[I18N_FIXTURE_REQUESTED_POLICY_ENV] = marker.policy;
  }
  resolvedEnvironment[I18N_FIXTURE_REQUESTED_NONCE_ENV] = marker.nonce;
  return resolvedEnvironment;
}

function shouldCopy(repositoryRoot: string, source: string) {
  const relativePath = relative(repositoryRoot, source);
  if (!relativePath) return true;
  const [rootEntry] = relativePath.split(sep);
  return !excludedRootEntries.has(rootEntry) && !rootEntry.startsWith(".env");
}

async function createProductionFixtureInternal(
  repositoryRoot: string,
  prefix: string,
  fixturePolicy: unknown | null,
): Promise<ProductionFixture> {
  if (!repositoryRoot.trim() || !isAbsolute(repositoryRoot)) {
    throw new Error("fixture repository root must be an absolute path");
  }
  const fixtureDirectory = join(repositoryRoot, ".next");
  await mkdir(fixtureDirectory, { recursive: true });
  const fixtureParent = await mkdtemp(join(fixtureDirectory, prefix));
  const fixtureRoot = join(fixtureParent, "app");

  try {
    await mkdir(fixtureRoot);
    for (const entry of await readdir(repositoryRoot, {
      withFileTypes: true,
    })) {
      const source = join(repositoryRoot, entry.name);
      if (!shouldCopy(repositoryRoot, source)) continue;
      await cp(source, join(fixtureRoot, entry.name), {
        recursive: entry.isDirectory(),
        filter: (nestedSource) => shouldCopy(repositoryRoot, nestedSource),
      });
    }
    await symlink(
      join(repositoryRoot, "node_modules"),
      join(fixtureRoot, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const marker = createI18nFixturePolicyMarker(
      fixturePolicy,
      randomBytes(32).toString("hex"),
      repositoryRoot,
    );
    await writeFile(
      join(fixtureRoot, I18N_FIXTURE_POLICY_MARKER),
      `${JSON.stringify(marker, null, 2)}\n`,
      "utf8",
    );

    let disposed = false;
    return {
      root: fixtureRoot,
      async dispose() {
        if (disposed) return;
        disposed = true;
        await rm(fixtureParent, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(fixtureParent, { recursive: true, force: true });
    throw error;
  }
}

export function createProductionFixture(
  repositoryRoot: string,
): Promise<ProductionFixture> {
  return createProductionFixtureInternal(
    repositoryRoot,
    "i18n-production-",
    null,
  );
}

export function createUnpublishedAssetsFixture(
  repositoryRoot: string,
): Promise<UnpublishedRouteFixture> {
  return createProductionFixtureInternal(
    repositoryRoot,
    "i18n-unpublished-assets-",
    { routePublicationOverrides: { en: { assets: null } } },
  );
}

export function createEnglishOnlyProductionFixture(
  repositoryRoot: string,
): Promise<ProductionFixture> {
  return createProductionFixtureInternal(repositoryRoot, "i18n-english-only-", {
    localeLifecycleOverrides: { es: "preview" },
  });
}

export function createPartialSpanishProductionFixture(
  repositoryRoot: string,
): Promise<ProductionFixture> {
  return createProductionFixtureInternal(
    repositoryRoot,
    "i18n-partial-spanish-",
    { routePublicationOverrides: { es: { assets: null } } },
  );
}

async function runFixtureCommand(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>>,
  args: readonly string[],
  failureLabel: string,
): Promise<string> {
  const fixtureEnvironment = await resolveFixtureEnvironment(cwd, environment);
  const child = spawn(process.execPath, args, {
    cwd,
    env: fixtureEnvironment,
    stdio: "pipe",
  });
  let logs = "";
  child.stdout.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });

  const result = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  if (result.code !== 0) {
    throw new Error(
      `${failureLabel} failed (${result.signal ?? result.code})\n${logs}`,
    );
  }
  return logs;
}

export function buildProductionFixture(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>> = {},
): Promise<string> {
  return runFixtureCommand(
    cwd,
    environment,
    [
      "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      join(cwd, "scripts", "i18n", "build-example-artifacts.mts"),
      "--for-build",
      process.execPath,
      nextCliPath,
      "build",
    ],
    "production fixture build",
  );
}

export function validateProductionFixtureClientPayload(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>> = {},
): Promise<string> {
  return runFixtureCommand(
    cwd,
    environment,
    [
      "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      "scripts/i18n/validate-client-payload.mts",
    ],
    "fixture client-payload validation",
  );
}
