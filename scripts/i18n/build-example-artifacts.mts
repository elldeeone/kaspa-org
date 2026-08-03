import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  isLiteralElement,
  isPluralElement,
  isPoundElement,
  parse,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

import {
  resolveI18nBuildTarget,
  type I18nBuildTarget,
} from "../../src/i18n/config.ts";
import { pseudoLocalizeMessage } from "../../src/i18n/pseudo.ts";

export const BUILD_EXAMPLE_NAMES = [
  "get-server-info",
  "get-block-dag-info",
  "subscribe-block-added",
  "subscribe-daa-changed",
  "utxo-context",
] as const;

export const PSEUDO_BUILD_EXAMPLE_PATHS = [
  ...BUILD_EXAMPLE_NAMES.map((name) => `${name}.en-XA.html`),
  "resources/utils.en-XA.js",
] as const;

export const BUILD_EXAMPLES_PUBLIC_BASE_PATH =
  "/vendor/kaspa-wasm/2.0.0/examples/web";
export const PSEUDO_BUILD_EXAMPLE_URLS = PSEUDO_BUILD_EXAMPLE_PATHS.map(
  (path) => `${BUILD_EXAMPLES_PUBLIC_BASE_PATH}/${path}`,
);

const EXAMPLES_RELATIVE_DIRECTORY =
  "public/vendor/kaspa-wasm/2.0.0/examples/web";
const SOURCE_UTILS_PATH = "resources/utils.js";
const RETURN_PATH_RUNTIME = "resources/return-path.mjs";
const RETURN_PATH_SOURCE = "scripts/i18n/build-example-return-path.mjs";

const ENGLISH_SOURCE_SHA256: Readonly<Record<string, string>> = {
  "get-server-info.html":
    "ababa4c080d4814d3432a313d1825dd10a04fd78a9e73fde2f285e96386e6329",
  "get-block-dag-info.html":
    "9f8cef76af9afa24b9ea6667c83ced42466277c9d3a3231bd21ed2d7ec642c2b",
  "subscribe-block-added.html":
    "df59e12dc663773201f7443f61ac1dac72413e9bcfbc9be8bd77cf19df7a1dac",
  "subscribe-daa-changed.html":
    "c9407ddff8a26dba218377b17f15129701c51879d513103cf3b79faac737595a",
  "utxo-context.html":
    "42cedf09a849c69fdacb4ef6d9cf02d90515c49bbd50410c6b67a0f4ac4f6def",
  [SOURCE_UTILS_PATH]:
    "2b22d8b026f2f829ce327768a7541eff3a65635197bcdabed7aba5d67d61ef2c",
};

const ENGLISH_SETUP_BACK_LINK = `function setupBackLink() {
    let backLink = document.getElementById('back-link');
    if (!backLink) {
        return;
    }

    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    const returnPath = resolveBuildExampleReturnPath(
        returnTo,
        window.location.origin,
        '/build'
    );
    backLink.setAttribute('href', returnPath);

    if (window.top !== window.self) {
        backLink.setAttribute('target', '_top');
        return;
    }

    let referrer;
    try {
        referrer = document.referrer ? new URL(document.referrer) : null;
    } catch {
        referrer = null;
    }

    const cameFromBuild =
        referrer &&
        referrer.origin === window.location.origin &&
        referrer.pathname === '/build';

    if (cameFromBuild && !returnTo) {
        backLink.setAttribute('href', '/build#try-live');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupBackLink();
    createMenu();
});`;

