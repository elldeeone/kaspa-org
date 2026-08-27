import {
  isArgumentElement,
  isDateElement,
  isLiteralElement,
  isNumberElement,
  isPluralElement,
  isPoundElement,
  isSelectElement,
  isTagElement,
  isTimeElement,
  parse as parseIcuMessage,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

import type { MessageCatalog } from "./catalog-contract.mts";

type PreferredTermRule = readonly [pattern: RegExp, preferred: string];

export const SHARED_PROTECTED_TERMS = [
  "Kaspa",
  "KAS",
  "blockDAG",
  "GHOSTDAG",
  "DAGKnight",
  "PHANTOM",
  "SPECTRE",
  "Toccata",
  "Crescendo",
  "rusty-kaspa",
  "Silverscript",
  "OP_CAT",
  "TN12",
  "UTXO",
  "BPS",
  "RTD",
  "BFT",
  "ZK",
  "HODL",
  "BUIDL",
  "cypherpunk",
  "Bitcoin",
  "Ethereum",
  "GitHub",
  "CoinDesk",
  "Golang",
  "Rust",
] as const;

type ProtectedTerm = (typeof SHARED_PROTECTED_TERMS)[number];
type TranslationPolicy = {
  readonly allowedUnchangedKeys?: readonly string[];
  readonly preferredTerms?: readonly PreferredTermRule[];
};
type ProtectedTermMatchers = {
  readonly source: RegExp;
  readonly target: RegExp;
};

type AnalyzedMessage = {
  readonly elements: readonly MessageFormatElement[];
  readonly visibleText: string;
};

type AnalyzedCatalog = {
  readonly rawMessages: ReadonlyMap<string, string>;
  readonly messages: ReadonlyMap<string, AnalyzedMessage>;
  readonly diagnostics: readonly string[];
};

type CatalogPairValidation = {
  readonly locale?: string;
  readonly namespace?: string;
};

export function flattenCatalog(
  catalog: MessageCatalog,
  prefix: readonly string[] = [],
  entries = new Map<string, string>(),
): ReadonlyMap<string, string> {
  for (const [key, value] of Object.entries(catalog)) {
    const path = [...prefix, key];
    if (typeof value === "string") entries.set(path.join("."), value);
    else flattenCatalog(value, path, entries);
  }
  return entries;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "location")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

function signatureForElements(
  elements: readonly MessageFormatElement[],
): unknown[] {
  const signatures = elements.flatMap((element): unknown[] => {
    if (isLiteralElement(element)) return [];
    if (isArgumentElement(element)) return [["argument", element.value]];
    if (isNumberElement(element)) {
      return [["number", element.value, stableValue(element.style ?? null)]];
    }
    if (isDateElement(element)) {
      return [["date", element.value, stableValue(element.style ?? null)]];
    }
    if (isTimeElement(element)) {
      return [["time", element.value, stableValue(element.style ?? null)]];
    }
    if (isPoundElement(element)) return [["pound"]];
    if (isTagElement(element)) {
      return [["tag", element.value, signatureForElements(element.children)]];
    }
    if (isSelectElement(element) || isPluralElement(element)) {
      return [
        [
          isSelectElement(element) ? "select" : "plural",
          element.value,
          ...(isPluralElement(element)
            ? [element.pluralType, element.offset]
            : []),
          Object.fromEntries(
            Object.entries(element.options)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, option]) => [
                key,
                signatureForElements(option.value),
              ]),
          ),
        ],
      ];
    }
    return [];
  });
  return signatures.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function hasSameStableValue(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
  );
}

function interfaceElements(
  elements: readonly MessageFormatElement[],
): readonly MessageFormatElement[] {
  return elements.filter((element) => !isLiteralElement(element));
}

function pluralCategoriesForLocale(
  locale: string,
  type: Intl.PluralRulesOptions["type"],
): ReadonlySet<string> {
  return new Set(
    new Intl.PluralRules(locale, { type }).resolvedOptions().pluralCategories,
  );
}

