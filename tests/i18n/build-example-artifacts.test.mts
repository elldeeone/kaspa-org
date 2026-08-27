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
import { runInNewContext } from "node:vm";

import { createBuildExampleArtifactWorkflow } from "../../scripts/i18n/build-example-artifacts.mts";
import {
  compileBuildExampleArtifacts,
  type BuildArtifactMessages,
  type BuildExampleCompilerInput,
} from "../../scripts/i18n/build-example-artifact-compiler.mts";
import { resolveBuildExampleReturnPath } from "../../scripts/i18n/build-example-return-path.mjs";
import {
  buildExampleContract,
  type BuildArtifactLocale,
} from "../../src/i18n/build-example-contract.ts";

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

async function loadCompilerInput(): Promise<BuildExampleCompilerInput> {
  const sourceEntries = await Promise.all(
    [...exampleNames.map((name) => `${name}.html`), "resources/utils.js"].map(
      async (path) =>
        [path, await readFile(join(examplesDirectory, path), "utf8")] as const,
    ),
  );
  const messages = async (locale: "en" | BuildArtifactLocale) => {
    const catalog = JSON.parse(
      await readFile(
        join(repositoryRoot, `messages/${locale}/build.json`),
        "utf8",
      ),
    ) as { artifacts: BuildArtifactMessages };
    return catalog.artifacts;
  };
  const [englishMessages, ...targetMessages] = await Promise.all([
    messages("en"),
    ...manifest.locales.map(messages),
  ]);
  return {
    sources: Object.fromEntries(sourceEntries),
    englishMessages,
    targets: manifest.locales.map((locale, index) => ({
      locale,
      direction: "ltr" as const,
      messages: targetMessages[index],
    })),
  };
}

async function restoreUpstreamVendorInputs(root: string): Promise<void> {
  const directory = join(root, examplesRelativeDirectory);
  await Promise.all(
    exampleNames.map(async (name) => {
      const path = join(directory, `${name}.html`);
      const source = await readFile(path, "utf8");
      assert.match(source, /<html lang="en" dir="ltr">/u);
      await writeFile(
        path,
        source.replace('<html lang="en" dir="ltr">', "<html>"),
        "utf8",
      );
    }),
  );

  const utxoPath = join(directory, "utxo-context.html");
  let utxo = await readFile(utxoPath, "utf8");
  const preparedEvents =
    /                let events = 0;\n                const eventPluralRules[\s\S]*?\n                \}\);/u;
  assert.match(utxo, preparedEvents);
  utxo = utxo.replace(
    preparedEvents,
    `                let events = 0;
                monitor.processor.addEventListener((event) => {
                    document.getElementById("actions").innerHTML = \`| Received \${events} event(s)\`;
                    log("event:", event);
                    events += 1;
                });`,
  );
  await writeFile(utxoPath, utxo, "utf8");

  const utilsPath = join(directory, "resources/utils.js");
  let utils = await readFile(utilsPath, "utf8");
  const preparedImport =
    "import { resolveBuildExampleReturnPath } from './return-path.mjs';\n\n";
  const preparedHeader =
    '<a id="back-link" href="/build#try-live"><- Back</a> | Network: <span id="menu"></span><span id="actions"></span><br>';
  const upstreamHeader =
    '<a href="index.html"><- Back</a> | Network: <span id="menu"></span><span id="actions"></span><br>&nbsp;<br>';
  assert.equal(utils.split(preparedImport).length - 1, 1);
  assert.equal(utils.split(preparedHeader).length - 1, 1);
  utils = utils
    .replace(preparedImport, "")
    .replace(preparedHeader, upstreamHeader);
  const preparedSetup =
    /function setupBackLink\(\) \{[\s\S]*?document\.addEventListener\('DOMContentLoaded', \(\) => \{\n    setupBackLink\(\);\n    createMenu\(\);\n\}\);/u;
  assert.match(utils, preparedSetup);
  utils = utils.replace(
    preparedSetup,
    `document.addEventListener('DOMContentLoaded', () => {
    createMenu();
});`,
  );
  await writeFile(utilsPath, utils, "utf8");
}

