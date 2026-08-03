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
export const SPANISH_BUILD_EXAMPLE_PATHS = [
  ...BUILD_EXAMPLE_NAMES.map((name) => `${name}.es.html`),
  "resources/utils.es.js",
] as const;
export const LOCALIZED_BUILD_EXAMPLE_PATHS = [
  ...PSEUDO_BUILD_EXAMPLE_PATHS,
  ...SPANISH_BUILD_EXAMPLE_PATHS,
] as const;

export const BUILD_EXAMPLES_PUBLIC_BASE_PATH =
  "/vendor/kaspa-wasm/2.0.0/examples/web";
export const PSEUDO_BUILD_EXAMPLE_URLS = PSEUDO_BUILD_EXAMPLE_PATHS.map(
  (path) => `${BUILD_EXAMPLES_PUBLIC_BASE_PATH}/${path}`,
);
export const SPANISH_BUILD_EXAMPLE_URLS = SPANISH_BUILD_EXAMPLE_PATHS.map(
  (path) => `${BUILD_EXAMPLES_PUBLIC_BASE_PATH}/${path}`,
);
export const LOCALIZED_BUILD_EXAMPLE_URLS = LOCALIZED_BUILD_EXAMPLE_PATHS.map(
  (path) => `${BUILD_EXAMPLES_PUBLIC_BASE_PATH}/${path}`,
);

export type BuildArtifactLocale = "en-XA" | "es";

const BUILD_ARTIFACT_LOCALES = ["en-XA", "es"] as const;

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

