import { createHash } from "node:crypto";

import {
  isLiteralElement,
  isPluralElement,
  isPoundElement,
  parse,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

import type { TextDirection } from "../../src/i18n/locale-registry.ts";
import {
  buildExampleContract,
  type BuildArtifactLocale,
  type BuildExampleName,
} from "../../src/i18n/build-example-contract.ts";

const BUILD_EXAMPLE_NAMES: readonly BuildExampleName[] =
  buildExampleContract.examples.map(({ name }) => name);
const SOURCE_UTILS_PATH = "resources/utils.js";

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
    subscribingBlockAdded: string;
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
      throw new Error(`Missing message placeholder ${placeholder}`);
    }
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

function javascriptStringLiteral(value: string): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function escapeJavaScriptTemplateText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${")
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeTemplateMessage(
  message: string,
  substitutions: Readonly<Record<string, string>>,
  encodeLiteral: (value: string) => string,
): string {
  const placeholders = Object.entries(substitutions).map(
    ([name, value]) => [`{${name}}`, value] as const,
  );
  const used = new Set<string>();
  let cursor = 0;
  let result = "";

  while (cursor < message.length) {
    let next: (typeof placeholders)[number] | undefined;
    let nextIndex = -1;
    for (const placeholder of placeholders) {
      const index = message.indexOf(placeholder[0], cursor);
      if (index !== -1 && (nextIndex === -1 || index < nextIndex)) {
        next = placeholder;
        nextIndex = index;
      }
    }
    if (!next) break;

    result += encodeLiteral(message.slice(cursor, nextIndex));
    result += next[1];
    used.add(next[0]);
    cursor = nextIndex + next[0].length;
  }

  result += encodeLiteral(message.slice(cursor));
  for (const [placeholder] of placeholders) {
    if (!used.has(placeholder)) {
      throw new Error(`Missing message placeholder ${placeholder}`);
    }
  }
  return result;
}

function localizedHtmlTemplateText(
  message: string,
  substitutions: Readonly<Record<string, string>>,
): string {
  return encodeTemplateMessage(message, substitutions, (value) =>
    escapeJavaScriptTemplateText(escapeHtml(value)),
  );
}

function localizedHtmlLiteral(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return javascriptStringLiteral(
    escapeHtml(substituteMessage(message, substitutions)),
  );
}

function localizedHtmlTemplate(
  message: string,
  substitutions: Readonly<Record<string, string>>,
): string {
  return `\`${localizedHtmlTemplateText(message, substitutions)}\``;
}

function sourceLiteral(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return javascriptStringLiteral(substituteMessage(message, substitutions));
}

function sourceHtmlLiteral(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return javascriptStringLiteral(
    escapeHtml(substituteMessage(message, substitutions)),
  );
}

function localizedLiteral(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return javascriptStringLiteral(substituteMessage(message, substitutions));
}

function sourceTemplate(
  message: string,
  substitutions: Readonly<Record<string, string>> = {},
): string {
  return `\`${encodeTemplateMessage(
    message,
    substitutions,
    escapeJavaScriptTemplateText,
  )}\``;
}

function compilePluralBranch(
  elements: readonly MessageFormatElement[],
  numberFormatExpression: string,
  countExpression: string,
  encodeLiteral: (value: string) => string,
): string {
  const parts = elements.map((element) => {
    if (isLiteralElement(element))
      return javascriptStringLiteral(encodeLiteral(element.value));
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
  encodeLiteral: (value: string) => string = (value) => value,
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
    !plural.options.other ||
    !ast.slice(0, pluralIndex).every(isLiteralElement) ||
    !ast.slice(pluralIndex + 1).every(isLiteralElement)
  ) {
    throw new Error(
      "artifacts.utxo.receivedEvents must be a cardinal count plural with an other branch",
    );
  }

  const prefix = ast.slice(0, pluralIndex);
  const suffix = ast.slice(pluralIndex + 1);
  const compileOption = (key: string) =>
    compilePluralBranch(
      [...prefix, ...plural.options[key].value, ...suffix],
      numberFormatExpression,
      countExpression,
      encodeLiteral,
    );
  const fallback = compileOption("other");
  const exactOptions = Object.keys(plural.options)
    .filter((key) => key.startsWith("="))
    .map((selector) => {
      const value = Number(selector.slice(1));
      if (!Number.isFinite(value)) {
        throw new Error(
          `artifacts.utxo.receivedEvents has unsupported exact selector ${selector}`,
        );
      }
      return {
        literal: javascriptStringLiteral(selector.slice(1)),
        selector,
        value,
      };
    })
    .sort((left, right) => left.value - right.value);
  const categoryOptions = Object.keys(plural.options)
    .filter((key) => key !== "other" && !key.startsWith("="))
    .sort();
  if (
    exactOptions.length === 0 &&
    categoryOptions.length === 1 &&
    categoryOptions[0] === "one"
  ) {
    return `${pluralRulesExpression}.select(${countExpression}) === "one" ? ${compileOption("one")} : ${fallback}`;
  }
  const categoryExpression = categoryOptions.reduceRight(
    (next, category) =>
      `pluralCategory === ${javascriptStringLiteral(category)} ? ${compileOption(category)} : ${next}`,
    fallback,
  );
  const selectedCategory = categoryOptions.length
    ? `((pluralCategory) => ${categoryExpression})(${pluralRulesExpression}.select(${countExpression}))`
    : fallback;
  return exactOptions.reduceRight(
    (next, exact) =>
      `String(${countExpression}) === ${exact.literal} ? ${compileOption(exact.selector)} : ${next}`,
    selectedCategory,
  );
}

function buildHtmlReplacements(
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
): Readonly<
  Record<(typeof BUILD_EXAMPLE_NAMES)[number], readonly Replacement[]>
> {
  const { runtime: sourceRuntime, utxo: sourceUtxo } = sourceMessages;
  const { runtime: targetRuntime, utxo: targetUtxo } = targetMessages;
  const common: readonly Replacement[] = [
    [
      sourceTemplate(sourceRuntime.connectingKaspaNetwork),
      localizedHtmlTemplate(targetRuntime.connectingKaspaNetwork, {}),
    ],
  ];
  const selectedNetwork = (expression: string): Replacement => [
    sourceTemplate(sourceRuntime.selectedNetwork, { network: expression }),
    localizedHtmlTemplate(targetRuntime.selectedNetwork, {
      network: expression,
    }),
  ];
  const apiMessage = (
    sourceMessage: string,
    targetMessage: string,
    api: "GetBlockDagInfo" | "GetServerInfo",
  ): Replacement => [
    sourceLiteral(sourceMessage, { api }),
    localizedHtmlLiteral(targetMessage, { api }),
  ];

  return {
    "get-server-info": [
      ...common,
      selectedNetwork("${networkId}"),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedHtmlLiteral(targetRuntime.connectedTo),
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
        localizedHtmlLiteral(targetRuntime.disconnected),
      ],
    ],
    "get-block-dag-info": [
      ...common,
      selectedNetwork("${networkId}"),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedHtmlLiteral(targetRuntime.connectedTo),
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
        localizedHtmlLiteral(targetRuntime.disconnected),
      ],
    ],
    "subscribe-block-added": [
      ...common,
      selectedNetwork('${networkId.class("network")}'),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedHtmlLiteral(targetRuntime.connectedTo),
      ],
      [
        sourceLiteral(sourceRuntime.subscribingBlockAdded),
        localizedHtmlLiteral(targetRuntime.subscribingBlockAdded),
      ],
      [
        sourceLiteral(sourceRuntime.disconnectedFrom),
        localizedHtmlLiteral(targetRuntime.disconnectedFrom),
      ],
      [
        `${sourceLiteral(sourceRuntime.disconnect)},event`,
        `${localizedHtmlLiteral(targetRuntime.disconnect)},event`,
      ],
      [
        sourceLiteral(sourceRuntime.connectingPublicNode),
        localizedHtmlLiteral(targetRuntime.connectingPublicNode),
      ],
    ],
    "subscribe-daa-changed": [
      ...common,
      selectedNetwork('${networkId.class("network")}'),
      [
        sourceLiteral(sourceRuntime.registeringProtocolNotifications, {
          protocol: "DAA",
        }),
        localizedHtmlLiteral(targetRuntime.registeringProtocolNotifications, {
          protocol: "DAA",
        }),
      ],
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedHtmlLiteral(targetRuntime.connectedTo),
      ],
      [
        sourceLiteral(sourceRuntime.subscribingProtocolScore, {
          protocol: "DAA",
        }),
        localizedHtmlLiteral(targetRuntime.subscribingProtocolScore, {
          protocol: "DAA",
        }),
      ],
      [
        sourceLiteral(sourceRuntime.disconnectedFrom),
        localizedHtmlLiteral(targetRuntime.disconnectedFrom),
      ],
      [
        `${sourceLiteral(sourceRuntime.disconnect)},event`,
        `${localizedHtmlLiteral(targetRuntime.disconnect)},event`,
      ],
      [
        sourceLiteral(sourceRuntime.connectingPublicNode),
        localizedHtmlLiteral(targetRuntime.connectingPublicNode),
      ],
    ],
    "utxo-context": [
      ...common,
      selectedNetwork('${network.class("network")}'),
      [
        sourceLiteral(sourceRuntime.connectedTo),
        localizedHtmlLiteral(targetRuntime.connectedTo),
      ],
      [
        compileCardinalPlural(
          sourceUtxo.receivedEvents,
          "events",
          "eventPluralRules",
          "eventNumberFormat",
          escapeHtml,
        ),
        compileCardinalPlural(
          targetUtxo.receivedEvents,
          "events",
          "eventPluralRules",
          "eventNumberFormat",
          escapeHtml,
        ),
      ],
      [
        `log(${sourceHtmlLiteral(sourceRuntime.event)}, event);`,
        `log(${localizedHtmlLiteral(targetRuntime.event)}, event);`,
      ],
      [
        sourceHtmlLiteral(sourceUtxo.noticeManyUtxos, { term: "UTXOs" }),
        localizedHtmlLiteral(targetUtxo.noticeManyUtxos, {
          term: "UTXOs",
        }),
      ],
      [
        sourceHtmlLiteral(sourceUtxo.noticeManualTesting, {
          api: "UtxoProcessor",
          term: "UTXOs",
        }),
        localizedHtmlLiteral(targetUtxo.noticeManualTesting, {
          api: "UtxoProcessor",
          term: "UTXOs",
        }),
      ],
      [
        `placeholder=" ${substituteMessage(sourceUtxo.addressPlaceholder, { network: "${network}" })}"`,
        `placeholder="${localizedHtmlTemplateText(
          targetUtxo.addressPlaceholder,
          { network: "${network}" },
        )}"`,
      ],
      [
        sourceUtxo.monitorAddress,
        localizedHtmlTemplateText(targetUtxo.monitorAddress, {}),
      ],
      [
        `>${sourceUtxo.restart}<`,
        `>${localizedHtmlTemplateText(targetUtxo.restart, {})}<`,
      ],
      [
        sourceLiteral(sourceUtxo.trackingAddress),
        localizedHtmlLiteral(targetUtxo.trackingAddress),
      ],
      [sourceLiteral(sourceUtxo.error), localizedHtmlLiteral(targetUtxo.error)],
      [
        sourceLiteral(sourceUtxo.restarting),
        localizedHtmlLiteral(targetUtxo.restarting),
      ],
      [
        sourceLiteral(sourceUtxo.stoppingProcessor),
        localizedHtmlLiteral(targetUtxo.stoppingProcessor),
      ],
      [
        sourceLiteral(sourceUtxo.startingProcessor),
        localizedHtmlLiteral(targetUtxo.startingProcessor),
      ],
      [
        sourceLiteral(sourceUtxo.processorStarted),
        localizedHtmlLiteral(targetUtxo.processorStarted),
      ],
    ],
  };
}