test("artifact manifest follows the central Build-example contract", () => {
  for (const locale of manifest.locales) {
    assert.deepEqual(manifest.pathsByLocale[locale], [
      ...exampleNames.map((name) => `${name}.${locale}.html`),
      `resources/utils.${locale}.js`,
    ]);
  }
  assert.deepEqual(Object.keys(manifest.urlsByLocale), [...manifest.locales]);
  assert.equal(
    manifest.localizedPaths.length,
    manifest.locales.length * (exampleNames.length + 1),
  );
  assert.equal(manifest.localizedUrls.length, manifest.localizedPaths.length);
  assert.ok(
    manifest.localizedUrls.every((path) =>
      path.startsWith(`${buildExampleContract.examplesPublicBasePath}/`),
    ),
  );
});

test("git ignores only the registered generated artifacts", async () => {
  const generatedPrefix = `/${examplesRelativeDirectory}/`;
  const ignoredArtifacts = (
    await readFile(join(repositoryRoot, ".gitignore"), "utf8")
  )
    .split(/\r?\n/u)
    .filter((line) => line.startsWith(generatedPrefix))
    .sort();
  assert.deepEqual(
    ignoredArtifacts,
    manifest.localizedPaths.map((path) => `${generatedPrefix}${path}`).sort(),
  );
});

