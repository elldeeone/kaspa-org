import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getLocaleDefinition } from "../../src/i18n/locale-registry.ts";
import {
  buildExampleContract,
  type BuildArtifactLocale,
  type BuildExampleName,
} from "../../src/i18n/build-example-contract.ts";
import {
  compileBuildExampleArtifacts,
  prepareBuildExampleVendorSources,
  type BuildArtifactMessages,
  type BuildExampleSources,
} from "./build-example-artifact-compiler.mts";

const BUILD_EXAMPLE_NAMES: readonly BuildExampleName[] =
  buildExampleContract.examples.map(({ name }) => name);
const BUILD_ARTIFACT_LOCALES = buildExampleContract.artifactManifest.locales;
const LOCALIZED_BUILD_EXAMPLE_PATHS =
  buildExampleContract.artifactManifest.localizedPaths;
const EXAMPLES_RELATIVE_DIRECTORY =
  buildExampleContract.examplesRelativeDirectory;
const SOURCE_UTILS_PATH = "resources/utils.js";
const RETURN_PATH_RUNTIME = "resources/return-path.mjs";
const RETURN_PATH_SOURCE = "scripts/i18n/build-example-return-path.mjs";

const ARTIFACT_MESSAGE_KEYS = {
  controls: ["back", "network", "disconnect", "reconnect", "connecting"],
  runtime: [
    "connectingKaspaNetwork",
    "selectedNetwork",
    "connectedTo",
    "disconnected",
    "disconnectedFrom",
    "connectingPublicNode",
    "disconnect",
    "apiRequest",
    "apiResponse",
    "subscribingBlockAdded",
    "registeringProtocolNotifications",
    "subscribingProtocolScore",
    "event",
    "networkConsole",
  ],
  utxo: [
    "receivedEvents",
    "noticeManyUtxos",
    "noticeManualTesting",
    "addressPlaceholder",
    "monitorAddress",
    "restart",
    "trackingAddress",
    "error",
    "restarting",
    "stoppingProcessor",
    "startingProcessor",
    "processorStarted",
  ],
} as const;

function readMessageGroup(
  value: unknown,
  group: keyof typeof ARTIFACT_MESSAGE_KEYS,
  catalogPath: string,
): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${catalogPath} artifacts.${group} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const expectedKeys = ARTIFACT_MESSAGE_KEYS[group];
  const actualKeys = Object.keys(record).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify([...expectedKeys].sort())) {
    throw new Error(
      `${catalogPath} artifacts.${group} keys differ from the standalone artifact contract`,
    );
  }
  for (const key of expectedKeys) {
    if (typeof record[key] !== "string" || record[key] === "") {
      throw new Error(
        `${catalogPath} artifacts.${group}.${key} must be a non-empty string`,
      );
    }
  }
  return record as Record<string, string>;
}

async function loadBuildArtifactMessages(
  repositoryRoot: string,
  locale: "en" | BuildArtifactLocale,
): Promise<BuildArtifactMessages> {
  const catalogPath = `messages/${locale}/build.json`;
  const source = await readFile(join(repositoryRoot, catalogPath), "utf8");
  const catalog = JSON.parse(source) as Record<string, unknown>;
  const artifacts = catalog.artifacts;
  if (
    artifacts === null ||
    typeof artifacts !== "object" ||
    Array.isArray(artifacts)
  ) {
    throw new Error(`${catalogPath} must contain an artifacts object`);
  }
  const groups = artifacts as Record<string, unknown>;
  return {
    controls: readMessageGroup(groups.controls, "controls", catalogPath),
    runtime: readMessageGroup(groups.runtime, "runtime", catalogPath),
    utxo: readMessageGroup(groups.utxo, "utxo", catalogPath),
  } as BuildArtifactMessages;
}

function loadEnglishBuildArtifactMessages(
  repositoryRoot: string,
): Promise<BuildArtifactMessages> {
  return loadBuildArtifactMessages(repositoryRoot, "en");
}

function examplesDirectory(repositoryRoot: string): string {
  return join(repositoryRoot, EXAMPLES_RELATIVE_DIRECTORY);
}

async function loadEnglishSources(
  repositoryRoot: string,
): Promise<BuildExampleSources> {
  const directory = examplesDirectory(repositoryRoot);
  const sources: Record<string, string> = {};
  for (const path of [
    ...BUILD_EXAMPLE_NAMES.map((name) => `${name}.html`),
    SOURCE_UTILS_PATH,
  ]) {
    sources[path] = await readFile(join(directory, path), "utf8");
  }
  return sources;
}

