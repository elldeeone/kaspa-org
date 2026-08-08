import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { createBuildExampleArtifactWorkflow } from "../../scripts/i18n/build-example-artifacts.mts";
import { resolveBuildExampleReturnPath } from "../../scripts/i18n/build-example-return-path.mjs";
import { buildExampleContract } from "../../src/i18n/build-example-contract.ts";

const repositoryRoot = process.cwd();
const examplesRelativeDirectory =
  buildExampleContract.examplesRelativeDirectory;
const examplesDirectory = join(repositoryRoot, examplesRelativeDirectory);
const artifacts = createBuildExampleArtifactWorkflow(repositoryRoot);
const manifest = buildExampleContract.artifactManifest;
const exampleNames = buildExampleContract.examples.map(({ name }) => name);

async function createArtifactFixture(
  files: Readonly<Record<string, string>>,
): Promise<{ root: string; directory: string }> {
  const root = await mkdtemp(join(tmpdir(), "kaspa-build-artifacts-"));
  const directory = join(root, examplesRelativeDirectory);
  await mkdir(join(directory, "resources"), { recursive: true });
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const output = join(directory, path);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, contents, "utf8");
    }),
  );
  return { root, directory };
}

async function createWorkflowFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kaspa-build-workflow-"));
  await mkdir(join(root, "scripts/i18n"), { recursive: true });
  await Promise.all([
    cp(join(repositoryRoot, "messages"), join(root, "messages"), {
      recursive: true,
    }),
    cp(examplesDirectory, join(root, examplesRelativeDirectory), {
      recursive: true,
    }),
    cp(
      join(repositoryRoot, "scripts/i18n/build-example-return-path.mjs"),
      join(root, "scripts/i18n/build-example-return-path.mjs"),
    ),
  ]);
  return root;
}

test("artifact manifest follows the central Build-example contract", () => {
  for (const locale of manifest.locales) {
    assert.deepEqual(manifest.pathsByLocale[locale], [
      ...exampleNames.map((name) => `${name}.${locale}.html`),
      `resources/utils.${locale}.js`,
    ]);
  }
  assert.deepEqual(Object.keys(manifest.urlsByLocale), ["en-XA", "es"]);
  assert.equal(manifest.pathsByLocale["en-XA"].length, 6);
  assert.equal(manifest.pathsByLocale.es.length, 6);
  assert.equal(manifest.localizedPaths.length, 12);
  assert.equal(manifest.localizedUrls.length, 12);
  assert.ok(
    manifest.localizedUrls.every((path) =>
      path.startsWith(`${buildExampleContract.examplesPublicBasePath}/`),
    ),
  );
});

test("git ignores exactly the generated localized artifact contract", async () => {
  const generatedPrefix = `/${examplesRelativeDirectory}/`;
  const ignoredArtifacts = (
    await readFile(join(repositoryRoot, ".gitignore"), "utf8")
  )
    .split(/\r?\n/u)
    .filter((line) => line.startsWith(generatedPrefix))
    .sort();
  assert.deepEqual(
    ignoredArtifacts,
    manifest.localizedPaths
      .map((pathname) => `${generatedPrefix}${pathname}`)
      .sort(),
  );
});

test("artifact manifest is deeply immutable and cannot change cleanup policy", () => {
  for (const collection of [
    buildExampleContract,
    buildExampleContract.examples,
    manifest,
    manifest.locales,
    manifest.pathsByLocale,
    manifest.pathsByLocale["en-XA"],
    manifest.pathsByLocale.es,
    manifest.localizedPaths,
    manifest.urlsByLocale,
    manifest.urlsByLocale["en-XA"],
    manifest.urlsByLocale.es,
    manifest.localizedUrls,
  ]) {
    assert.equal(Object.isFrozen(collection), true);
  }

  const expectedLocales = [...manifest.locales];
  const expectedSpanishPaths = [...manifest.pathsByLocale.es];
  assert.throws(
    () => (manifest.locales as unknown as string[]).push("pt-BR"),
    TypeError,
  );
  assert.throws(
    () =>
      (manifest.pathsByLocale.es as unknown as string[]).push(
        "unexpected.es.html",
      ),
    TypeError,
  );
  assert.throws(
    () => Object.defineProperty(manifest.pathsByLocale, "es", { value: [] }),
    TypeError,
  );
  assert.deepEqual(manifest.locales, expectedLocales);
  assert.deepEqual(manifest.pathsByLocale.es, expectedSpanishPaths);
});