test("artifact manifest is deeply immutable and cannot change cleanup policy", () => {
  for (const collection of [
    buildExampleContract,
    buildExampleContract.examples,
    manifest,
    manifest.locales,
    manifest.pathsByLocale,
    ...Object.values(manifest.pathsByLocale),
    manifest.localizedPaths,
    manifest.urlsByLocale,
    ...Object.values(manifest.urlsByLocale),
    manifest.localizedUrls,
  ]) {
    assert.equal(Object.isFrozen(collection), true);
  }

  const locale = manifest.locales[0];
  assert.ok(locale);
  const expectedLocales = [...manifest.locales];
  const expectedPaths = [...manifest.pathsByLocale[locale]];
  assert.throws(
    () => (manifest.locales as unknown as string[]).push("pt-BR"),
    TypeError,
  );
  assert.throws(
    () =>
      (manifest.pathsByLocale[locale] as unknown as string[]).push(
        `unexpected.${locale}.html`,
      ),
    TypeError,
  );
  assert.throws(
    () => Object.defineProperty(manifest.pathsByLocale, locale, { value: [] }),
    TypeError,
  );
  assert.deepEqual(manifest.locales, expectedLocales);
  assert.deepEqual(manifest.pathsByLocale[locale], expectedPaths);
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

test("localized Build artifacts are deterministic, complete, and catalog-backed", async () => {
  const first = await artifacts.compile();
  const second = await artifacts.compile();
  const input = await loadCompilerInput();

  assert.deepEqual(first, second);
  for (const target of input.targets) {
    const { locale, messages } = target;
    for (const name of exampleNames) {
      const localized = first[`${name}.${locale}.html`];
      assert.ok(localized.includes(`<html lang="${locale}" dir="ltr">`));
      assert.ok(localized.includes(`from './resources/utils.${locale}.js'`));
      assert.ok(localized.includes(messages.runtime.connectingKaspaNetwork));
      assert.ok(
        localized.includes('<meta name="robots" content="noindex, nofollow">'),
      );
      assert.doesNotMatch(localized, /\[!! /u);
    }

    assert.ok(
      first[`get-server-info.${locale}.html`].includes(
        messages.runtime.apiRequest.replace("{api}", "GetServerInfo"),
      ),
    );
    assert.ok(
      first[`get-block-dag-info.${locale}.html`].includes(
        messages.runtime.apiResponse.replace("{api}", "GetBlockDagInfo"),
      ),
    );
    assert.ok(
      first[`subscribe-block-added.${locale}.html`].includes(
        messages.runtime.subscribingBlockAdded,
      ),
    );

    const controls = first[`resources/utils.${locale}.js`];
    assert.ok(controls.includes(`href="/${locale}/build#try-live"`));
    assert.ok(
      controls.includes(
        `<- ${messages.controls.back}</a> | ${messages.controls.network}:`,
      ),
    );
    assert.ok(controls.includes(`>${messages.controls.disconnect}</a>`));
    assert.ok(controls.includes(`>${messages.controls.reconnect}</a>`));
    assert.ok(
      controls.includes(`innerHTML = \` ${messages.controls.connecting}\`;`),
    );
    assert.match(controls, /mainnet/u);
    assert.match(controls, /testnet-10/u);
    assert.match(controls, /testnet-11/u);
  }
});

test("Build artifacts use a locale's registered text direction", async () => {
  const input = await loadCompilerInput();
  const testLocale = manifest.locales[0];
  assert.ok(testLocale);
  const rtlArtifacts = compileBuildExampleArtifacts({
    ...input,
    targets: input.targets.map((target) =>
      target.locale === testLocale ? { ...target, direction: "rtl" } : target,
    ),
  }).generated;

  for (const name of exampleNames) {
    const artifact = rtlArtifacts[`${name}.${testLocale}.html`];
    assert.match(
      artifact,
      new RegExp(`<html lang="${testLocale}" dir="rtl">`, "u"),
    );
    assert.doesNotMatch(
      artifact,
      new RegExp(`<html lang="${testLocale}" dir="ltr">`, "u"),
    );
  }
});

test("catalog interpolation text cannot execute in generated JavaScript", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalogPath = join(root, "messages/es/build.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
    artifacts: { runtime: { selectedNetwork: string } };
  };
  catalog.artifacts.runtime.selectedNetwork =
    "Red ${globalThis.catalogTextExecuted = true}: {network}";
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const generated = await createBuildExampleArtifactWorkflow(root).compile();
  const line = generated["get-server-info.es.html"]
    .split("\n")
    .find((candidate) => candidate.includes("catalogTextExecuted"));
  assert.ok(line);
  const call = line.trim();
  assert.match(call, /^log\([\s\S]*\);$/u);
  const context: Record<string, unknown> = { networkId: "mainnet" };
  const result = runInNewContext(call.slice(4, -2), context) as string;

  assert.equal(context.catalogTextExecuted, undefined);
  assert.equal(result, "Red ${globalThis.catalogTextExecuted = true}: mainnet");
});

test("catalog backticks remain text in generated JavaScript", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalogPath = join(root, "messages/es/build.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
    artifacts: { runtime: { selectedNetwork: string } };
  };
  catalog.artifacts.runtime.selectedNetwork = "Red `principal`: {network}";
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const generated = await createBuildExampleArtifactWorkflow(root).compile();
  const line = generated["get-server-info.es.html"]
    .split("\n")
    .find((candidate) => candidate.includes("principal"));
  assert.ok(line);
  const call = line.trim();
  assert.match(call, /^log\([\s\S]*\);$/u);

  assert.equal(
    runInNewContext(call.slice(4, -2), { networkId: "mainnet" }),
    "Red `principal`: mainnet",
  );
});

test("catalog quotes and tags cannot inject generated HTML", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalogPath = join(root, "messages/es/build.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
    artifacts: {
      controls: { back: string };
      utxo: { addressPlaceholder: string; monitorAddress: string };
    };
  };
  catalog.artifacts.utxo.addressPlaceholder =
    'Dirección {network}" autofocus onfocus="catalogAttributeExecuted()"><img src=x onerror="catalogElementExecuted()">';
  catalog.artifacts.utxo.monitorAddress =
    'Vigilar</div><img src=x onerror="catalogElementExecuted()"><div>';
  catalog.artifacts.controls.back =
    'Volver</a><img src=x onerror="catalogElementExecuted()"><a>';
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const generated = await createBuildExampleArtifactWorkflow(root).compile();
  const html = generated["utxo-context.es.html"];
  assert.match(
    html,
    /placeholder="Dirección \$\{network\}&quot; autofocus onfocus=&quot;catalogAttributeExecuted\(\)&quot;&gt;&lt;img src=x onerror=&quot;catalogElementExecuted\(\)&quot;&gt;"/u,
  );
  assert.match(
    html,
    />Vigilar&lt;\/div&gt;&lt;img src=x onerror=&quot;catalogElementExecuted\(\)&quot;&gt;&lt;div&gt;</u,
  );
  assert.doesNotMatch(html, /<img src=x/u);

  const controls = generated["resources/utils.es.js"];
  assert.match(
    controls,
    /Volver&lt;\/a&gt;&lt;img src=x onerror=&quot;catalogElementExecuted\(\)&quot;&gt;&lt;a&gt;<\/a>/u,
  );
  assert.doesNotMatch(controls, /<img src=x/u);
});