function optionKeys(
  options: Readonly<Record<string, unknown>>,
  exact: boolean,
): string[] {
  return Object.keys(options)
    .filter((key) => key.startsWith("=") === exact)
    .sort();
}

function hasSameElementInterface(
  source: MessageFormatElement,
  target: MessageFormatElement,
  targetLocale: string | undefined,
): boolean {
  if (isArgumentElement(source) && isArgumentElement(target)) {
    return source.value === target.value;
  }
  if (isNumberElement(source) && isNumberElement(target)) {
    return (
      source.value === target.value &&
      hasSameStableValue(source.style ?? null, target.style ?? null)
    );
  }
  if (isDateElement(source) && isDateElement(target)) {
    return (
      source.value === target.value &&
      hasSameStableValue(source.style ?? null, target.style ?? null)
    );
  }
  if (isTimeElement(source) && isTimeElement(target)) {
    return (
      source.value === target.value &&
      hasSameStableValue(source.style ?? null, target.style ?? null)
    );
  }
  if (isPoundElement(source) && isPoundElement(target)) return true;
  if (isTagElement(source) && isTagElement(target)) {
    return (
      source.value === target.value &&
      hasSameElementsInterface(source.children, target.children, targetLocale)
    );
  }
  if (isSelectElement(source) && isSelectElement(target)) {
    const sourceKeys = Object.keys(source.options).sort();
    const targetKeys = Object.keys(target.options).sort();
    return (
      source.value === target.value &&
      hasSameStableValue(sourceKeys, targetKeys) &&
      sourceKeys.every((key) =>
        hasSameElementsInterface(
          source.options[key].value,
          target.options[key].value,
          targetLocale,
        ),
      )
    );
  }
  if (isPluralElement(source) && isPluralElement(target)) {
    if (
      source.value !== target.value ||
      source.pluralType !== target.pluralType ||
      source.offset !== target.offset
    ) {
      return false;
    }

    const sourceExactKeys = optionKeys(source.options, true);
    const targetExactKeys = optionKeys(target.options, true);
    if (!hasSameStableValue(sourceExactKeys, targetExactKeys)) return false;
    if (
      !sourceExactKeys.every((key) =>
        hasSameElementsInterface(
          source.options[key].value,
          target.options[key].value,
          targetLocale,
        ),
      )
    ) {
      return false;
    }

    const sourceCategoryKeys = optionKeys(source.options, false);
    const targetCategoryKeys = optionKeys(target.options, false);
    if (hasSameStableValue(sourceCategoryKeys, targetCategoryKeys)) {
      return sourceCategoryKeys.every((category) =>
        hasSameElementsInterface(
          source.options[category].value,
          target.options[category].value,
          targetLocale,
        ),
      );
    }
    if (targetLocale === undefined) return false;

    const allowedTargetCategories = pluralCategoriesForLocale(
      targetLocale,
      target.pluralType,
    );
    if (!targetCategoryKeys.includes("other")) return false;
    if (
      targetCategoryKeys.some(
        (category) => !allowedTargetCategories.has(category),
      )
    ) {
      return false;
    }
    if (
      sourceCategoryKeys.some(
        (category) =>
          allowedTargetCategories.has(category) &&
          !targetCategoryKeys.includes(category),
      )
    ) {
      return false;
    }

    const sourceOther = source.options.other;
    if (!sourceOther) return false;
    return targetCategoryKeys.every((category) => {
      const sourceOption = source.options[category] ?? sourceOther;
      return hasSameElementsInterface(
        sourceOption.value,
        target.options[category].value,
        targetLocale,
      );
    });
  }
  return false;
}