test("Build pseudo artifacts are deterministic, complete, and private", async () => {
  const first = await artifacts.compile("test");
  const second = await artifacts.compile("test");

  assert.deepEqual(first, second);
  assert.deepEqual(
    Object.keys(first).sort(),
    [...manifest.localizedPaths].sort(),
  );

  for (const name of exampleNames) {
    const source = await readFile(
      join(examplesDirectory, `${name}.html`),
      "utf8",
    );
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
  const compiled = await artifacts.compile("test");

  assert.match(
    compiled["get-server-info.en-XA.html"],
    /GetServerInfo řëëqüüëëšţ/u,
  );
  assert.match(
    compiled["get-block-dag-info.en-XA.html"],
    /GetBlockDagInfo řëëšþööńšëë/u,
  );
  assert.match(
    compiled["subscribe-block-added.en-XA.html"],
    /subscribeBlockAdded/u,
  );
  assert.match(
    compiled["subscribe-block-added.en-XA.html"],
    /Šüüƀšçřïïƀïïńĝ ţöö Ɓļööçķ ÅÅďďëëď/u,
  );
  assert.doesNotMatch(
    compiled["subscribe-block-added.en-XA.html"],
    /Subscribing to Block Added/u,
  );
  assert.match(
    compiled["subscribe-daa-changed.en-XA.html"],
    /subscribeVirtualDaaScoreChanged/u,
  );
  assert.match(compiled["utxo-context.en-XA.html"], /UtxoProcessor/u);
  assert.match(
    compiled["utxo-context.en-XA.html"],
    /eventPluralRules\.select\(events\) === "one"/u,
  );
  assert.match(compiled["utxo-context.en-XA.html"], /ëëṽëëńţš/u);
  assert.doesNotMatch(compiled["utxo-context.en-XA.html"], /event\(s\)/u);

  const controls = compiled["resources/utils.en-XA.js"];
  assert.match(controls, /\/en-XA\/build#try-live/u);
  assert.match(controls, /\[!! Ďïïšçööńńëëçţ !!\]/u);
  assert.match(controls, /innerHTML = ` \[!! \| Çööńńëëçţïïńĝ/u);
  assert.match(controls, /mainnet/u);
  assert.match(controls, /testnet-10/u);
  assert.match(controls, /testnet-11/u);
});

test("English UTXO artifact copy preserves its plural and notice contracts", async () => {
  const catalog = JSON.parse(
    await readFile(join(repositoryRoot, "messages/en/build.json"), "utf8"),
  ) as {
    artifacts: {
      utxo: {
        noticeManyUtxos: string;
        noticeManualTesting: string;
        receivedEvents: string;
      };
    };
  };
  const messages = catalog.artifacts.utxo;

  assert.match(messages.receivedEvents, /\{count, plural, one \{/u);
  assert.match(messages.receivedEvents, /other \{/u);
  assert.match(
    messages.noticeManyUtxos,
    /\{term\} which makes it impractical.*should be paginated\./u,
  );
  assert.equal(messages.noticeManyUtxos.split(".").length - 1, 2);
  assert.equal(messages.noticeManualTesting.split(".").length - 1, 1);
});

test("Spanish Build artifacts are deterministic, complete, and catalog-backed", async () => {
  const first = await artifacts.compile("test");
  const second = await artifacts.compile("test");

  assert.deepEqual(first, second);
  for (const name of exampleNames) {
    const spanish = first[`${name}.es.html`];
    assert.match(spanish, /<html lang="es" dir="ltr">/u);
    assert.match(spanish, /from '\.\/resources\/utils\.es\.js'/u);
    assert.match(spanish, /Conectando a la red de Kaspa/u);
    assert.match(spanish, /<meta name="robots" content="noindex, nofollow">/u);
    assert.doesNotMatch(spanish, /\[!! /u);
  }

  assert.match(first["get-server-info.es.html"], /Solicitud de GetServerInfo/u);
  assert.match(
    first["get-block-dag-info.es.html"],
    /Respuesta de GetBlockDagInfo/u,
  );
  assert.match(
    first["subscribe-block-added.es.html"],
    /Suscribiéndose al evento de bloque añadido/u,
  );
  assert.doesNotMatch(first["subscribe-block-added.es.html"], /Block Added/u);
  assert.match(first["subscribe-daa-changed.es.html"], /DAA/u);
  assert.match(first["utxo-context.es.html"], /Se recibió/u);
  assert.match(first["utxo-context.es.html"], /Se recibieron/u);
  assert.match(first["utxo-context.es.html"], /UtxoProcessor/u);

  const controls = first["resources/utils.es.js"];
  assert.match(controls, /href="\/es\/build#try-live"/u);
  assert.match(controls, /<- Volver<\/a> \| Red:/u);
  assert.match(controls, />Desconectar<\/a>/u);
  assert.match(controls, />Reconectar<\/a>/u);
  assert.match(controls, /innerHTML = ` \| Conectando\.\.\.`;/u);
  assert.match(controls, /mainnet/u);
  assert.match(controls, /testnet-10/u);
  assert.match(controls, /testnet-11/u);
});

test("workflow check rejects artifacts generated from a stale Spanish catalog", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = createBuildExampleArtifactWorkflow(root);
  const englishCatalog = await readFile(
    join(root, "messages/en/build.json"),
    "utf8",
  );
  const spanishCatalogPath = join(root, "messages/es/build.json");
  const spanishCatalog = await readFile(spanishCatalogPath, "utf8");

  await writeFile(spanishCatalogPath, englishCatalog, "utf8");
  await fixture.sync("production");
  await writeFile(spanishCatalogPath, spanishCatalog, "utf8");

  await assert.rejects(
    fixture.check("production"),
    /Stale generated localized artifact get-server-info\.es\.html/u,
  );
});

test("workflow compilation rejects a non-plural event message", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalogPath = join(root, "messages/en/build.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
    artifacts: { utxo: { receivedEvents: string } };
  };
  catalog.artifacts.utxo.receivedEvents = "Received {count} events";
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  await assert.rejects(
    createBuildExampleArtifactWorkflow(root).compile("test"),
    /must be a one\/other cardinal count plural/u,
  );
});

test("workflow sync and check enforce each target artifact set", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = createBuildExampleArtifactWorkflow(root);
  const directory = join(root, examplesRelativeDirectory);

  await fixture.sync("preview");
  await fixture.check("preview");
  assert.deepEqual(
    (await readdir(directory))
      .filter((path) => /\.(?:en-XA|es)\.html$/u.test(path))
      .sort(),
    manifest.localizedPaths.filter((path) => path.endsWith(".html")).sort(),
  );

  await fixture.sync("production");
  await fixture.check("production");
  assert.deepEqual(
    (await readdir(directory))
      .filter((path) => /\.(?:en-XA|es)\.html$/u.test(path))
      .sort(),
    manifest.pathsByLocale.es.filter((path) => path.endsWith(".html")).sort(),
  );
});

test("cleanup removes only the exact generated localized artifacts", async (t) => {
  const { root, directory } = await createArtifactFixture({
    "get-server-info.html": "English source",
    "get-server-info.en-XA.html": "Private pseudo locale",
    "get-server-info.es.html": "Spanish locale",
    "resources/utils.js": "English controls",
    "resources/utils.en-XA.js": "Private localized controls",
    "resources/utils.es.js": "Spanish localized controls",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  await createBuildExampleArtifactWorkflow(root).clean();

  assert.deepEqual((await readdir(directory)).sort(), [
    "get-server-info.html",
    "resources",
  ]);
  assert.deepEqual(await readdir(join(directory, "resources")), ["utils.js"]);
});

test("cleanup refuses every other locale-suffixed artifact without deleting files", async (t) => {
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
    createBuildExampleArtifactWorkflow(root).clean(),
    /Refusing to remove unexpected localized artifacts: get-server-info\.en\.html, resources\/utils\.min\.js, subscribe-block-added\.pt-BR\.html, unexpected\.es\.html/u,
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

test("cleanup rejects nested localized artifacts without deleting files", async (t) => {
  const nestedPath = "demos/archive/unexpected.es.html";
  const { root, directory } = await createArtifactFixture({
    "get-server-info.en-XA.html": "Known generated artifact",
    [nestedPath]: "Unexpected nested Spanish artifact",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    createBuildExampleArtifactWorkflow(root).clean(),
    /Refusing to remove unexpected localized artifacts: demos\/archive\/unexpected\.es\.html/u,
  );
  assert.equal(
    await readFile(join(directory, nestedPath), "utf8"),
    "Unexpected nested Spanish artifact",
  );
  assert.equal(
    await readFile(join(directory, "get-server-info.en-XA.html"), "utf8"),
    "Known generated artifact",
  );
});

test("Build example return paths are restricted to each exact same-origin locale anchor", () => {
  const origin = "https://preview.example";
  for (const locale of ["en-XA", "es"] as const) {
    const expectedPath = `/${locale}/build`;
    const fallback = `/${locale}/build#try-live`;

    assert.equal(
      resolveBuildExampleReturnPath(fallback, origin, expectedPath),
      fallback,
    );
    assert.equal(
      resolveBuildExampleReturnPath(
        `${origin}/${locale}/build#try-live`,
        origin,
        expectedPath,
      ),
      fallback,
    );

    for (const rejected of [
      `https://attacker.example/${locale}/build#try-live`,
      `//attacker.example/${locale}/build#try-live`,
      "/build#try-live",
      `/${locale}/build`,
      `/${locale}/build#other`,
      `/${locale}/build?next=evil#try-live`,
      `https://user:password@preview.example/${locale}/build#try-live`,
      "%",
    ]) {
      assert.equal(
        resolveBuildExampleReturnPath(rejected, origin, expectedPath),
        fallback,
        rejected,
      );
    }
  }
});