export async function loadBuildArtifactMessages(
  repositoryRoot: string,
  locale: "en" | "es",
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

export function loadEnglishBuildArtifactMessages(
  repositoryRoot: string,
): Promise<BuildArtifactMessages> {
  return loadBuildArtifactMessages(repositoryRoot, "en");
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

type MessageTransform = "identity" | "pseudo";

function localizedMessage(
  message: string,
  substitutions: Readonly<Record<string, string>>,
  transform: MessageTransform,
): string {
  return substituteMessage(
    transform === "pseudo" ? pseudoLocalizeMessage(message) : message,
    substitutions,
  );
}

function sourceLiteral(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return JSON.stringify(substituteMessage(message, substitutions));
}

function localizedLiteral(
  message: string,
  transform: MessageTransform,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return JSON.stringify(localizedMessage(message, substitutions, transform));
}

function localizedTemplate(
  message: string,
  substitutions: Readonly<Record<string, string>>,
  transform: MessageTransform,
): string {
  return `\`${localizedMessage(message, substitutions, transform)}\``;
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
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  transform: MessageTransform,
): Readonly<
  Record<(typeof BUILD_EXAMPLE_NAMES)[number], readonly Replacement[]>
> {
  const { runtime: sourceRuntime, utxo: sourceUtxo } = sourceMessages;
  const { runtime: targetRuntime, utxo: targetUtxo } = targetMessages;
  const common: readonly Replacement[] = [
    [
      sourceTemplate(sourceRuntime.connectingKaspaNetwork),
      localizedTemplate(targetRuntime.connectingKaspaNetwork, {}, transform),
    ],
  ];
  const selectedNetwork = (expression: string): Replacement => [
    sourceTemplate(sourceRuntime.selectedNetwork, { network: expression }),
    localizedTemplate(
      targetRuntime.selectedNetwork,
      { network: expression },
      transform,
    ),
  ];
  const apiMessage = (
    sourceMessage: string,
    targetMessage: string,
    api: "GetBlockDagInfo" | "GetServerInfo",
  ): Replacement => [
    sourceLiteral(sourceMessage, { api }),
    localizedLiteral(targetMessage, transform, { api }),
  ];

  return {
    "get-server-info": [
      ...common,
      selectedNetwork("${networkId}"),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedLiteral(targetRuntime.connectedTo, transform),
      ],
      apiMessage(
        sourceRuntime.apiRequest,
        targetRuntime.apiRequest,
        "GetServerInfo",
      ),
      apiMessage(
        sourceRuntime.apiResponse,
        targetRuntime.apiResponse,
        "GetServerInfo",
      ),
      [
        sourceLiteral(sourceRuntime.disconnected),
        localizedLiteral(targetRuntime.disconnected, transform),
      ],
    ],
    "get-block-dag-info": [
      ...common,
      selectedNetwork("${networkId}"),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedLiteral(targetRuntime.connectedTo, transform),
      ],
      apiMessage(
        sourceRuntime.apiRequest,
        targetRuntime.apiRequest,
        "GetBlockDagInfo",
      ),
      apiMessage(
        sourceRuntime.apiResponse,
        targetRuntime.apiResponse,
        "GetBlockDagInfo",
      ),
      [
        sourceLiteral(sourceRuntime.disconnected),
        localizedLiteral(targetRuntime.disconnected, transform),
      ],
    ],
    "subscribe-block-added": [
      ...common,
      selectedNetwork('${networkId.class("network")}'),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedLiteral(targetRuntime.connectedTo, transform),
      ],
      [
        sourceLiteral(sourceRuntime.subscribingEvent, {
          event: "Block Added",
        }),
        localizedLiteral(targetRuntime.subscribingEvent, transform, {
          event: "Block Added",
        }),
      ],
      [
        sourceLiteral(sourceRuntime.disconnectedFrom),
        localizedLiteral(targetRuntime.disconnectedFrom, transform),
      ],
      [
        `${sourceLiteral(sourceRuntime.disconnect)},event`,
        `${localizedLiteral(targetRuntime.disconnect, transform)},event`,
      ],
      [
        sourceLiteral(sourceRuntime.connectingPublicNode),
        localizedLiteral(targetRuntime.connectingPublicNode, transform),
      ],
    ],
    "subscribe-daa-changed": [
      ...common,
      selectedNetwork('${networkId.class("network")}'),
      [
        sourceLiteral(sourceRuntime.registeringProtocolNotifications, {
          protocol: "DAA",
        }),
        localizedLiteral(
          targetRuntime.registeringProtocolNotifications,
          transform,
          { protocol: "DAA" },
        ),
      ],
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedLiteral(targetRuntime.connectedTo, transform),
      ],
      [
        sourceLiteral(sourceRuntime.subscribingProtocolScore, {
          protocol: "DAA",
        }),
        localizedLiteral(targetRuntime.subscribingProtocolScore, transform, {
          protocol: "DAA",
        }),
      ],
      [
        sourceLiteral(sourceRuntime.disconnectedFrom),
        localizedLiteral(targetRuntime.disconnectedFrom, transform),
      ],
      [
        `${sourceLiteral(sourceRuntime.disconnect)},event`,
        `${localizedLiteral(targetRuntime.disconnect, transform)},event`,
      ],
      [
        sourceLiteral(sourceRuntime.connectingPublicNode),
        localizedLiteral(targetRuntime.connectingPublicNode, transform),
      ],
    ],
    "utxo-context": [
      ...common,
      selectedNetwork('${network.class("network")}'),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedLiteral(targetRuntime.connectedTo, transform),
      ],
      [
        compileCardinalPlural(
          sourceUtxo.receivedEvents,
          "events",
          "eventPluralRules",
          "eventNumberFormat",
        ),
        compileCardinalPlural(
          transform === "pseudo"
            ? pseudoLocalizeMessage(targetUtxo.receivedEvents)
            : targetUtxo.receivedEvents,
          "events",
          "eventPluralRules",
          "eventNumberFormat",
        ),
      ],
      [
        `log(${sourceLiteral(sourceRuntime.event)}, event);`,
        `log(${localizedLiteral(targetRuntime.event, transform)}, event);`,
      ],
      [
        sourceLiteral(sourceUtxo.noticeManyUtxos, { term: "UTXOs" }),
        localizedLiteral(targetUtxo.noticeManyUtxos, transform, {
          term: "UTXOs",
        }),
      ],
      [
        sourceLiteral(sourceUtxo.noticeManualTesting, {
          api: "UtxoProcessor",
          term: "UTXOs",
        }),
        localizedLiteral(targetUtxo.noticeManualTesting, transform, {
          api: "UtxoProcessor",
          term: "UTXOs",
        }),
      ],
      [
        `placeholder=" ${substituteMessage(sourceUtxo.addressPlaceholder, { network: "${network}" })}"`,
        `placeholder="${localizedMessage(targetUtxo.addressPlaceholder, { network: "${network}" }, transform)}"`,
      ],
      [
        sourceUtxo.monitorAddress,
        localizedMessage(targetUtxo.monitorAddress, {}, transform),
      ],
      [
        `>${sourceUtxo.restart}<`,
        `>${localizedMessage(targetUtxo.restart, {}, transform)}<`,
      ],
      [
        sourceLiteral(sourceUtxo.trackingAddress),
        localizedLiteral(targetUtxo.trackingAddress, transform),
      ],
      [
        sourceLiteral(sourceUtxo.error),
        localizedLiteral(targetUtxo.error, transform),
      ],
      [
        sourceLiteral(sourceUtxo.restarting),
        localizedLiteral(targetUtxo.restarting, transform),
      ],
      [
        sourceLiteral(sourceUtxo.stoppingProcessor),
        localizedLiteral(targetUtxo.stoppingProcessor, transform),
      ],
      [
        sourceLiteral(sourceUtxo.startingProcessor),
        localizedLiteral(targetUtxo.startingProcessor, transform),
      ],
      [
        sourceLiteral(sourceUtxo.processorStarted),
        localizedLiteral(targetUtxo.processorStarted, transform),
      ],
    ],
  };
}