function hasSameElementsInterface(
  sourceElements: readonly MessageFormatElement[],
  targetElements: readonly MessageFormatElement[],
  targetLocale: string | undefined,
): boolean {
  if (
    hasSameStableValue(
      signatureForElements(sourceElements),
      signatureForElements(targetElements),
    )
  ) {
    return true;
  }
  if (targetLocale === undefined) return false;

  const source = interfaceElements(sourceElements);
  const target = interfaceElements(targetElements);
  if (source.length !== target.length) return false;

  const matchedSourceByTarget = new Array<number>(target.length).fill(-1);
  const match = (sourceIndex: number, visitedTargets: Set<number>): boolean => {
    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
      if (
        visitedTargets.has(targetIndex) ||
        !hasSameElementInterface(
          source[sourceIndex],
          target[targetIndex],
          targetLocale,
        )
      ) {
        continue;
      }
      visitedTargets.add(targetIndex);
      const previousSourceIndex = matchedSourceByTarget[targetIndex];
      if (
        previousSourceIndex === -1 ||
        match(previousSourceIndex, visitedTargets)
      ) {
        matchedSourceByTarget[targetIndex] = sourceIndex;
        return true;
      }
    }
    return false;
  };

  return source.every((_, sourceIndex) =>
    match(sourceIndex, new Set<number>()),
  );
}

const caseInsensitiveProtectedSourceTerms = new Set<ProtectedTerm>([
  "Crescendo",
]);