async function prepareVendoredBuildExamples(repositoryRoot: string) {
  const directory = examplesDirectory(repositoryRoot);
  const [sources, messages, helperSource] = await Promise.all([
    loadEnglishSources(repositoryRoot),
    loadEnglishBuildArtifactMessages(repositoryRoot),
    readFile(join(repositoryRoot, RETURN_PATH_SOURCE), "utf8"),
  ]);
  const prepared = prepareBuildExampleVendorSources(sources, messages);
  await Promise.all([
    writeFile(join(directory, RETURN_PATH_RUNTIME), helperSource, "utf8"),
    ...Object.entries(prepared).map(([path, contents]) =>
      writeFile(join(directory, path), contents, "utf8"),
    ),
  ]);
}

function localizedArtifactSourcePath(path: string): string | null {
  const directorySeparator = path.lastIndexOf("/");
  const directory =
    directorySeparator === -1 ? "" : path.slice(0, directorySeparator + 1);
  const fileName = path.slice(directorySeparator + 1);
  const extensionSeparator = fileName.lastIndexOf(".");
  if (extensionSeparator === -1) return null;

  const extension = fileName.slice(extensionSeparator + 1);
  const localizedStem = fileName.slice(0, extensionSeparator);
  const localeSeparator = localizedStem.lastIndexOf(".");
  if (localeSeparator === -1) return null;

  const locale = localizedStem.slice(localeSeparator + 1);
  try {
    if (Intl.getCanonicalLocales(locale).length !== 1) return null;
  } catch {
    return null;
  }

  const sourceStem = localizedStem.slice(0, localeSeparator);
  return `${directory}${sourceStem}.${extension}`;
}

async function listLocalizedArtifactCandidates(
  repositoryRoot: string,
): Promise<string[]> {
  const directory = examplesDirectory(repositoryRoot);
  const walk = async (relativeDirectory: string): Promise<string[]> => {
    const entries = await readdir(join(directory, relativeDirectory), {
      withFileTypes: true,
    });
    const nested = await Promise.all(
      entries.map(async (entry): Promise<string[]> => {
        const path = relativeDirectory
          ? `${relativeDirectory}/${entry.name}`
          : entry.name;
        if (entry.isDirectory()) return walk(path);
        return localizedArtifactSourcePath(path) === null ? [] : [path];
      }),
    );
    return nested.flat();
  };

  return (await walk("")).sort();
}

function assertNoUnexpectedLocalizedArtifacts(candidates: readonly string[]) {
  const expected = new Set<string>(LOCALIZED_BUILD_EXAMPLE_PATHS);
  const unexpected = candidates.filter((path) => !expected.has(path));
  if (unexpected.length) {
    throw new Error(
      `Refusing to remove unexpected localized artifacts: ${unexpected.join(", ")}`,
    );
  }
}

async function cleanLocalizedBuildArtifacts(repositoryRoot: string) {
  const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
  assertNoUnexpectedLocalizedArtifacts(candidates);
  const directory = examplesDirectory(repositoryRoot);
  await Promise.all(
    LOCALIZED_BUILD_EXAMPLE_PATHS.map(async (path) => {
      try {
        await unlink(join(directory, path));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }),
  );
}

async function assertReturnPathRuntimeMatches(repositoryRoot: string) {
  const [source, runtime] = await Promise.all([
    readFile(join(repositoryRoot, RETURN_PATH_SOURCE), "utf8"),
    readFile(
      join(examplesDirectory(repositoryRoot), RETURN_PATH_RUNTIME),
      "utf8",
    ),
  ]);
  if (source !== runtime) {
    throw new Error(
      `${RETURN_PATH_RUNTIME} is stale; rerun scripts/vendor-kaspa-wasm-sdk.sh`,
    );
  }
}

async function compileBuildArtifacts(repositoryRoot: string) {
  await assertReturnPathRuntimeMatches(repositoryRoot);
  const [sources, englishMessages, localizedMessageEntries] = await Promise.all(
    [
      loadEnglishSources(repositoryRoot),
      loadEnglishBuildArtifactMessages(repositoryRoot),
      Promise.all(
        BUILD_ARTIFACT_LOCALES.map(
          async (locale) =>
            [
              locale,
              await loadBuildArtifactMessages(repositoryRoot, locale),
            ] as const,
        ),
      ),
    ],
  );
  const localizedMessages = Object.fromEntries(
    localizedMessageEntries,
  ) as Record<BuildArtifactLocale, BuildArtifactMessages>;

  return compileBuildExampleArtifacts({
    sources,
    englishMessages,
    targets: BUILD_ARTIFACT_LOCALES.map((locale) => ({
      locale,
      direction: getLocaleDefinition(locale).dir,
      messages: localizedMessages[locale],
    })),
  });
}

async function syncLocalizedBuildArtifacts(repositoryRoot: string) {
  await cleanLocalizedBuildArtifacts(repositoryRoot);
  const { generated, expectedPaths } =
    await compileBuildArtifacts(repositoryRoot);

  const directory = examplesDirectory(repositoryRoot);
  try {
    await Promise.all(
      Object.entries(generated).map(async ([path, content]) => {
        const output = join(directory, path);
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, content, "utf8");
      }),
    );
  } catch (error) {
    await cleanLocalizedBuildArtifacts(repositoryRoot);
    throw error;
  }

  const written = await listLocalizedArtifactCandidates(repositoryRoot);
  if (JSON.stringify(written) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      `Generated localized artifact set is incomplete: ${written.join(", ")}`,
    );
  }
}