test("catalog text stays inert when generated JavaScript writes innerHTML", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalogPath = join(root, "messages/es/build.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
    artifacts: {
      runtime: { connectingKaspaNetwork: string };
      utxo: { receivedEvents: string };
    };
  };
  catalog.artifacts.runtime.connectingKaspaNetwork =
    "'<img src=x onerror=globalThis.catalogLogExecuted=true>'";
  catalog.artifacts.utxo.receivedEvents =
    "| {count, plural, one {'<img src=x onerror=globalThis.catalogPluralExecuted=true>' # evento} other {'<img src=x onerror=globalThis.catalogPluralExecuted=true>' # eventos}}";
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const generated = await createBuildExampleArtifactWorkflow(root).compile();
  const html = generated["utxo-context.es.html"];
  const logCall = html
    .split("\n")
    .find((candidate) => candidate.includes("catalogLogExecuted"));
  const pluralAssignment = html
    .split("\n")
    .find((candidate) => candidate.includes("catalogPluralExecuted"));
  assert.ok(logCall);
  assert.ok(pluralAssignment);

  const logOutput = { innerHTML: "" };
  runInNewContext(logCall.trim(), {
    log: (...args: unknown[]) => {
      logOutput.innerHTML = `${args.join(" ")}<br>`;
    },
  });
  assert.doesNotMatch(logOutput.innerHTML, /<img/u);
  assert.match(logOutput.innerHTML, /&lt;img/u);

  const actions = { innerHTML: "" };
  runInNewContext(pluralAssignment.trim(), {
    document: { getElementById: () => actions },
    eventNumberFormat: { format: (value: number) => String(value) },
    eventPluralRules: { select: () => "other" },
    events: 2,
  });
  assert.doesNotMatch(actions.innerHTML, /<img/u);
  assert.match(actions.innerHTML, /&lt;img/u);
});

test("English catalog text stays inert when preparing vendored innerHTML", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await restoreUpstreamVendorInputs(root);
  const catalogPath = join(root, "messages/en/build.json");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as {
    artifacts: {
      runtime: { event: string };
      utxo: { receivedEvents: string };
    };
  };
  catalog.artifacts.runtime.event =
    "'<img src=x onerror=globalThis.catalogEnglishLogExecuted=true>'";
  catalog.artifacts.utxo.receivedEvents =
    "| {count, plural, one {'<img src=x onerror=globalThis.catalogEnglishPluralExecuted=true>' # event} other {'<img src=x onerror=globalThis.catalogEnglishPluralExecuted=true>' # events}}";
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  await assert.rejects(
    createBuildExampleArtifactWorkflow(root).prepareVendor(),
    /utxo-context\.html changed; review its human-readable string inventory/u,
  );
  const html = await readFile(
    join(root, examplesRelativeDirectory, "utxo-context.html"),
    "utf8",
  );
  const logCall = html
    .split("\n")
    .find((candidate) => candidate.includes("catalogEnglishLogExecuted"));
  const pluralAssignment = html
    .split("\n")
    .find((candidate) => candidate.includes("catalogEnglishPluralExecuted"));
  assert.ok(logCall);
  assert.ok(pluralAssignment);

  const logOutput = { innerHTML: "" };
  runInNewContext(logCall.trim(), {
    event: {},
    log: (...args: unknown[]) => {
      logOutput.innerHTML = `${args.join(" ")}<br>`;
    },
  });
  assert.doesNotMatch(logOutput.innerHTML, /<img/u);
  assert.match(logOutput.innerHTML, /&lt;img/u);

  const actions = { innerHTML: "" };
  runInNewContext(pluralAssignment.trim(), {
    document: { getElementById: () => actions },
    eventNumberFormat: { format: (value: number) => String(value) },
    eventPluralRules: { select: () => "other" },
    events: 2,
  });
  assert.doesNotMatch(actions.innerHTML, /<img/u);
  assert.match(actions.innerHTML, /&lt;img/u);
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
  await fixture.sync();
  await writeFile(spanishCatalogPath, spanishCatalog, "utf8");

  await assert.rejects(
    fixture.check(),
    /Stale generated localized artifact get-server-info\.es\.html/u,
  );
});