// Locale policies contain only the legitimate exceptions for that language.
// The shared checks apply automatically when a new locale has no policy yet.
const translationPolicies = {
  es: {
    allowedUnchangedKeys: [
      "assets.formats.png",
      "assets.formats.svg",
      "assets.groups.lockup",
      "build.access.groups.docs.links.kips",
      "build.access.groups.docs.links.qa",
      "build.access.groups.node.links.rustyKaspa",
      "build.artifacts.utxo.error",
      "build.developments.cards.kips.title",
      "build.developments.cards.python.label",
      "build.developments.cards.python.title",
      "build.developments.cards.research.title",
      "build.developments.cards.silverscript.title",
      "build.developments.cards.vprogs.title",
      "build.help.links.discord.eyebrow",
      "build.help.links.discord.title",
      "build.help.links.github.title",
      "build.help.links.qa.title",
      "build.runNode.dockerHub",
      "build.start.release.version",
      "build.terms.daa",
      "build.terms.dag",
      "build.terms.utxo",
      "build.tooling.community.cards.dnsSeeder.title",
      "build.tooling.community.cards.indexer.title",
      "build.tooling.community.cards.kaspaJs.title",
      "build.tooling.community.cards.khost.title",
      "build.tooling.emerging.python.status",
      "build.tooling.emerging.python.title",
      "build.tooling.stable.rustyKaspa.title",
      "build.tooling.stable.wasm.title",
      "build.tryLive.examples.blockAdded.runtime",
      "build.tryLive.examples.daaChanged.mobileTabLabel",
      "build.tryLive.examples.daaChanged.runtime",
      "build.tryLive.examples.dagInfo.mobileTabLabel",
      "build.tryLive.examples.dagInfo.runtime",
      "build.tryLive.examples.serverInfo.runtime",
      "build.tryLive.examples.utxoContext.mobileTabLabel",
      "build.tryLive.examples.utxoContext.runtime",
      "errors.page.code",
      "hodl.help.discord",
      "hodl.navigation.current",
      "hodl.start.heading",
      "hodl.walletFinder.actions.app_store",
      "hodl.walletFinder.actions.google_play",
      "hodl.walletFinder.criteria.control.label",
      "hodl.walletFinder.features.multisig.label",
      "hodl.walletFinder.features.two_fa.label",
      "hodl.walletFinder.guidance.hardware.shortTitle",
      "hodl.walletFinder.operatingSystems.android",
      "hodl.walletFinder.operatingSystems.hardware",
      "hodl.walletFinder.operatingSystems.ios",
      "hodl.walletFinder.operatingSystems.linux",
      "hodl.walletFinder.operatingSystems.mac",
      "hodl.walletFinder.operatingSystems.windows",
      "hodl.walletFinder.ratings.aria",
      "hodl.walletFinder.ratings.notApplicableCompact",
      "hodl.walletFinder.ratings.tooltipHeading",
      "home.proof.supply.comparison.unit",
      "home.proof.supply.timeline.checkpoint.date",
      "home.proof.supply.timeline.chromatic.date",
      "home.proof.supply.timeline.crescendo.date",
      "home.proof.supply.timeline.crescendo.label",
      "home.proof.supply.timeline.genesis.date",
      "home.proof.supply.timeline.preDeflationary.date",
      "lore.metadata.title",
      "shared.ai.launcher.beta",
      "shared.ai.providers.chatgpt",
      "shared.ai.providers.claude",
      "shared.ai.providers.perplexity",
      "shared.footer.links.github",
      "shared.footer.links.x",
      "shared.navigation.links.build",
      "shared.navigation.links.dagviz",
      "shared.navigation.links.hodl",
      "shared.navigation.links.lore",
      "shared.navigation.links.think",
    ],
    preferredTerms: [
      [/(?:^|\W)mainnet(?:$|\W)/iu, "red principal"],
      [/(?:^|\W)testnet(?:$|\W)/iu, "red de pruebas"],
      [/(?:^|\W)hard[- ]?fork(?:$|\W)/iu, "bifurcación dura"],
      [/(?:^|\W)on-chain(?:$|\W)/iu, "en cadena"],
      [/(?:^|\W)off-chain(?:$|\W)/iu, "fuera de la cadena"],
      [/(?:^|\W)proof[- ]of[- ]work(?:$|\W)/iu, "prueba de trabajo"],
      [/(?:^|\W)fair[- ]launch(?:ed)?(?:$|\W)/iu, "lanzamiento justo"],
      [/(?:^|\W)self-custody(?:$|\W)/iu, "autocustodia"],
      [/(?:^|\W)hashrate(?:$|\W)/iu, "tasa de hash"],
      [/(?:^|\W)finality(?:$|\W)/iu, "finalidad"],
      [/(?:^|\W)bindings?(?:$|\W)/iu, "enlaces"],
      [/(?:^|\W)stack(?:$|\W)/iu, "pila tecnológica"],
    ],
  },
  fr: {
    allowedUnchangedKeys: [
      "assets.formats.png",
      "assets.formats.svg",
      "build.developments.cards.toccata.label",
      "build.terms.daa",
      "build.terms.dag",
      "build.terms.utxo",
      "errors.page.code",
      "hodl.help.discord",
      "hodl.navigation.current",
      "hodl.start.heading",
      "hodl.walletFinder.actions.app_store",
      "hodl.walletFinder.actions.google_play",
      "hodl.walletFinder.features.two_fa.label",
      "hodl.walletFinder.operatingSystems.android",
      "hodl.walletFinder.operatingSystems.ios",
      "hodl.walletFinder.operatingSystems.linux",
      "hodl.walletFinder.operatingSystems.mac",
      "hodl.walletFinder.operatingSystems.windows",
      "hodl.walletFinder.ratings.acceptable",
      "home.proof.supply.comparison.unit",
      "home.proof.supply.timeline.crescendo.label",
      "lore.metadata.title",
      "shared.ai.providers.chatgpt",
      "shared.ai.providers.claude",
      "shared.ai.providers.perplexity",
      "shared.footer.links.github",
      "shared.footer.links.x",
      "shared.navigation.links.build",
      "shared.navigation.links.dagviz",
      "shared.navigation.links.hodl",
      "shared.navigation.links.lore",
      "shared.navigation.links.think",
      "shared.navigation.menu",
    ],
    preferredTerms: [[/(?:^|\W)blocks?(?:$|\W)/iu, "bloc"]],
  },
  ru: {
    allowedUnchangedKeys: [
      "assets.formats.png",
      "assets.formats.svg",
      "build.terms.daa",
      "build.terms.dag",
      "build.terms.utxo",
      "errors.page.code",
      "hodl.help.discord",
      "hodl.navigation.current",
      "hodl.start.heading",
      "hodl.walletFinder.actions.app_store",
      "hodl.walletFinder.actions.google_play",
      "hodl.walletFinder.features.two_fa.label",
      "hodl.walletFinder.operatingSystems.android",
      "hodl.walletFinder.operatingSystems.ios",
      "hodl.walletFinder.operatingSystems.linux",
      "hodl.walletFinder.operatingSystems.mac",
      "hodl.walletFinder.operatingSystems.windows",
      "home.proof.supply.comparison.unit",
      "home.proof.supply.timeline.crescendo.label",
      "lore.metadata.title",
      "shared.ai.providers.chatgpt",
      "shared.ai.providers.claude",
      "shared.ai.providers.perplexity",
      "shared.footer.links.github",
      "shared.footer.links.x",
      "shared.navigation.links.build",
      "shared.navigation.links.dagviz",
      "shared.navigation.links.hodl",
      "shared.navigation.links.lore",
      "shared.navigation.links.think",
    ],
  },
  "zh-CN": {
    allowedUnchangedKeys: [
      "assets.formats.png",
      "assets.formats.svg",
      "build.terms.daa",
      "build.terms.dag",
      "build.terms.utxo",
      "errors.page.code",
      "hodl.help.discord",
      "hodl.navigation.current",
      "hodl.start.heading",
      "hodl.walletFinder.actions.app_store",
      "hodl.walletFinder.actions.google_play",
      "hodl.walletFinder.features.two_fa.label",
      "hodl.walletFinder.operatingSystems.android",
      "hodl.walletFinder.operatingSystems.ios",
      "hodl.walletFinder.operatingSystems.linux",
      "hodl.walletFinder.operatingSystems.mac",
      "hodl.walletFinder.operatingSystems.windows",
      "home.proof.supply.comparison.unit",
      "home.proof.supply.timeline.crescendo.label",
      "lore.metadata.title",
      "shared.ai.providers.chatgpt",
      "shared.ai.providers.claude",
      "shared.ai.providers.perplexity",
      "shared.footer.links.github",
      "shared.footer.links.x",
      "shared.navigation.links.build",
      "shared.navigation.links.dagviz",
      "shared.navigation.links.hodl",
      "shared.navigation.links.lore",
      "shared.navigation.links.think",
    ],
  },
} as const satisfies Readonly<Record<string, TranslationPolicy>>;

