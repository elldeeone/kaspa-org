import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
import { join, relative, sep } from "node:path";

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

function shouldCopy(repositoryRoot: string, source: string) {
  const relativePath = relative(repositoryRoot, source);
  if (!relativePath) return true;
  const [rootEntry] = relativePath.split(sep);
  return !excludedRootEntries.has(rootEntry) && !rootEntry.startsWith(".env");
}

async function createProductionFixtureInternal(
  repositoryRoot: string,
  prefix: string,
): Promise<ProductionFixture> {
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

    const nextConfigPath = join(fixtureRoot, "next.config.ts");
    const nextConfig = await readFile(nextConfigPath, "utf8");
    const configOpening = "const nextConfig: NextConfig = {\n";
    assert.equal(
      nextConfig.split(configOpening).length - 1,
      1,
      "fixture expected one Next.js configuration object",
    );
    await writeFile(
      nextConfigPath,
      nextConfig.replace(
        configOpening,
        `${configOpening}  outputFileTracingRoot: ${JSON.stringify(repositoryRoot)},\n  turbopack: { root: ${JSON.stringify(repositoryRoot)} },\n`,
      ),
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
  return createProductionFixtureInternal(repositoryRoot, "i18n-production-");
}

export async function createUnpublishedAssetsFixture(
  repositoryRoot: string,
): Promise<UnpublishedRouteFixture> {
  const fixture = await createProductionFixtureInternal(
    repositoryRoot,
    "i18n-unpublished-assets-",
  );
  try {
    const manifestPath = join(fixture.root, "src", "i18n", "manifest.ts");
    const manifest = await readFile(manifestPath, "utf8");
    const assetsPublication = /(\bassets:\s*)"public"/gu;
    const matches = [...manifest.matchAll(assetsPublication)];
    assert.equal(
      matches.length,
      1,
      "fixture expected exactly one English Assets publication flag",
    );
    await writeFile(
      manifestPath,
      manifest.replace(assetsPublication, "$1false"),
      "utf8",
    );
    return fixture;
  } catch (error) {
    await fixture.dispose();
    throw error;
  }
}

export async function createEnglishOnlyProductionFixture(
  repositoryRoot: string,
): Promise<ProductionFixture> {
  const fixture = await createProductionFixtureInternal(
    repositoryRoot,
    "i18n-english-only-",
  );
  try {
    const configPath = join(fixture.root, "src", "i18n", "config.ts");
    const config = await readFile(configPath, "utf8");
    const spanishLifecycle =
      /(\bes:\s*\{[\s\S]*?\bcode:\s*"es"[\s\S]*?\blifecycle:\s*)"production"/gu;
    const matches = [...config.matchAll(spanishLifecycle)];
    assert.equal(
      matches.length,
      1,
      "fixture expected exactly one Spanish production lifecycle",
    );
    await writeFile(
      configPath,
      config.replace(spanishLifecycle, '$1"preview"'),
      "utf8",
    );
    return fixture;
  } catch (error) {
    await fixture.dispose();
    throw error;
  }
}

export async function createPartialSpanishProductionFixture(
  repositoryRoot: string,
): Promise<ProductionFixture> {
  const fixture = await createProductionFixtureInternal(
    repositoryRoot,
    "i18n-partial-spanish-",
  );
  try {
    const manifestPath = join(fixture.root, "src", "i18n", "manifest.ts");
    const manifest = await readFile(manifestPath, "utf8");
    const atomicPublication =
      '  return isLocaleProductionReady(locale) ? "public" : "preview";';
    assert.equal(
      manifest.split(atomicPublication).length - 1,
      1,
      "fixture expected exactly one atomic locale publication",
    );
    await writeFile(
      manifestPath,
      manifest.replace(
        atomicPublication,
        `  if (locale === "es" && routeId === "assets") return null;\n${atomicPublication}`,
      ),
      "utf8",
    );
    return fixture;
  } catch (error) {
    await fixture.dispose();
    throw error;
  }
}

export async function buildProductionFixture(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>> = {},
): Promise<string> {
  const artifactScript = join(
    cwd,
    "scripts",
    "i18n",
    "build-example-artifacts.mts",
  );
  const child = spawn(
    process.execPath,
    [
      "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      artifactScript,
      "--for-build",
      process.execPath,
      nextCliPath,
      "build",
    ],
    {
      cwd,
      env: {
        ...process.env,
        ...environment,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "pipe",
    },
  );
  let logs = "";
  child.stdout.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });

  const result: {
    code: number | null;
    signal: NodeJS.Signals | null;
  } = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  if (result.code !== 0) {
    throw new Error(
      `production fixture build failed (${result.signal ?? result.code})\n${logs}`,
    );
  }
  return logs;
}

export async function validateProductionFixtureClientPayload(
  cwd: string,
  environment: Readonly<Record<string, string | undefined>> = {},
): Promise<string> {
  const child = spawn(
    process.execPath,
    [
      "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      "scripts/i18n/validate-client-payload.mts",
    ],
    {
      cwd,
      env: {
        ...process.env,
        ...environment,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "pipe",
    },
  );
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
      `fixture client-payload validation failed (${result.signal ?? result.code})\n${logs}`,
    );
  }
  return logs;
}