async function checkLocalizedBuildArtifacts(repositoryRoot: string) {
  const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
  assertNoUnexpectedLocalizedArtifacts(candidates);
  const { generated, expectedPaths } =
    await compileBuildArtifacts(repositoryRoot);

  if (JSON.stringify(candidates) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      `Localized artifact set differs: expected ${expectedPaths.join(", ")}; received ${candidates.join(", ")}`,
    );
  }

  for (const [path, expected] of Object.entries(generated)) {
    let actual: string;
    try {
      actual = await readFile(
        join(examplesDirectory(repositoryRoot), path),
        "utf8",
      );
    } catch {
      throw new Error(`Missing generated localized artifact ${path}`);
    }
    if (actual !== expected)
      throw new Error(`Stale generated localized artifact ${path}`);
  }
}

export function createBuildExampleArtifactWorkflow(repositoryRoot: string) {
  return Object.freeze({
    async compile() {
      return (await compileBuildArtifacts(repositoryRoot)).generated;
    },
    clean() {
      return cleanLocalizedBuildArtifacts(repositoryRoot);
    },
    async prepareVendor() {
      await prepareVendoredBuildExamples(repositoryRoot);
      await syncLocalizedBuildArtifacts(repositoryRoot);
    },
    sync() {
      return syncLocalizedBuildArtifacts(repositoryRoot);
    },
    check() {
      return checkLocalizedBuildArtifacts(repositoryRoot);
    },
  });
}

async function runCommand(command: string, args: readonly string[]) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`${command} exited with ${code}`));
      } else {
        resolvePromise();
      }
    });
  });
}

type CliMode = "build" | "check" | "clean" | "prepare-vendor" | "sync" | "with";

function parseCli(args: readonly string[]): {
  mode: CliMode;
  command: string[];
} {
  const [option, ...command] = args;
  if (option === "--sync") return { mode: "sync", command: [] };
  if (option === "--check") return { mode: "check", command: [] };
  if (option === "--clean") return { mode: "clean", command: [] };
  if (option === "--prepare-vendor") {
    return { mode: "prepare-vendor", command: [] };
  }
  if (option === "--for-build" && command.length) {
    return { mode: "build", command };
  }
  if (option === "--with" && command.length) return { mode: "with", command };
  throw new Error(
    "Use --sync, --check, --clean, --prepare-vendor, --for-build <command>, or --with <command>",
  );
}

async function main() {
  const repositoryRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const artifacts = createBuildExampleArtifactWorkflow(repositoryRoot);
  const { mode, command } = parseCli(process.argv.slice(2));
  if (mode === "clean") {
    await artifacts.clean();
    console.log("generated localized Build artifacts removed");
    return;
  }
  if (mode === "prepare-vendor") {
    await artifacts.prepareVendor();
    console.log("Vendored Build artifacts prepared");
    return;
  }
  if (mode === "check") {
    await artifacts.check();
    console.log("Build artifacts valid");
    return;
  }
  if (mode === "sync") {
    await artifacts.sync();
    console.log("Build artifacts synchronized");
    return;
  }

  if (mode === "build") {
    await artifacts.sync();
    try {
      await runCommand(command[0], command.slice(1));
    } catch (error) {
      await artifacts.clean();
      throw error;
    }
    return;
  }

  await artifacts.sync();
  try {
    await runCommand(command[0], command.slice(1));
  } finally {
    await artifacts.clean();
  }
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