export type BuildExampleSources = Readonly<Record<string, string>>;
export type GeneratedBuildExampleArtifacts = Readonly<Record<string, string>>;
export type BuildArtifactMessages = {
  controls: {
    back: string;
    network: string;
    disconnect: string;
    reconnect: string;
    connecting: string;
  };
  runtime: {
    connectingKaspaNetwork: string;
    selectedNetwork: string;
    connectedTo: string;
    disconnected: string;
    disconnectedFrom: string;
    connectingPublicNode: string;
    disconnect: string;
    apiRequest: string;
    apiResponse: string;
    subscribingEvent: string;
    registeringProtocolNotifications: string;
    subscribingProtocolScore: string;
    event: string;
    networkConsole: string;
  };
  utxo: {
    receivedEvents: string;
    noticeManyUtxos: string;
    noticeManualTesting: string;
    addressPlaceholder: string;
    monitorAddress: string;
    restart: string;
    trackingAddress: string;
    error: string;
    restarting: string;
    stoppingProcessor: string;
    startingProcessor: string;
    processorStarted: string;
  };
};

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
    "subscribingEvent",
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
): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `messages/en/build.json artifacts.${group} must be an object`,
    );
  }
  const record = value as Record<string, unknown>;
  const expectedKeys = ARTIFACT_MESSAGE_KEYS[group];
  const actualKeys = Object.keys(record).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify([...expectedKeys].sort())) {
    throw new Error(
      `messages/en/build.json artifacts.${group} keys differ from the standalone artifact contract`,
    );
  }
  for (const key of expectedKeys) {
    if (typeof record[key] !== "string" || record[key] === "") {
      throw new Error(
        `messages/en/build.json artifacts.${group}.${key} must be a non-empty string`,
      );
    }
  }
  return record as Record<string, string>;
}

export async function loadEnglishBuildArtifactMessages(
  repositoryRoot: string,
): Promise<BuildArtifactMessages> {
  const source = await readFile(
    join(repositoryRoot, "messages/en/build.json"),
    "utf8",
  );
  const catalog = JSON.parse(source) as Record<string, unknown>;
  const artifacts = catalog.artifacts;
  if (
    artifacts === null ||
    typeof artifacts !== "object" ||
    Array.isArray(artifacts)
  ) {
    throw new Error("messages/en/build.json must contain an artifacts object");
  }
  const groups = artifacts as Record<string, unknown>;
  return {
    controls: readMessageGroup(groups.controls, "controls"),
    runtime: readMessageGroup(groups.runtime, "runtime"),
    utxo: readMessageGroup(groups.utxo, "utxo"),
  } as BuildArtifactMessages;
}

type Replacement = readonly [
  source: string,
  target: string,
  expectedOccurrences?: number,
];

function replaceExactlyOnce(
  content: string,
  [source, target, expectedOccurrences = 1]: Replacement,
  artifactPath: string,
): string {
  const occurrences = content.split(source).length - 1;
  if (occurrences !== expectedOccurrences) {
    throw new Error(
      `${artifactPath}: expected ${expectedOccurrences} occurrence(s) of ${JSON.stringify(source)}, received ${occurrences}`,
    );
  }
  return content.replaceAll(source, target);
}

function replacePatternExactlyOnce(
  content: string,
  pattern: RegExp,
  target: string,
  artifactPath: string,
): string {
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(
      `${artifactPath}: expected one structural match for ${pattern}, received ${matches.length}`,
    );
  }
  return content.replace(pattern, target);
}