function buildUtilsReplacements(
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
): readonly Replacement[] {
  const { controls: sourceControls, runtime: sourceRuntime } = sourceMessages;
  const { controls: targetControls, runtime: targetRuntime } = targetMessages;
  const localizedBuildPath = `/${locale}/build`;
  return [
    [
      `<- ${sourceControls.back}</a> | ${sourceControls.network}:`,
      `<- ${localizedHtmlTemplateText(
        targetControls.back,
        {},
      )}</a> | ${localizedHtmlTemplateText(targetControls.network, {})}:`,
    ],
    ['href="/build#try-live"', `href="${localizedBuildPath}#try-live"`],
    ["'/build'", `'${localizedBuildPath}'`, 2],
    ["'/build#try-live'", `'${localizedBuildPath}#try-live'`],
    [
      `console.log(${sourceLiteral(sourceRuntime.networkConsole)},network);`,
      `console.log(${localizedLiteral(targetRuntime.networkConsole)},network);`,
    ],
    [
      `>${sourceControls.disconnect}</a>`,
      `>${localizedHtmlTemplateText(targetControls.disconnect, {})}</a>`,
      2,
    ],
    [
      `>${sourceControls.reconnect}</a>`,
      `>${localizedHtmlTemplateText(targetControls.reconnect, {})}</a>`,
    ],
    [
      sourceTemplate(` ${sourceControls.connecting}`),
      `\` ${localizedHtmlTemplateText(targetControls.connecting, {})}\``,
    ],
  ];
}