function buildUtilsReplacements(
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
  transform: MessageTransform,
): readonly Replacement[] {
  const { controls: sourceControls, runtime: sourceRuntime } = sourceMessages;
  const { controls: targetControls, runtime: targetRuntime } = targetMessages;
  const localizedBuildPath = `/${locale}/build`;
  return [
    [
      `<- ${sourceControls.back}</a> | ${sourceControls.network}:`,
      `<- ${localizedMessage(targetControls.back, {}, transform)}</a> | ${localizedMessage(targetControls.network, {}, transform)}:`,
    ],
    ['href="/build#try-live"', `href="${localizedBuildPath}#try-live"`],
    ["'/build'", `'${localizedBuildPath}'`, 2],
    ["'/build#try-live'", `'${localizedBuildPath}#try-live'`],
    [
      `console.log(${sourceLiteral(sourceRuntime.networkConsole)},network);`,
      `console.log(${localizedLiteral(targetRuntime.networkConsole, transform)},network);`,
    ],
    [
      `>${sourceControls.disconnect}</a>`,
      `>${localizedMessage(targetControls.disconnect, {}, transform)}</a>`,
      2,
    ],
    [
      `>${sourceControls.reconnect}</a>`,
      `>${localizedMessage(targetControls.reconnect, {}, transform)}</a>`,
    ],
    [
      sourceTemplate(` ${sourceControls.connecting}`),
      localizedTemplate(targetControls.connecting, {}, transform),
    ],
  ];
}

function artifactTransform(locale: BuildArtifactLocale): MessageTransform {
  return locale === "en-XA" ? "pseudo" : "identity";
}

function localizedArtifactPaths(
  locale: BuildArtifactLocale,
): readonly string[] {
  return locale === "en-XA"
    ? PSEUDO_BUILD_EXAMPLE_PATHS
    : SPANISH_BUILD_EXAMPLE_PATHS;
}

function generateLocalizedHtml(
  name: (typeof BUILD_EXAMPLE_NAMES)[number],
  source: string,
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
) {
  const transform = artifactTransform(locale);
  let generated = replaceExactlyOnce(
    source,
    ['<html lang="en" dir="ltr">', `<html lang="${locale}" dir="ltr">`],
    `${name}.html`,
  );
  generated = replaceExactlyOnce(
    generated,
    ["from './resources/utils.js';", `from './resources/utils.${locale}.js';`],
    `${name}.html`,
  );

  for (const replacement of buildHtmlReplacements(
    sourceMessages,
    targetMessages,
    transform,
  )[name]) {
    generated = replaceExactlyOnce(generated, replacement, `${name}.html`);
  }

  return generated
    .replace(
      "<!DOCTYPE html>",
      `<!DOCTYPE html>\n<!-- Generated ${locale} Build artifact; do not edit. -->`,
    )
    .replace(
      "    <head>",
      '    <head>\n        <meta name="robots" content="noindex, nofollow">',
    );
}

function generateLocalizedUtils(
  source: string,
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
): string {
  let generated = source;
  for (const replacement of buildUtilsReplacements(
    sourceMessages,
    targetMessages,
    locale,
    artifactTransform(locale),
  )) {
    generated = replaceExactlyOnce(generated, replacement, SOURCE_UTILS_PATH);
  }
  return `// Generated ${locale} Build artifact; do not edit.\n${generated}`;
}

export function generateLocalizedBuildArtifacts(
  sources: BuildExampleSources,
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
): GeneratedBuildExampleArtifacts {
  const artifacts: Record<string, string> = {};
  for (const name of BUILD_EXAMPLE_NAMES) {
    const sourcePath = `${name}.html`;
    const source = sources[sourcePath];
    if (source === undefined) throw new Error(`Missing source ${sourcePath}`);
    artifacts[`${name}.${locale}.html`] = generateLocalizedHtml(
      name,
      source,
      sourceMessages,
      targetMessages,
      locale,
    );
  }

  const sourceUtils = sources[SOURCE_UTILS_PATH];
  if (sourceUtils === undefined)
    throw new Error(`Missing source ${SOURCE_UTILS_PATH}`);
  artifacts[`resources/utils.${locale}.js`] = generateLocalizedUtils(
    sourceUtils,
    sourceMessages,
    targetMessages,
    locale,
  );
  return artifacts;
}

