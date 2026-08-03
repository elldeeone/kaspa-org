import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  BUILD_EXAMPLE_NAMES,
  PSEUDO_BUILD_EXAMPLE_PATHS,
  PSEUDO_BUILD_EXAMPLE_URLS,
  cleanPseudoBuildArtifacts,
  generatePseudoBuildArtifacts,
  loadEnglishBuildArtifactMessages,
  validatePseudoBuildArtifacts,
  type BuildExampleSources,
} from "../../scripts/i18n/build-example-artifacts.mts";
import { resolveBuildExampleReturnPath } from "../../scripts/i18n/build-example-return-path.mjs";

const examplesDirectory = join(
  process.cwd(),
  "public/vendor/kaspa-wasm/2.0.0/examples/web",
);

async function loadSources(): Promise<BuildExampleSources> {
  const sources: Record<string, string> = {};
  for (const path of [
    ...BUILD_EXAMPLE_NAMES.map((name) => `${name}.html`),
    "resources/utils.js",
  ]) {
    sources[path] = await readFile(join(examplesDirectory, path), "utf8");
  }
  return sources;
}

async function createArtifactFixture(
  files: Readonly<Record<string, string>>,
): Promise<{ root: string; directory: string }> {
  const root = await mkdtemp(join(tmpdir(), "kaspa-build-artifacts-"));
  const directory = join(root, "public/vendor/kaspa-wasm/2.0.0/examples/web");
  await mkdir(join(directory, "resources"), { recursive: true });
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await writeFile(join(directory, path), contents, "utf8");
    }),
  );
  return { root, directory };
}