function localizedArtifactPaths(
  locale: BuildArtifactLocale,
): readonly string[] {
  return buildExampleContract.artifactManifest.pathsByLocale[locale];
}

function generateLocalizedHtml(
  name: (typeof BUILD_EXAMPLE_NAMES)[number],
  source: string,
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
  direction: TextDirection,
) {
  let generated = replaceExactlyOnce(
    source,
    [
      '<html lang="en" dir="ltr">',
      `<html lang="${locale}" dir="${direction}">`,
    ],
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
  )) {
    generated = replaceExactlyOnce(generated, replacement, SOURCE_UTILS_PATH);
  }
  return `// Generated ${locale} Build artifact; do not edit.\n${generated}`;
}

function generateLocalizedBuildArtifacts(
  sources: BuildExampleSources,
  sourceMessages: BuildArtifactMessages,
  targetMessages: BuildArtifactMessages,
  locale: BuildArtifactLocale,
  direction: TextDirection,
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
      direction,
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

function validateLocalizedBuildArtifacts(
  sources: BuildExampleSources,
  artifacts: GeneratedBuildExampleArtifacts,
  locale: BuildArtifactLocale,
  direction: TextDirection,
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
    if (!artifact.includes(`<html lang="${locale}" dir="${direction}">`)) {
      errors.push(
        `${path} must declare static lang="${locale}" and dir="${direction}"`,
      );
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
  }

  const utilsPath = `resources/utils.${locale}.js`;
  const utils = artifacts[utilsPath] ?? "";
  for (const contract of [
    `'/${locale}/build'`,
    `'/${locale}/build#try-live'`,
    "resolveBuildExampleReturnPath",
  ]) {
    if (!utils.includes(contract)) {
      errors.push(`${utilsPath} is missing ${JSON.stringify(contract)}`);
    }
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

export type BuildExampleCompilerTarget = Readonly<{
  locale: BuildArtifactLocale;
  direction: TextDirection;
  messages: BuildArtifactMessages;
}>;

export type BuildExampleCompilerInput = Readonly<{
  sources: BuildExampleSources;
  englishMessages: BuildArtifactMessages;
  targets: readonly BuildExampleCompilerTarget[];
}>;

export type BuildExampleCompilation = Readonly<{
  generated: GeneratedBuildExampleArtifacts;
  expectedPaths: readonly string[];
}>;

export function prepareBuildExampleVendorSources(
  sources: BuildExampleSources,
  messages: BuildArtifactMessages,
): BuildExampleSources {
  const prepared: Record<string, string> = { ...sources };

  for (const name of BUILD_EXAMPLE_NAMES) {
    const sourcePath = `${name}.html`;
    const source = sources[sourcePath];
    if (source === undefined) throw new Error(`Missing source ${sourcePath}`);
    prepared[sourcePath] = replaceExactlyOnce(
      source,
      ["<html>", '<html lang="en" dir="ltr">'],
      sourcePath,
    );
  }

  let utxo = prepared["utxo-context.html"];
  if (utxo === undefined) throw new Error("Missing source utxo-context.html");
  const receivedEvents = compileCardinalPlural(
    messages.utxo.receivedEvents,
    "events",
    "eventPluralRules",
    "eventNumberFormat",
    escapeHtml,
  );
  utxo = replacePatternExactlyOnce(
    utxo,
    /                let events = 0;\n                monitor\.processor\.addEventListener\(\(event\) => \{\n[\s\S]*?\n                \}\);/gu,
    `                let events = 0;
                const eventPluralRules = new Intl.PluralRules(document.documentElement.lang);
                const eventNumberFormat = new Intl.NumberFormat(document.documentElement.lang);
                monitor.processor.addEventListener((event) => {
                    document.getElementById("actions").innerHTML = ${receivedEvents};
                    log(${sourceHtmlLiteral(messages.runtime.event)}, event);
                    events += 1;
                });`,
    "utxo-context.html",
  );
  utxo = replacePatternExactlyOnce(
    utxo,
    /                log\(""\);\n[\s\S]*?\n(?=                let el = document\.createElement\("div"\);)/gu,
    `                log("");
                log(${sourceHtmlLiteral(messages.utxo.noticeManyUtxos, { term: "UTXOs" })});
                log("");
                log(${sourceHtmlLiteral(messages.utxo.noticeManualTesting, {
                  api: "UtxoProcessor",
                  term: "UTXOs",
                })});

`,
    "utxo-context.html",
  );
  prepared["utxo-context.html"] = utxo;

  let utils = prepared[SOURCE_UTILS_PATH];
  if (utils === undefined)
    throw new Error(`Missing source ${SOURCE_UTILS_PATH}`);
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
  prepared[SOURCE_UTILS_PATH] = replaceExactlyOnce(
    utils,
    [
      `document.addEventListener('DOMContentLoaded', () => {
    createMenu();
});`,
      ENGLISH_SETUP_BACK_LINK,
    ],
    SOURCE_UTILS_PATH,
  );

  return prepared;
}

export function compileBuildExampleArtifacts({
  sources,
  englishMessages,
  targets,
}: BuildExampleCompilerInput): BuildExampleCompilation {
  const targetLocales = targets.map(({ locale }) => locale);
  const expectedLocales = [...buildExampleContract.artifactManifest.locales];
  if (
    new Set(targetLocales).size !== targetLocales.length ||
    JSON.stringify([...targetLocales].sort()) !==
      JSON.stringify(expectedLocales.sort())
  ) {
    throw new Error(
      `Build compiler targets must contain each artifact locale exactly once: ${expectedLocales.join(", ")}`,
    );
  }
  const generatedByLocale = Object.fromEntries(
    targets.map(({ locale, direction, messages }) => [
      locale,
      generateLocalizedBuildArtifacts(
        sources,
        englishMessages,
        messages,
        locale,
        direction,
      ),
    ]),
  ) as Record<BuildArtifactLocale, GeneratedBuildExampleArtifacts>;

  const errors = validateEnglishSources(sources);
  for (const { locale, direction } of targets) {
    errors.push(
      ...validateLocalizedBuildArtifacts(
        sources,
        generatedByLocale[locale],
        locale,
        direction,
      ),
    );
  }
  if (errors.length) throw new Error(errors.join("\n"));

  return {
    generated: Object.assign(
      {},
      ...targetLocales.map((locale) => generatedByLocale[locale]),
    ),
    expectedPaths: targetLocales
      .flatMap((locale) => localizedArtifactPaths(locale))
      .sort(),
  };
}
