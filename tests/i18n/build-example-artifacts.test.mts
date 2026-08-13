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
  assert.deepEqual(Object.keys(manifest.urlsByLocale), [
    "en-XA",
    "es",
    "de",
    "fr",
    "zh-CN",
    "ru",
    "id-ID",
    "pt-BR",
  ]);
  assert.ok(
    manifest.locales.every(
      (locale) => manifest.pathsByLocale[locale].length === 6,
    ),
  );
  assert.equal(manifest.localizedPaths.length, 48);
  assert.equal(manifest.localizedUrls.length, 48);
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
    manifest.pathsByLocale.de,
    manifest.localizedPaths,
    manifest.urlsByLocale,
    manifest.urlsByLocale["en-XA"],
    manifest.urlsByLocale.es,
    manifest.urlsByLocale.de,
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

test("Build pseudo artifacts are deterministic, complete, and test-only", async () => {
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
    /eventPluralRules\.select\(events\)/u,
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

test("Build artifact plurals dispatch every supplied Russian category", async () => {
  const compiled = await artifacts.compile("test");
  const assignment = compiled["utxo-context.ru.html"]
    .split("\n")
    .find((candidate) => candidate.includes("eventPluralRules.select(events)"));
  assert.ok(assignment);

  for (const [events, expected] of [
    [1, "| Получено 1 событие"],
    [2, "| Получено 2 события"],
    [5, "| Получено 5 событий"],
    [21, "| Получено 21 событие"],
  ] as const) {
    const actions = { innerHTML: "" };
    runInNewContext(assignment.trim(), {
      document: { getElementById: () => actions },
      eventNumberFormat: new Intl.NumberFormat("ru"),
      eventPluralRules: new Intl.PluralRules("ru"),
      events,
    });
    assert.equal(actions.innerHTML, expected);
  }
});

test("UTXO event callbacks increment the count before rendering it", async () => {
  const compiled = await artifacts.compile("test");
  const registration = compiled["utxo-context.ru.html"].match(
    /monitor\.processor\.addEventListener\(\(event\) => \{[\s\S]*?\n\s*\}\);/u,
  )?.[0];
  assert.ok(registration);

  const actions = { innerHTML: "" };
  const listeners: Array<(event: unknown) => void> = [];
  runInNewContext(registration, {
    document: { getElementById: () => actions },
    eventNumberFormat: new Intl.NumberFormat("ru"),
    eventPluralRules: new Intl.PluralRules("ru"),
    events: 0,
    log: () => undefined,
    monitor: {
      processor: {
        addEventListener: (listener: (event: unknown) => void) =>
          listeners.push(listener),
      },
    },
  });

  assert.equal(listeners.length, 1);
  listeners[0]({});
  assert.equal(actions.innerHTML, "| Получено 1 событие");
});

test("catalog-backed Build artifacts are deterministic and complete", async () => {
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

  for (const name of exampleNames) {
    const german = first[`${name}.de.html`];
    assert.match(german, /<html lang="de" dir="ltr">/u);
    assert.match(german, /from '\.\/resources\/utils\.de\.js'/u);
    assert.match(german, /Verbindung zum Kaspa-Netzwerk/u);
    assert.match(german, /<meta name="robots" content="noindex, nofollow">/u);
    assert.doesNotMatch(german, /\[!! /u);
  }
  assert.match(first["get-server-info.de.html"], /GetServerInfo-Anfrage/u);
  assert.match(first["get-block-dag-info.de.html"], /GetBlockDagInfo-Antwort/u);
  assert.match(first["subscribe-block-added.de.html"], /Block-Added-Ereignis/u);
  assert.match(first["utxo-context.de.html"], /Ereignis empfangen/u);
  assert.match(first["utxo-context.de.html"], /Ereignisse empfangen/u);
  assert.match(first["utxo-context.de.html"], /UtxoProcessor/u);

  const germanControls = first["resources/utils.de.js"];
  assert.match(germanControls, /href="\/de\/build#try-live"/u);
  assert.match(germanControls, /<- Zurück<\/a> \| Netzwerk:/u);
  assert.match(germanControls, />Trennen<\/a>/u);
  assert.match(germanControls, />Neu verbinden<\/a>/u);

  for (const name of exampleNames) {
    const chinese = first[`${name}.zh-CN.html`];
    assert.match(chinese, /<html lang="zh-CN" dir="ltr">/u);
    assert.match(chinese, /from '\.\/resources\/utils\.zh-CN\.js'/u);
    assert.match(chinese, /正在连接 Kaspa 网络/u);
    assert.match(chinese, /<meta name="robots" content="noindex, nofollow">/u);
    assert.doesNotMatch(chinese, /\[!! /u);
  }
  assert.match(first["subscribe-block-added.zh-CN.html"], /连接已断开：/u);
  assert.match(first["utxo-context.zh-CN.html"], /数千个 UTXO/u);
  assert.match(first["utxo-context.zh-CN.html"], /并不切实际/u);
  assert.doesNotMatch(first["utxo-context.zh-CN.html"], /UTXOs/u);

  const chineseControls = first["resources/utils.zh-CN.js"];
  assert.match(chineseControls, /href="\/zh-CN\/build#try-live"/u);
  assert.match(chineseControls, /<- 返回<\/a> \| 网络:/u);
  assert.match(chineseControls, />断开连接<\/a>/u);
  assert.match(chineseControls, />重新连接<\/a>/u);

  for (const name of exampleNames) {
    const russian = first[`${name}.ru.html`];
    assert.match(russian, /<html lang="ru" dir="ltr">/u);
    assert.match(russian, /from '\.\/resources\/utils\.ru\.js'/u);
    assert.match(russian, /Подключение к сети Kaspa/u);
    assert.match(russian, /<meta name="robots" content="noindex, nofollow">/u);
    assert.doesNotMatch(russian, /\[!! /u);
  }
  assert.match(first["get-server-info.ru.html"], /Запрос GetServerInfo/u);
  assert.match(first["get-block-dag-info.ru.html"], /Ответ GetBlockDagInfo/u);
  assert.match(first["subscribe-block-added.ru.html"], /Отключено от/u);
  assert.match(first["utxo-context.ru.html"], /"one":/u);
  assert.match(first["utxo-context.ru.html"], /"few":/u);
  assert.match(first["utxo-context.ru.html"], /"many":/u);
  assert.match(first["utxo-context.ru.html"], /" событие"/u);
  assert.match(first["utxo-context.ru.html"], /" события"/u);
  assert.match(first["utxo-context.ru.html"], /" событий"/u);
  assert.match(first["utxo-context.ru.html"], /тысячи UTXO/u);
  assert.doesNotMatch(first["utxo-context.ru.html"], /UTXOs/u);

  const russianControls = first["resources/utils.ru.js"];
  assert.match(russianControls, /href="\/ru\/build#try-live"/u);
  assert.match(russianControls, /<- Назад<\/a> \| Сеть:/u);
  assert.match(russianControls, />Отключить<\/a>/u);
  assert.match(russianControls, />Восстановить соединение<\/a>/u);

  for (const name of exampleNames) {
    const indonesian = first[`${name}.id-ID.html`];
    assert.match(indonesian, /<html lang="id-ID" dir="ltr">/u);
    assert.match(indonesian, /from '\.\/resources\/utils\.id-ID\.js'/u);
    assert.match(indonesian, /Menghubungkan ke jaringan Kaspa/u);
    assert.match(
      indonesian,
      /<meta name="robots" content="noindex, nofollow">/u,
    );
    assert.doesNotMatch(indonesian, /\[!! /u);
  }
  assert.match(
    first["get-server-info.id-ID.html"],
    /Permintaan GetServerInfo/u,
  );
  assert.match(
    first["get-block-dag-info.id-ID.html"],
    /Respons GetBlockDagInfo/u,
  );
  assert.match(first["subscribe-block-added.id-ID.html"], /Terputus dari/u);
  assert.match(first["utxo-context.id-ID.html"], /ribuan UTXO/u);

  const indonesianControls = first["resources/utils.id-ID.js"];
  assert.match(indonesianControls, /href="\/id-ID\/build#try-live"/u);
  assert.match(indonesianControls, /<- Kembali<\/a> \| Jaringan:/u);
  assert.match(indonesianControls, />Putuskan<\/a>/u);
  assert.match(indonesianControls, />Hubungkan kembali<\/a>/u);

  for (const name of exampleNames) {
    const brazilianPortuguese = first[`${name}.pt-BR.html`];
    assert.match(brazilianPortuguese, /<html lang="pt-BR" dir="ltr">/u);
    assert.match(
      brazilianPortuguese,
      /from '\.\/resources\/utils\.pt-BR\.js'/u,
    );
    assert.match(brazilianPortuguese, /Conectando à rede Kaspa/u);
    assert.match(
      brazilianPortuguese,
      /<meta name="robots" content="noindex, nofollow">/u,
    );
    assert.doesNotMatch(brazilianPortuguese, /\[!! /u);
  }
  assert.match(
    first["subscribe-block-added.pt-BR.html"],
    /Assinando eventos de adição de bloco/u,
  );
  assert.match(first["utxo-context.pt-BR.html"], /eventos recebidos/u);

  const brazilianPortugueseControls = first["resources/utils.pt-BR.js"];
  assert.match(brazilianPortugueseControls, /href="\/pt-BR\/build#try-live"/u);
  assert.match(brazilianPortugueseControls, /<- Voltar<\/a> \| Rede:/u);
});

test("Build artifacts use an RTL locale direction without generator changes", async () => {
  const rtlArtifacts = await createBuildExampleArtifactWorkflow(
    repositoryRoot,
    {
      resolveTextDirection: (locale) => (locale === "de" ? "rtl" : "ltr"),
    },
  ).compile("preview");

  for (const name of exampleNames) {
    const german = rtlArtifacts[`${name}.de.html`];
    assert.match(german, /<html lang="de" dir="rtl">/u);
    assert.doesNotMatch(german, /<html lang="de" dir="ltr">/u);
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

  const generated =
    await createBuildExampleArtifactWorkflow(root).compile("production");
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

  const generated =
    await createBuildExampleArtifactWorkflow(root).compile("production");
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

  const generated =
    await createBuildExampleArtifactWorkflow(root).compile("production");
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

  const generated =
    await createBuildExampleArtifactWorkflow(root).compile("production");
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
    createBuildExampleArtifactWorkflow(root).prepareVendor("production"),
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
  assert.ok(
    html.indexOf("events += 1;") <
      html.indexOf('document.getElementById("actions").innerHTML'),
    "vendor preparation must increment the event count before rendering it",
  );

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

test("vendor preparation reproduces the pinned no-newline UTXO source", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await restoreUpstreamVendorInputs(root);
  const utxoPath = join(root, examplesRelativeDirectory, "utxo-context.html");
  assert.equal((await readFile(utxoPath, "utf8")).endsWith("\n"), false);

  await createBuildExampleArtifactWorkflow(root).prepareVendor("production");

  const prepared = await readFile(utxoPath, "utf8");
  assert.equal(prepared.endsWith("\n"), false);
  assert.ok(
    prepared.indexOf("events += 1;") <
      prepared.indexOf('document.getElementById("actions").innerHTML'),
    "vendor preparation must increment the event count before rendering it",
  );
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
    /must be a cardinal count plural with an other branch/u,
  );
});

test("workflow sync and check enforce each target artifact set", async (t) => {
  const root = await createWorkflowFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixture = createBuildExampleArtifactWorkflow(root);
  const directory = join(root, examplesRelativeDirectory);

  await fixture.sync("test");
  await fixture.check("test");
  assert.deepEqual(
    (await readdir(directory))
      .filter((path) =>
        /\.(?:de|en-XA|es|fr|id-ID|pt-BR|ru|zh-CN)\.html$/u.test(path),
      )
      .sort(),
    manifest.localizedPaths.filter((path) => path.endsWith(".html")).sort(),
  );

  await fixture.sync("preview");
  await fixture.check("preview");
  assert.deepEqual(
    (await readdir(directory))
      .filter((path) =>
        /\.(?:de|en-XA|es|fr|id-ID|pt-BR|ru|zh-CN)\.html$/u.test(path),
      )
      .sort(),
    [
      ...manifest.pathsByLocale.es,
      ...manifest.pathsByLocale.de,
      ...manifest.pathsByLocale.fr,
      ...manifest.pathsByLocale["zh-CN"],
      ...manifest.pathsByLocale.ru,
      ...manifest.pathsByLocale["id-ID"],
      ...manifest.pathsByLocale["pt-BR"],
    ]
      .filter((path) => path.endsWith(".html"))
      .sort(),
  );

  await fixture.sync("production");
  await fixture.check("production");
  assert.deepEqual(
    (await readdir(directory))
      .filter((path) =>
        /\.(?:de|en-XA|es|fr|id-ID|pt-BR|ru|zh-CN)\.html$/u.test(path),
      )
      .sort(),
    [
      ...manifest.pathsByLocale.es,
      ...manifest.pathsByLocale.de,
      ...manifest.pathsByLocale.fr,
      ...manifest.pathsByLocale["zh-CN"],
      ...manifest.pathsByLocale.ru,
      ...manifest.pathsByLocale["id-ID"],
      ...manifest.pathsByLocale["pt-BR"],
    ]
      .filter((path) => path.endsWith(".html"))
      .sort(),
  );
});

test("cleanup removes only the exact generated localized artifacts", async (t) => {
  const { root, directory } = await createArtifactFixture({
    "get-server-info.html": "English source",
    "get-server-info.en-XA.html": "Test-only pseudo locale",
    "get-server-info.es.html": "Spanish locale",
    "resources/utils.js": "English controls",
    "resources/utils.en-XA.js": "Test-only localized controls",
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
    "get-server-info.en-XA.html": "Test-only pseudo locale",
    "get-server-info.en.html": "Duplicate source locale",
    "get-server-info.es.html": "Known localized sibling",
    "subscribe-block-added.pt-PT.html": "Unknown regional localized sibling",
    "resources/utils.en-XA.js": "Test-only localized controls",
    "resources/utils.es.js": "Localized controls",
    "resources/utils.min.js": "Plausible minified vendor asset",
    "unexpected.es.html": "Unknown localized artifact",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    createBuildExampleArtifactWorkflow(root).clean(),
    /Refusing to remove unexpected localized artifacts: get-server-info\.en\.html, resources\/utils\.min\.js, subscribe-block-added\.pt-PT\.html, unexpected\.es\.html/u,
  );
  assert.deepEqual((await readdir(directory)).sort(), [
    "get-server-info.en-XA.html",
    "get-server-info.en.html",
    "get-server-info.es.html",
    "resources",
    "subscribe-block-added.pt-PT.html",
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
  for (const locale of manifest.locales) {
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