test("Build pseudo artifacts are deterministic, complete, and private", async () => {
  const sources = await loadSources();
  const messages = await loadEnglishBuildArtifactMessages(process.cwd());
  const first = generatePseudoBuildArtifacts(sources, messages);
  const second = generatePseudoBuildArtifacts(sources, messages);

  assert.deepEqual(first, second);
  assert.deepEqual(
    Object.keys(first).sort(),
    [...PSEUDO_BUILD_EXAMPLE_PATHS].sort(),
  );
  assert.equal(PSEUDO_BUILD_EXAMPLE_URLS.length, 6);
  assert.ok(
    PSEUDO_BUILD_EXAMPLE_URLS.every((path) =>
      path.startsWith("/vendor/kaspa-wasm/2.0.0/examples/web/"),
    ),
  );
  assert.deepEqual(validatePseudoBuildArtifacts(sources, first), []);

  for (const name of BUILD_EXAMPLE_NAMES) {
    const source = sources[`${name}.html`];
    const pseudo = first[`${name}.en-XA.html`];
    assert.match(source, /<html lang="en" dir="ltr">/u);
    assert.match(pseudo, /<html lang="en-XA" dir="ltr">/u);
    assert.match(pseudo, /<meta name="robots" content="noindex, nofollow">/u);
    assert.match(pseudo, /\[!! /u);
    assert.doesNotMatch(pseudo, /rel=["'](?:canonical|alternate)["']/iu);
    assert.doesNotMatch(pseudo, /property=["']og:/iu);
  }
});

test("Build pseudo artifacts preserve technical and runtime interfaces", async () => {
  const messages = await loadEnglishBuildArtifactMessages(process.cwd());
  const artifacts = generatePseudoBuildArtifacts(await loadSources(), messages);

  assert.match(
    artifacts["get-server-info.en-XA.html"],
    /GetServerInfo řëëqüüëëšţ/u,
  );
  assert.match(
    artifacts["get-block-dag-info.en-XA.html"],
    /GetBlockDagInfo řëëšþööńšëë/u,
  );
  assert.match(
    artifacts["subscribe-block-added.en-XA.html"],
    /subscribeBlockAdded/u,
  );
  assert.match(
    artifacts["subscribe-daa-changed.en-XA.html"],
    /subscribeVirtualDaaScoreChanged/u,
  );
  assert.match(artifacts["utxo-context.en-XA.html"], /UtxoProcessor/u);
  assert.match(
    artifacts["utxo-context.en-XA.html"],
    /eventPluralRules\.select\(events\) === "one"/u,
  );
  assert.match(artifacts["utxo-context.en-XA.html"], /ëëṽëëńţš/u);
  assert.doesNotMatch(artifacts["utxo-context.en-XA.html"], /event\(s\)/u);
  assert.match(messages.utxo.receivedEvents, /\{count, plural, one \{/u);
  assert.match(messages.utxo.receivedEvents, /other \{/u);
  assert.match(
    messages.utxo.noticeManyUtxos,
    /\{term\} which makes it impractical.*should be paginated\./u,
  );
  assert.equal(messages.utxo.noticeManyUtxos.split(".").length - 1, 2);
  assert.equal(messages.utxo.noticeManualTesting.split(".").length - 1, 1);

  const controls = artifacts["resources/utils.en-XA.js"];
  assert.match(controls, /\/en-XA\/build#try-live/u);
  assert.match(controls, /\[!! Ďïïšçööńńëëçţ !!\]/u);
  assert.match(controls, /mainnet/u);
  assert.match(controls, /testnet-10/u);
  assert.match(controls, /testnet-11/u);
});

test("Build artifact generation rejects a non-plural event message", async () => {
  const sources = await loadSources();
  const messages = structuredClone(
    await loadEnglishBuildArtifactMessages(process.cwd()),
  );
  messages.utxo.receivedEvents = "Received {count} events";

  assert.throws(
    () => generatePseudoBuildArtifacts(sources, messages),
    /must be a one\/other cardinal count plural/u,
  );
});

test("Production cleanup removes only the exact generated pseudo artifacts", async (t) => {
  const { root, directory } = await createArtifactFixture({
    "get-server-info.html": "English source",
    "get-server-info.en-XA.html": "Private pseudo locale",
    "resources/utils.js": "English controls",
    "resources/utils.en-XA.js": "Private localized controls",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  await cleanPseudoBuildArtifacts(root);

  assert.deepEqual((await readdir(directory)).sort(), [
    "get-server-info.html",
    "resources",
  ]);
  assert.deepEqual(await readdir(join(directory, "resources")), ["utils.js"]);
});

test("Production cleanup refuses every other locale-suffixed artifact without deleting files", async (t) => {
  const { root, directory } = await createArtifactFixture({
    "get-server-info.en-XA.html": "Private pseudo locale",
    "get-server-info.en.html": "Duplicate source locale",
    "get-server-info.es.html": "Known localized sibling",
    "subscribe-block-added.pt-BR.html": "Regional localized sibling",
    "resources/utils.en-XA.js": "Private localized controls",
    "resources/utils.es.js": "Localized controls",
    "resources/utils.min.js": "Plausible minified vendor asset",
    "unexpected.es.html": "Unknown localized artifact",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    cleanPseudoBuildArtifacts(root),
    /Refusing to remove unexpected localized artifacts: .*get-server-info\.en\.html.*get-server-info\.es\.html.*resources\/utils\.es\.js.*resources\/utils\.min\.js.*subscribe-block-added\.pt-BR\.html.*unexpected\.es\.html/u,
  );
  assert.deepEqual((await readdir(directory)).sort(), [
    "get-server-info.en-XA.html",
    "get-server-info.en.html",
    "get-server-info.es.html",
    "resources",
    "subscribe-block-added.pt-BR.html",
    "unexpected.es.html",
  ]);
  assert.deepEqual((await readdir(join(directory, "resources"))).sort(), [
    "utils.en-XA.js",
    "utils.es.js",
    "utils.min.js",
  ]);
});

test("Build example return paths are restricted to the exact same-origin anchor", () => {
  const origin = "https://preview.example";
  const expectedPath = "/en-XA/build";
  const fallback = "/en-XA/build#try-live";

  assert.equal(
    resolveBuildExampleReturnPath(fallback, origin, expectedPath),
    fallback,
  );
  assert.equal(
    resolveBuildExampleReturnPath(
      `${origin}/en-XA/build#try-live`,
      origin,
      expectedPath,
    ),
    fallback,
  );

  for (const rejected of [
    "https://attacker.example/en-XA/build#try-live",
    "//attacker.example/en-XA/build#try-live",
    "/build#try-live",
    "/en-XA/build",
    "/en-XA/build#other",
    "/en-XA/build?next=evil#try-live",
    "https://user:password@preview.example/en-XA/build#try-live",
    "%",
  ]) {
    assert.equal(
      resolveBuildExampleReturnPath(rejected, origin, expectedPath),
      fallback,
      rejected,
    );
  }
});