function substituteMessage(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  let result = message;
  for (const [name, value] of Object.entries(substitutions)) {
    const placeholder = `{${name}}`;
    if (!result.includes(placeholder)) {
      throw new Error(`Missing pseudo-message placeholder ${placeholder}`);
    }
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

function pseudoMessage(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return substituteMessage(pseudoLocalizeMessage(message), substitutions);
}

function sourceLiteral(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return JSON.stringify(substituteMessage(message, substitutions));
}

function literal(message: string): string {
  return JSON.stringify(pseudoMessage(message));
}

function template(
  message: string,
  substitutions: Readonly<Record<string, string>>,
): string {
  return `\`${pseudoMessage(message, substitutions)}\``;
}

function sourceTemplate(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return `\`${substituteMessage(message, substitutions)}\``;
}

function compilePluralBranch(
  elements: readonly MessageFormatElement[],
  numberFormatExpression: string,
  countExpression: string,
): string {
  const parts = elements.map((element) => {
    if (isLiteralElement(element)) return JSON.stringify(element.value);
    if (isPoundElement(element)) {
      return `${numberFormatExpression}.format(${countExpression})`;
    }
    throw new Error("Standalone artifact plurals may contain only text and #");
  });
  return `[${parts.join(", ")}].join("")`;
}

function compileCardinalPlural(
  message: string,
  countExpression: string,
  pluralRulesExpression: string,
  numberFormatExpression: string,
): string {
  const ast = parse(message);
  const pluralIndex = ast.findIndex(isPluralElement);
  const plural = ast[pluralIndex];
  if (
    pluralIndex === -1 ||
    !isPluralElement(plural) ||
    ast.filter(isPluralElement).length !== 1 ||
    plural.pluralType !== "cardinal" ||
    plural.offset !== 0 ||
    plural.value !== "count" ||
    !plural.options.one ||
    !plural.options.other ||
    Object.keys(plural.options).length !== 2 ||
    !ast.slice(0, pluralIndex).every(isLiteralElement) ||
    !ast.slice(pluralIndex + 1).every(isLiteralElement)
  ) {
    throw new Error(
      "artifacts.utxo.receivedEvents must be a one/other cardinal count plural",
    );
  }

  const prefix = ast.slice(0, pluralIndex);
  const suffix = ast.slice(pluralIndex + 1);
  const one = compilePluralBranch(
    [...prefix, ...plural.options.one.value, ...suffix],
    numberFormatExpression,
    countExpression,
  );
  const other = compilePluralBranch(
    [...prefix, ...plural.options.other.value, ...suffix],
    numberFormatExpression,
    countExpression,
  );
  return `${pluralRulesExpression}.select(${countExpression}) === "one" ? ${one} : ${other}`;
}

function buildHtmlReplacements(
  messages: BuildArtifactMessages,
): Readonly<
  Record<(typeof BUILD_EXAMPLE_NAMES)[number], readonly Replacement[]>
> {
  const { runtime, utxo } = messages;
  const common: readonly Replacement[] = [
    [
      sourceTemplate(runtime.connectingKaspaNetwork),
      template(runtime.connectingKaspaNetwork, {}),
    ],
  ];
  const selectedNetwork = (expression: string): Replacement => [
    sourceTemplate(runtime.selectedNetwork, { network: expression }),
    template(runtime.selectedNetwork, { network: expression }),
  ];
  const apiMessage = (
    message: string,
    api: "GetBlockDagInfo" | "GetServerInfo",
  ): Replacement => [
    sourceLiteral(message, { api }),
    JSON.stringify(pseudoMessage(message, { api })),
  ];

  return {
    "get-server-info": [
      ...common,
      selectedNetwork("${networkId}"),
      [sourceLiteral(runtime.connectedTo), literal(runtime.connectedTo)],
      apiMessage(runtime.apiRequest, "GetServerInfo"),
      apiMessage(runtime.apiResponse, "GetServerInfo"),
      [sourceLiteral(runtime.disconnected), literal(runtime.disconnected)],
    ],
    "get-block-dag-info": [
      ...common,
      selectedNetwork("${networkId}"),
      [sourceLiteral(runtime.connectedTo), literal(runtime.connectedTo)],
      apiMessage(runtime.apiRequest, "GetBlockDagInfo"),
      apiMessage(runtime.apiResponse, "GetBlockDagInfo"),
      [sourceLiteral(runtime.disconnected), literal(runtime.disconnected)],
    ],
    "subscribe-block-added": [
      ...common,
      selectedNetwork('${networkId.class("network")}'),
      [sourceLiteral(runtime.connectedTo), literal(runtime.connectedTo)],
      [
        sourceLiteral(runtime.subscribingEvent, { event: "Block Added" }),
        JSON.stringify(
          pseudoMessage(runtime.subscribingEvent, { event: "Block Added" }),
        ),
      ],
      [
        sourceLiteral(runtime.disconnectedFrom),
        literal(runtime.disconnectedFrom),
      ],
      [
        `${sourceLiteral(runtime.disconnect)},event`,
        `${literal(runtime.disconnect)},event`,
      ],
      [
        sourceLiteral(runtime.connectingPublicNode),
        literal(runtime.connectingPublicNode),
      ],
    ],
    "subscribe-daa-changed": [
      ...common,
      selectedNetwork('${networkId.class("network")}'),
      [
        sourceLiteral(runtime.registeringProtocolNotifications, {
          protocol: "DAA",
        }),
        JSON.stringify(
          pseudoMessage(runtime.registeringProtocolNotifications, {
            protocol: "DAA",
          }),
        ),
      ],
      [sourceLiteral(runtime.connectedTo), literal(runtime.connectedTo)],
      [
        sourceLiteral(runtime.subscribingProtocolScore, { protocol: "DAA" }),
        JSON.stringify(
          pseudoMessage(runtime.subscribingProtocolScore, { protocol: "DAA" }),
        ),
      ],
      [
        sourceLiteral(runtime.disconnectedFrom),
        literal(runtime.disconnectedFrom),
      ],
      [
        `${sourceLiteral(runtime.disconnect)},event`,
        `${literal(runtime.disconnect)},event`,
      ],
      [
        sourceLiteral(runtime.connectingPublicNode),
        literal(runtime.connectingPublicNode),
      ],
    ],
    "utxo-context": [
      ...common,
      selectedNetwork('${network.class("network")}'),
      [sourceLiteral(runtime.connectedTo), literal(runtime.connectedTo)],
      [
        compileCardinalPlural(
          utxo.receivedEvents,
          "events",
          "eventPluralRules",
          "eventNumberFormat",
        ),
        compileCardinalPlural(
          pseudoLocalizeMessage(utxo.receivedEvents),
          "events",
          "eventPluralRules",
          "eventNumberFormat",
        ),
      ],
      [
        `log(${sourceLiteral(runtime.event)}, event);`,
        `log(${literal(runtime.event)}, event);`,
      ],
      [
        sourceLiteral(utxo.noticeManyUtxos, { term: "UTXOs" }),
        JSON.stringify(pseudoMessage(utxo.noticeManyUtxos, { term: "UTXOs" })),
      ],
      [
        sourceLiteral(utxo.noticeManualTesting, {
          api: "UtxoProcessor",
          term: "UTXOs",
        }),
        JSON.stringify(
          pseudoMessage(utxo.noticeManualTesting, {
            api: "UtxoProcessor",
            term: "UTXOs",
          }),
        ),
      ],
      [
        `placeholder=" ${substituteMessage(utxo.addressPlaceholder, { network: "${network}" })}"`,
        `placeholder="${pseudoMessage(utxo.addressPlaceholder, { network: "${network}" })}"`,
      ],
      [utxo.monitorAddress, pseudoMessage(utxo.monitorAddress)],
      [`>${utxo.restart}<`, `>${pseudoMessage(utxo.restart)}<`],
      [sourceLiteral(utxo.trackingAddress), literal(utxo.trackingAddress)],
      [sourceLiteral(utxo.error), literal(utxo.error)],
      [sourceLiteral(utxo.restarting), literal(utxo.restarting)],
      [sourceLiteral(utxo.stoppingProcessor), literal(utxo.stoppingProcessor)],
      [sourceLiteral(utxo.startingProcessor), literal(utxo.startingProcessor)],
      [sourceLiteral(utxo.processorStarted), literal(utxo.processorStarted)],
    ],
  };
}

function buildUtilsReplacements(
  messages: BuildArtifactMessages,
): readonly Replacement[] {
  const { controls, runtime } = messages;
  return [
    [
      `<- ${controls.back}</a> | ${controls.network}:`,
      `<- ${pseudoMessage(controls.back)}</a> | ${pseudoMessage(controls.network)}:`,
    ],
    ['href="/build#try-live"', 'href="/en-XA/build#try-live"'],
    ["'/build'", "'/en-XA/build'", 2],
    ["'/build#try-live'", "'/en-XA/build#try-live'"],
    [
      `console.log(${sourceLiteral(runtime.networkConsole)},network);`,
      `console.log(${literal(runtime.networkConsole)},network);`,
    ],
    [
      `>${controls.disconnect}</a>`,
      `>${pseudoMessage(controls.disconnect)}</a>`,
      2,
    ],
    [`>${controls.reconnect}</a>`, `>${pseudoMessage(controls.reconnect)}</a>`],
    [
      sourceTemplate(` ${controls.connecting}`),
      template(controls.connecting, {}),
    ],
  ];
}

function generatePseudoHtml(
  name: (typeof BUILD_EXAMPLE_NAMES)[number],
  source: string,
  messages: BuildArtifactMessages,
) {
  let generated = replaceExactlyOnce(
    source,
    ['<html lang="en" dir="ltr">', '<html lang="en-XA" dir="ltr">'],
    `${name}.html`,
  );
  generated = replaceExactlyOnce(
    generated,
    ["from './resources/utils.js';", "from './resources/utils.en-XA.js';"],
    `${name}.html`,
  );

  for (const replacement of buildHtmlReplacements(messages)[name]) {
    generated = replaceExactlyOnce(generated, replacement, `${name}.html`);
  }

  return generated
    .replace(
      "<!DOCTYPE html>",
      "<!DOCTYPE html>\n<!-- Generated private pseudo artifact; do not edit. -->",
    )
    .replace(
      "    <head>",
      '    <head>\n        <meta name="robots" content="noindex, nofollow">',
    );
}

function generatePseudoUtils(
  source: string,
  messages: BuildArtifactMessages,
): string {
  let generated = source;
  for (const replacement of buildUtilsReplacements(messages)) {
    generated = replaceExactlyOnce(generated, replacement, SOURCE_UTILS_PATH);
  }
  return `// Generated private pseudo artifact; do not edit.\n${generated}`;
}

export function generatePseudoBuildArtifacts(
  sources: BuildExampleSources,
  messages: BuildArtifactMessages,
): GeneratedBuildExampleArtifacts {
  const artifacts: Record<string, string> = {};
  for (const name of BUILD_EXAMPLE_NAMES) {
    const sourcePath = `${name}.html`;
    const source = sources[sourcePath];
    if (source === undefined) throw new Error(`Missing source ${sourcePath}`);
    artifacts[`${name}.en-XA.html`] = generatePseudoHtml(
      name,
      source,
      messages,
    );
  }

  const sourceUtils = sources[SOURCE_UTILS_PATH];
  if (sourceUtils === undefined)
    throw new Error(`Missing source ${SOURCE_UTILS_PATH}`);
  artifacts["resources/utils.en-XA.js"] = generatePseudoUtils(
    sourceUtils,
    messages,
  );
  return artifacts;
}

function validateEnglishSources(sources: BuildExampleSources): string[] {
  const errors: string[] = [];
  for (const [path, expectedHash] of Object.entries(ENGLISH_SOURCE_SHA256)) {
    const source = sources[path];
    if (source === undefined) {
      errors.push(`missing English Build artifact source ${path}`);
      continue;
    }
    const actualHash = createHash("sha256").update(source).digest("hex");
    if (actualHash !== expectedHash) {
      errors.push(
        `${path} changed; review its human-readable string inventory and update the pseudo artifact contract`,
      );
    }
  }

  for (const name of BUILD_EXAMPLE_NAMES) {
    const path = `${name}.html`;
    const source = sources[path];
    if (!source?.includes('<html lang="en" dir="ltr">')) {
      errors.push(`${path} must declare static lang="en" and dir="ltr"`);
    }
    if (!source?.includes("from './resources/utils.js'")) {
      errors.push(`${path} must import the English shared controls`);
    }
  }

  const utils = sources[SOURCE_UTILS_PATH] ?? "";
  if (!utils.includes("from './return-path.mjs'")) {
    errors.push(`${SOURCE_UTILS_PATH} must import the return-path validator`);
  }
  if (
    !utils.includes(
      "new URLSearchParams(window.location.search).get('returnTo')",
    )
  ) {
    errors.push(
      `${SOURCE_UTILS_PATH} must read the validated returnTo parameter`,
    );
  }
  return errors;
}

export function validatePseudoBuildArtifacts(
  sources: BuildExampleSources,
  artifacts: GeneratedBuildExampleArtifacts,
): string[] {
  const errors = validateEnglishSources(sources);
  const actualPaths = Object.keys(artifacts).sort();
  const expectedPaths = [...PSEUDO_BUILD_EXAMPLE_PATHS].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    errors.push(
      `pseudo artifact set differs: expected ${expectedPaths.join(", ")}; received ${actualPaths.join(", ")}`,
    );
  }

  for (const name of BUILD_EXAMPLE_NAMES) {
    const path = `${name}.en-XA.html`;
    const artifact = artifacts[path] ?? "";
    if (!artifact.includes('<html lang="en-XA" dir="ltr">')) {
      errors.push(`${path} must declare static lang="en-XA" and dir="ltr"`);
    }
    if (!artifact.includes("from './resources/utils.en-XA.js'")) {
      errors.push(`${path} must import pseudo-localized shared controls`);
    }
    if (
      !artifact.includes('<meta name="robots" content="noindex, nofollow">')
    ) {
      errors.push(`${path} must block indexing and link following`);
    }
    if (
      /<(?:link[^>]+rel=["'](?:canonical|alternate)["']|meta[^>]+property=["']og:)/iu.test(
        artifact,
      )
    ) {
      errors.push(
        `${path} must not publish canonical, alternate, or OG metadata`,
      );
    }
    if (!artifact.includes("[!! ")) {
      errors.push(`${path} contains no visible pseudo-localized output`);
    }
  }

  const utils = artifacts["resources/utils.en-XA.js"] ?? "";
  for (const contract of [
    "'/en-XA/build'",
    "'/en-XA/build#try-live'",
    "resolveBuildExampleReturnPath",
    "[!! ",
  ]) {
    if (!utils.includes(contract)) {
      errors.push(
        `resources/utils.en-XA.js is missing ${JSON.stringify(contract)}`,
      );
    }
  }

  for (const [path, artifact] of Object.entries(artifacts)) {
    const sourcePath = path
      .replace(".en-XA.html", ".html")
      .replace("utils.en-XA.js", "utils.js");
    const source = sources[sourcePath] ?? "";
    for (const identifier of [
      "GetServerInfo",
      "GetBlockDagInfo",
      "RpcClient",
      "UtxoProcessor",
      "subscribeBlockAdded",
      "subscribeVirtualDaaScoreChanged",
      "mainnet",
      "testnet-10",
      "testnet-11",
    ]) {
      if (source.includes(identifier) && !artifact.includes(identifier)) {
        errors.push(`${path} changed required identifier ${identifier}`);
      }
    }
  }
  return errors;
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

export async function prepareVendoredBuildExamples(repositoryRoot: string) {
  const directory = examplesDirectory(repositoryRoot);
  const messages = await loadEnglishBuildArtifactMessages(repositoryRoot);
  const helperSource = await readFile(
    join(repositoryRoot, RETURN_PATH_SOURCE),
    "utf8",
  );
  await writeFile(join(directory, RETURN_PATH_RUNTIME), helperSource, "utf8");

  for (const name of BUILD_EXAMPLE_NAMES) {
    const path = join(directory, `${name}.html`);
    const source = await readFile(path, "utf8");
    const prepared = replaceExactlyOnce(
      source,
      ["<html>", '<html lang="en" dir="ltr">'],
      `${name}.html`,
    );
    await writeFile(path, prepared, "utf8");
  }

  const utxoPath = join(directory, "utxo-context.html");
  let utxo = await readFile(utxoPath, "utf8");
  const receivedEvents = compileCardinalPlural(
    messages.utxo.receivedEvents,
    "events",
    "eventPluralRules",
    "eventNumberFormat",
  );
  utxo = replacePatternExactlyOnce(
    utxo,
    /                let events = 0;\n                monitor\.processor\.addEventListener\(\(event\) => \{\n[\s\S]*?\n                \}\);/gu,
    `                let events = 0;
                const eventPluralRules = new Intl.PluralRules(document.documentElement.lang);
                const eventNumberFormat = new Intl.NumberFormat(document.documentElement.lang);
                monitor.processor.addEventListener((event) => {
                    document.getElementById("actions").innerHTML = ${receivedEvents};
                    log(${sourceLiteral(messages.runtime.event)}, event);
                    events += 1;
                });`,
    "utxo-context.html",
  );
  utxo = replacePatternExactlyOnce(
    utxo,
    /                log\(""\);\n[\s\S]*?\n(?=                let el = document\.createElement\("div"\);)/gu,
    `                log("");
                log(${sourceLiteral(messages.utxo.noticeManyUtxos, { term: "UTXOs" })});
                log("");
                log(${sourceLiteral(messages.utxo.noticeManualTesting, {
                  api: "UtxoProcessor",
                  term: "UTXOs",
                })});

`,
    "utxo-context.html",
  );
  await writeFile(utxoPath, utxo, "utf8");

  const utilsPath = join(directory, SOURCE_UTILS_PATH);
  let utils = await readFile(utilsPath, "utf8");
  utils = replaceExactlyOnce(
    utils,
    [
      '<a href="index.html"><- Back</a> | Network: <span id="menu"></span><span id="actions"></span><br>&nbsp;<br>',
      '<a id="back-link" href="/build#try-live"><- Back</a> | Network: <span id="menu"></span><span id="actions"></span><br>',
    ],
    SOURCE_UTILS_PATH,
  );
  utils = replaceExactlyOnce(
    utils,
    [
      "document.body.innerHTML =",
      "import { resolveBuildExampleReturnPath } from './return-path.mjs';\n\ndocument.body.innerHTML =",
    ],
    SOURCE_UTILS_PATH,
  );
  utils = replaceExactlyOnce(
    utils,
    [
      `document.addEventListener('DOMContentLoaded', () => {
    createMenu();
});`,
      ENGLISH_SETUP_BACK_LINK,
    ],
    SOURCE_UTILS_PATH,
  );
  await writeFile(utilsPath, utils, "utf8");
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
  const topLevel = await readdir(directory, { withFileTypes: true });
  const resources = await readdir(join(directory, "resources"), {
    withFileTypes: true,
  });
  return [
    ...topLevel
      .filter(
        (entry) =>
          entry.isFile() && localizedArtifactSourcePath(entry.name) !== null,
      )
      .map((entry) => entry.name),
    ...resources
      .filter(
        (entry) =>
          entry.isFile() &&
          localizedArtifactSourcePath(`resources/${entry.name}`) !== null,
      )
      .map((entry) => `resources/${entry.name}`),
  ].sort();
}

function assertNoUnexpectedLocalizedArtifacts(candidates: readonly string[]) {
  const expected = new Set<string>(PSEUDO_BUILD_EXAMPLE_PATHS);
  const unexpected = candidates.filter((path) => !expected.has(path));
  if (unexpected.length) {
    throw new Error(
      `Refusing to remove unexpected localized artifacts: ${unexpected.join(", ")}`,
    );
  }
}

export async function cleanPseudoBuildArtifacts(repositoryRoot: string) {
  const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
  assertNoUnexpectedLocalizedArtifacts(candidates);
  const directory = examplesDirectory(repositoryRoot);
  await Promise.all(
    PSEUDO_BUILD_EXAMPLE_PATHS.map(async (path) => {
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

export async function syncPseudoBuildArtifacts(
  repositoryRoot: string,
  buildTarget: I18nBuildTarget,
) {
  await cleanPseudoBuildArtifacts(repositoryRoot);
  await assertReturnPathRuntimeMatches(repositoryRoot);
  const [sources, messages] = await Promise.all([
    loadEnglishSources(repositoryRoot),
    loadEnglishBuildArtifactMessages(repositoryRoot),
  ]);
  const generated = generatePseudoBuildArtifacts(sources, messages);
  const regenerated = generatePseudoBuildArtifacts(sources, messages);
  const errors = validatePseudoBuildArtifacts(sources, generated);
  if (JSON.stringify(generated) !== JSON.stringify(regenerated)) {
    errors.push("pseudo build artifact generation is not deterministic");
  }
  if (errors.length) throw new Error(errors.join("\n"));

  if (buildTarget === "production") return;

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
    await cleanPseudoBuildArtifacts(repositoryRoot);
    throw error;
  }

  const written = await listLocalizedArtifactCandidates(repositoryRoot);
  if (
    JSON.stringify(written) !==
    JSON.stringify([...PSEUDO_BUILD_EXAMPLE_PATHS].sort())
  ) {
    throw new Error(
      `Generated pseudo artifact set is incomplete: ${written.join(", ")}`,
    );
  }
}

export async function checkPseudoBuildArtifacts(
  repositoryRoot: string,
  buildTarget: I18nBuildTarget,
) {
  if (buildTarget === "production") {
    await cleanPseudoBuildArtifacts(repositoryRoot);
  } else {
    const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
    assertNoUnexpectedLocalizedArtifacts(candidates);
  }
  await assertReturnPathRuntimeMatches(repositoryRoot);
  const [sources, messages] = await Promise.all([
    loadEnglishSources(repositoryRoot),
    loadEnglishBuildArtifactMessages(repositoryRoot),
  ]);
  const generated = generatePseudoBuildArtifacts(sources, messages);
  const errors = validatePseudoBuildArtifacts(sources, generated);
  if (errors.length) throw new Error(errors.join("\n"));

  const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
  if (buildTarget === "production") {
    if (candidates.length) {
      throw new Error(
        `Production contains private pseudo artifacts: ${candidates.join(", ")}`,
      );
    }
    return;
  }

  for (const [path, expected] of Object.entries(generated)) {
    let actual: string;
    try {
      actual = await readFile(
        join(examplesDirectory(repositoryRoot), path),
        "utf8",
      );
    } catch {
      throw new Error(`Missing generated pseudo artifact ${path}`);
    }
    if (actual !== expected)
      throw new Error(`Stale generated pseudo artifact ${path}`);
  }
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
  const { mode, command } = parseCli(process.argv.slice(2));
  const buildTarget = resolveI18nBuildTarget(
    process.env.NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET,
  );

  if (mode === "clean") {
    await cleanPseudoBuildArtifacts(repositoryRoot);
    console.log("private Build pseudo artifacts removed");
    return;
  }
  if (mode === "prepare-vendor") {
    await prepareVendoredBuildExamples(repositoryRoot);
    await syncPseudoBuildArtifacts(repositoryRoot, buildTarget);
    console.log(`Vendored Build artifacts prepared for ${buildTarget}`);
    return;
  }
  if (mode === "check") {
    await checkPseudoBuildArtifacts(repositoryRoot, buildTarget);
    console.log(`Build artifacts valid for ${buildTarget}`);
    return;
  }
  if (mode === "sync") {
    await syncPseudoBuildArtifacts(repositoryRoot, buildTarget);
    console.log(`Build artifacts synchronized for ${buildTarget}`);
    return;
  }

  if (mode === "build") {
    await syncPseudoBuildArtifacts(repositoryRoot, buildTarget);
    try {
      await runCommand(command[0], command.slice(1));
    } catch (error) {
      await cleanPseudoBuildArtifacts(repositoryRoot);
      throw error;
    }
    if (buildTarget === "production") {
      await cleanPseudoBuildArtifacts(repositoryRoot);
    }
    return;
  }

  await syncPseudoBuildArtifacts(repositoryRoot, buildTarget);
  try {
    await runCommand(command[0], command.slice(1));
  } finally {
    await cleanPseudoBuildArtifacts(repositoryRoot);
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