const emptyPolicy: TranslationPolicy = {};
const prohibitedZeroWidthCharacter = /[\u200B\u2060\uFEFF]/u;
const contextualJoiner = /[\u200C\u200D]/gu;
const shapingContextCharacter = /[\p{L}\p{M}]/u;
const latinContextCharacter = /[\p{Script_Extensions=Latin}\p{N}_]/u;
const emojiJoinerPrefix =
  /\p{Extended_Pictographic}(?:\p{Grapheme_Extend}|\p{Emoji_Modifier})*$/u;
const emojiJoinerSuffix = /^\p{Extended_Pictographic}/u;

function getTranslationPolicy(locale: string): TranslationPolicy {
  return (
    translationPolicies[locale as keyof typeof translationPolicies] ??
    emptyPolicy
  );
}

function hasValidJoinerContext(value: string, index: number): boolean {
  const before = [...value.slice(0, index)].at(-1);
  const after = [...value.slice(index + 1)][0];
  return Boolean(
    before &&
    after &&
    shapingContextCharacter.test(before) &&
    shapingContextCharacter.test(after) &&
    !latinContextCharacter.test(before) &&
    !latinContextCharacter.test(after),
  );
}

function hasValidEmojiJoinerContext(value: string, index: number): boolean {
  return (
    emojiJoinerPrefix.test(value.slice(0, index)) &&
    emojiJoinerSuffix.test(value.slice(index + 1))
  );
}