test("artifact compiler preserves ICU exact-selector semantics", async () => {
  const input = await loadCompilerInput();
  const target = structuredClone(input.targets[0]);
  target.messages.utxo.receivedEvents =
    "{count, plural, =01 {exact #} few {few #} other {other #}}";

  const compilation = compileBuildExampleArtifacts({
    ...input,
    targets: [target, ...input.targets.slice(1)],
  });
  const html = compilation.generated["utxo-context.es.html"];
  const assignment = html
    .split("\n")
    .find((candidate) =>
      candidate.includes('document.getElementById("actions").innerHTML'),
    );
  assert.ok(assignment);
  assert.doesNotMatch(assignment, /=== 01/u);

  const render = (events: number, category: string) => {
    const actions = { innerHTML: "" };
    runInNewContext(assignment.trim(), {
      document: { getElementById: () => actions },
      eventNumberFormat: { format: (value: number) => String(value) },
      eventPluralRules: { select: () => category },
      events,
    });
    return actions.innerHTML;
  };

  assert.equal(render(1, "other"), "other 1");
  assert.equal(render(3, "few"), "few 3");
  assert.equal(render(8, "many"), "other 8");
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
    createBuildExampleArtifactWorkflow(root).compile(),
    /must be a cardinal count plural with an other branch/u,
  );
});

test("workflow sync and check enforce the registered artifact set", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = createBuildExampleArtifactWorkflow(root);
  const directory = join(root, examplesRelativeDirectory);

  await fixture.sync();
  await fixture.check();
  assert.deepEqual(
    (await readdir(directory))
      .filter((path) => manifest.localizedPaths.includes(path))
      .sort(),
    manifest.localizedPaths.filter((path) => path.endsWith(".html")).sort(),
  );
});

test("cleanup removes only the exact generated localized artifacts", async (t) => {
  const { root, directory } = await createArtifactFixture({
    "get-server-info.html": "English source",
    "get-server-info.es.html": "Spanish locale",
    "resources/utils.js": "English controls",
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
    "get-server-info.en.html": "Duplicate source locale",
    "get-server-info.es.html": "Known localized sibling",
    "subscribe-block-added.pt-BR.html": "Regional localized sibling",
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
    "get-server-info.en.html",
    "get-server-info.es.html",
    "resources",
    "subscribe-block-added.pt-BR.html",
    "unexpected.es.html",
  ]);
  assert.deepEqual((await readdir(join(directory, "resources"))).sort(), [
    "utils.es.js",
    "utils.min.js",
  ]);
});

test("cleanup rejects nested localized artifacts without deleting files", async (t) => {
  const nestedPath = "demos/archive/unexpected.es.html";
  const { root, directory } = await createArtifactFixture({
    "get-server-info.es.html": "Known generated artifact",
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
    await readFile(join(directory, "get-server-info.es.html"), "utf8"),
    "Known generated artifact",
  );
});

test("Build example return paths are restricted to each exact same-origin locale anchor", () => {
  const origin = "https://preview.example";
  for (const locale of ["es"] as const) {
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