export function generatePseudoBuildArtifacts(
  sources: BuildExampleSources,
  messages: BuildArtifactMessages,
): GeneratedBuildExampleArtifacts {
  return generateLocalizedBuildArtifacts(sources, messages, messages, "en-XA");
}

export function generateSpanishBuildArtifacts(
  sources: BuildExampleSources,
  englishMessages: BuildArtifactMessages,
  spanishMessages: BuildArtifactMessages,
): GeneratedBuildExampleArtifacts {
  return generateLocalizedBuildArtifacts(
    sources,
    englishMessages,
    spanishMessages,
    "es",
  );
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
        `${path} changed; review its human-readable string inventory and update the localized artifact contract`,
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

export function validateLocalizedBuildArtifacts(
  sources: BuildExampleSources,
  artifacts: GeneratedBuildExampleArtifacts,
  locale: BuildArtifactLocale,
): string[] {
  const errors = validateEnglishSources(sources);
  const actualPaths = Object.keys(artifacts).sort();
  const expectedPaths = [...localizedArtifactPaths(locale)].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    errors.push(
      `${locale} artifact set differs: expected ${expectedPaths.join(", ")}; received ${actualPaths.join(", ")}`,
    );
  }

  for (const name of BUILD_EXAMPLE_NAMES) {
    const path = `${name}.${locale}.html`;
    const artifact = artifacts[path] ?? "";
    if (!artifact.includes(`<html lang="${locale}" dir="ltr">`)) {
      errors.push(`${path} must declare static lang="${locale}" and dir="ltr"`);
    }
    if (!artifact.includes(`from './resources/utils.${locale}.js'`)) {
      errors.push(`${path} must import ${locale} shared controls`);
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
    if (locale === "en-XA" && !artifact.includes("[!! ")) {
      errors.push(`${path} contains no visible pseudo-localized output`);
    }
    if (locale === "es" && artifact.includes("[!! ")) {
      errors.push(`${path} must contain Spanish rather than pseudo output`);
    }
  }

  const utilsPath = `resources/utils.${locale}.js`;
  const utils = artifacts[utilsPath] ?? "";
  for (const contract of [
    `'/${locale}/build'`,
    `'/${locale}/build#try-live'`,
    "resolveBuildExampleReturnPath",
    ...(locale === "en-XA" ? ["[!! "] : []),
  ]) {
    if (!utils.includes(contract)) {
      errors.push(`${utilsPath} is missing ${JSON.stringify(contract)}`);
    }
  }
  if (locale === "es" && utils.includes("[!! ")) {
    errors.push(`${utilsPath} must contain Spanish rather than pseudo output`);
  }

  for (const [path, artifact] of Object.entries(artifacts)) {
    const sourcePath = path
      .replace(`.${locale}.html`, ".html")
      .replace(`utils.${locale}.js`, "utils.js");
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

export function validatePseudoBuildArtifacts(
  sources: BuildExampleSources,
  artifacts: GeneratedBuildExampleArtifacts,
): string[] {
  return validateLocalizedBuildArtifacts(sources, artifacts, "en-XA");
}

export function validateSpanishBuildArtifacts(
  sources: BuildExampleSources,
  artifacts: GeneratedBuildExampleArtifacts,
): string[] {
  return validateLocalizedBuildArtifacts(sources, artifacts, "es");
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

export async function cleanLocalizedBuildArtifacts(repositoryRoot: string) {
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

export async function syncLocalizedBuildArtifacts(
  repositoryRoot: string,
  buildTarget: I18nBuildTarget,
) {
  await cleanLocalizedBuildArtifacts(repositoryRoot);
  await assertReturnPathRuntimeMatches(repositoryRoot);
  const [sources, englishMessages, spanishMessages] = await Promise.all([
    loadEnglishSources(repositoryRoot),
    loadEnglishBuildArtifactMessages(repositoryRoot),
    loadBuildArtifactMessages(repositoryRoot, "es"),
  ]);
  const generatedByLocale = {
    "en-XA": generatePseudoBuildArtifacts(sources, englishMessages),
    es: generateSpanishBuildArtifacts(
      sources,
      englishMessages,
      spanishMessages,
    ),
  } satisfies Record<BuildArtifactLocale, GeneratedBuildExampleArtifacts>;
  const regeneratedByLocale = {
    "en-XA": generatePseudoBuildArtifacts(sources, englishMessages),
    es: generateSpanishBuildArtifacts(
      sources,
      englishMessages,
      spanishMessages,
    ),
  } satisfies Record<BuildArtifactLocale, GeneratedBuildExampleArtifacts>;
  const generated: Record<string, string> = Object.assign(
    {},
    ...Object.values(generatedByLocale),
  );
  const regenerated = Object.assign({}, ...Object.values(regeneratedByLocale));
  const errors = BUILD_ARTIFACT_LOCALES.flatMap((locale) =>
    validateLocalizedBuildArtifacts(sources, generatedByLocale[locale], locale),
  );
  if (JSON.stringify(generated) !== JSON.stringify(regenerated)) {
    errors.push("localized Build artifact generation is not deterministic");
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
    await cleanLocalizedBuildArtifacts(repositoryRoot);
    throw error;
  }

  const written = await listLocalizedArtifactCandidates(repositoryRoot);
  if (
    JSON.stringify(written) !==
    JSON.stringify([...LOCALIZED_BUILD_EXAMPLE_PATHS].sort())
  ) {
    throw new Error(
      `Generated localized artifact set is incomplete: ${written.join(", ")}`,
    );
  }
}

export async function checkLocalizedBuildArtifacts(
  repositoryRoot: string,
  buildTarget: I18nBuildTarget,
) {
  if (buildTarget === "production") {
    await cleanLocalizedBuildArtifacts(repositoryRoot);
  } else {
    const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
    assertNoUnexpectedLocalizedArtifacts(candidates);
  }
  await assertReturnPathRuntimeMatches(repositoryRoot);
  const [sources, englishMessages, spanishMessages] = await Promise.all([
    loadEnglishSources(repositoryRoot),
    loadEnglishBuildArtifactMessages(repositoryRoot),
    loadBuildArtifactMessages(repositoryRoot, "es"),
  ]);
  const generatedByLocale = {
    "en-XA": generatePseudoBuildArtifacts(sources, englishMessages),
    es: generateSpanishBuildArtifacts(
      sources,
      englishMessages,
      spanishMessages,
    ),
  } satisfies Record<BuildArtifactLocale, GeneratedBuildExampleArtifacts>;
  const generated: Record<string, string> = Object.assign(
    {},
    ...Object.values(generatedByLocale),
  );
  const errors = BUILD_ARTIFACT_LOCALES.flatMap((locale) =>
    validateLocalizedBuildArtifacts(sources, generatedByLocale[locale], locale),
  );
  if (errors.length) throw new Error(errors.join("\n"));

  const candidates = await listLocalizedArtifactCandidates(repositoryRoot);
  if (buildTarget === "production") {
    if (candidates.length) {
      throw new Error(
        `Production contains disabled localized artifacts: ${candidates.join(", ")}`,
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
      throw new Error(`Missing generated localized artifact ${path}`);
    }
    if (actual !== expected)
      throw new Error(`Stale generated localized artifact ${path}`);
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
    await cleanLocalizedBuildArtifacts(repositoryRoot);
    console.log("generated localized Build artifacts removed");
    return;
  }
  if (mode === "prepare-vendor") {
    await prepareVendoredBuildExamples(repositoryRoot);
    await syncLocalizedBuildArtifacts(repositoryRoot, buildTarget);
    console.log(`Vendored Build artifacts prepared for ${buildTarget}`);
    return;
  }
  if (mode === "check") {
    await checkLocalizedBuildArtifacts(repositoryRoot, buildTarget);
    console.log(`Build artifacts valid for ${buildTarget}`);
    return;
  }
  if (mode === "sync") {
    await syncLocalizedBuildArtifacts(repositoryRoot, buildTarget);
    console.log(`Build artifacts synchronized for ${buildTarget}`);
    return;
  }

  if (mode === "build") {
    await syncLocalizedBuildArtifacts(repositoryRoot, buildTarget);
    try {
      await runCommand(command[0], command.slice(1));
    } catch (error) {
      await cleanLocalizedBuildArtifacts(repositoryRoot);
      throw error;
    }
    if (buildTarget === "production") {
      await cleanLocalizedBuildArtifacts(repositoryRoot);
    }
    return;
  }

  await syncLocalizedBuildArtifacts(repositoryRoot, buildTarget);
  try {
    await runCommand(command[0], command.slice(1));
  } finally {
    await cleanLocalizedBuildArtifacts(repositoryRoot);
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