function findProhibitedZeroWidthCharacter(value: string): string | undefined {
  const prohibited = value.match(prohibitedZeroWidthCharacter)?.[0];
  if (prohibited) return prohibited;
  for (const match of value.matchAll(contextualJoiner)) {
    const isValidEmojiJoiner =
      match[0] === "\u200D" && hasValidEmojiJoinerContext(value, match.index);
    if (!isValidEmojiJoiner && !hasValidJoinerContext(value, match.index)) {
      return match[0];
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function protectedTermExpression(
  term: ProtectedTerm,
  wordCharacter: string,
): string {
  const suffix = ["Kaspa", "Bitcoin", "Ethereum", "cypherpunk"].includes(term)
    ? "s?"
    : "";
  return `(?<![${wordCharacter}])${escapeRegExp(term)}${suffix}(?![${wordCharacter}])`;
}

function createProtectedTermMatchers(): ReadonlyMap<
  ProtectedTerm,
  ProtectedTermMatchers
> {
  return new Map(
    SHARED_PROTECTED_TERMS.map((term) => {
      const sourceExpression = protectedTermExpression(
        term,
        "\\p{L}\\p{N}\\p{M}_",
      );
      const targetExpression = protectedTermExpression(
        term,
        "\\p{Script_Extensions=Latin}\\p{N}_",
      );
      const sourceFlags = caseInsensitiveProtectedSourceTerms.has(term)
        ? "giu"
        : "gu";
      return [
        term,
        {
          source: new RegExp(sourceExpression, sourceFlags),
          target: new RegExp(
            targetExpression,
            term === "cypherpunk" ? "giu" : "gu",
          ),
        },
      ];
    }),
  );
}

const protectedTermMatchers = createProtectedTermMatchers();

function countProtectedTerm(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function collectVisibleMessageText(
  elements: readonly MessageFormatElement[],
  fragments: string[],
): void {
  for (const element of elements) {
    if (isLiteralElement(element)) {
      fragments.push(element.value);
    } else if (isTagElement(element)) {
      collectVisibleMessageText(element.children, fragments);
    } else if (isPluralElement(element) || isSelectElement(element)) {
      for (const option of Object.values(element.options)) {
        collectVisibleMessageText(option.value, fragments);
      }
    }
  }
}

function analyzeCatalog(catalog: MessageCatalog): AnalyzedCatalog {
  const rawMessages = flattenCatalog(catalog);
  const messages = new Map<string, AnalyzedMessage>();
  const diagnostics: string[] = [];
  for (const [key, value] of rawMessages) {
    try {
      const elements = parseIcuMessage(value);
      const fragments: string[] = [];
      collectVisibleMessageText(elements, fragments);
      messages.set(key, { elements, visibleText: fragments.join(" ") });
    } catch (error) {
      diagnostics.push(`${key} has invalid ICU syntax: ${String(error)}`);
    }
  }
  return { rawMessages, messages, diagnostics };
}

function containsOnlyMessageSyntax(value: string): boolean {
  try {
    const fragments: string[] = [];
    collectVisibleMessageText(parseIcuMessage(value), fragments);
    return !/[\p{L}\p{N}]/u.test(fragments.join(" "));
  } catch {
    return false;
  }
}

export function isUnchangedMessageAllowed(
  locale: string,
  fullKey: string,
  sourceValue: string,
): boolean {
  if (containsOnlyMessageSyntax(sourceValue)) return true;
  return (
    getTranslationPolicy(locale).allowedUnchangedKeys?.includes(fullKey) ??
    false
  );
}

function validateCatalogPair(
  source: AnalyzedCatalog,
  targetCatalog: MessageCatalog,
  validation: CatalogPairValidation,
): string[] {
  const target = analyzeCatalog(targetCatalog);
  const errors = [...target.diagnostics];
  const sourceKeys = [...source.rawMessages.keys()].sort();
  const targetKeys = [...target.rawMessages.keys()].sort();
  const { locale, namespace } = validation;
  const policy: TranslationPolicy =
    locale === undefined ? emptyPolicy : getTranslationPolicy(locale);

  for (const key of sourceKeys) {
    if (!target.rawMessages.has(key)) errors.push(`missing key ${key}`);
  }
  for (const key of targetKeys) {
    if (!source.rawMessages.has(key)) errors.push(`extra key ${key}`);
  }

  for (const [key, sourceValue] of source.rawMessages) {
    const targetValue = target.rawMessages.get(key);
    if (targetValue === undefined) continue;
    const sourceMessage = source.messages.get(key);
    const targetMessage = target.messages.get(key);
    if (!sourceMessage || !targetMessage) continue;
    if (
      !hasSameElementsInterface(
        sourceMessage.elements,
        targetMessage.elements,
        locale,
      )
    ) {
      errors.push(`${key} has a different ICU interface`);
    }
    if (locale === undefined || namespace === undefined) continue;

    const fullKey = `${namespace}.${key}`;

    const prohibitedZeroWidth = findProhibitedZeroWidthCharacter(targetValue);
    if (prohibitedZeroWidth) {
      errors.push(
        `${fullKey} contains prohibited zero-width character U+${prohibitedZeroWidth
          .codePointAt(0)!
          .toString(16)
          .toUpperCase()
          .padStart(4, "0")}`,
      );
    }

    if (
      sourceValue === targetValue &&
      !isUnchangedMessageAllowed(locale, fullKey, sourceValue)
    ) {
      errors.push(
        `${fullKey} is unchanged from English without an explicit ${locale} policy exception`,
      );
    }

    for (const term of SHARED_PROTECTED_TERMS) {
      const matchers = protectedTermMatchers.get(term);
      if (!matchers) continue;
      const sourceCount = countProtectedTerm(
        sourceMessage.visibleText,
        matchers.source,
      );
      const targetCount = countProtectedTerm(
        targetMessage.visibleText,
        matchers.target,
      );
      if (sourceCount > 0 && targetCount === 0) {
        errors.push(
          `${fullKey} removes protected term ${term} from translated copy`,
        );
      }
    }

    for (const [pattern, preferred] of policy.preferredTerms ?? []) {
      pattern.lastIndex = 0;
      if (pattern.test(targetValue)) {
        errors.push(
          `${fullKey} retains prohibited English terminology; use ${preferred}`,
        );
      }
    }
  }

  if (locale === undefined || namespace === undefined) return errors;
  for (const fullKey of policy.allowedUnchangedKeys ?? []) {
    if (!fullKey.startsWith(`${namespace}.`)) continue;
    const key = fullKey.slice(namespace.length + 1);
    const sourceValue = source.rawMessages.get(key);
    if (sourceValue === undefined) {
      errors.push(`${fullKey} policy exception does not exist in English`);
      continue;
    }
    const targetValue = target.rawMessages.get(key);
    if (targetValue !== undefined && targetValue !== sourceValue) {
      errors.push(`${fullKey} has a stale unchanged-message policy exception`);
    }
  }

  return errors;
}

export type LocaleCatalogValidator = Readonly<{
  sourceDiagnostics: readonly string[];
  sourceMessages: ReadonlyMap<string, string>;
  compareStructure(targetCatalog: MessageCatalog): string[];
  validateTranslation(
    locale: string,
    namespace: string,
    targetCatalog: MessageCatalog,
  ): string[];
}>;

export function createLocaleCatalogValidator(
  sourceCatalog: MessageCatalog,
): LocaleCatalogValidator {
  const source = analyzeCatalog(sourceCatalog);
  return Object.freeze({
    sourceDiagnostics: source.diagnostics,
    sourceMessages: source.rawMessages,
    compareStructure(targetCatalog: MessageCatalog) {
      return validateCatalogPair(source, targetCatalog, {});
    },
    validateTranslation(
      locale: string,
      namespace: string,
      targetCatalog: MessageCatalog,
    ) {
      return validateCatalogPair(source, targetCatalog, { locale, namespace });
    },
  });
}
