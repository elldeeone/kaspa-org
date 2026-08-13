import { flattenCatalog, type MessageCatalog } from "./catalog-contract.mts";

type PreferredTermRule = readonly [pattern: RegExp, preferred: string];

type TranslationPolicy = {
  readonly allowedUnchangedValues?: readonly string[];
  readonly preferredTerms?: readonly PreferredTermRule[];
};

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
type ProtectedTermMatchers = {
  readonly source: RegExp;
  readonly target: RegExp;
};

const caseInsensitiveProtectedSourceTerms = new Set<ProtectedTerm>([
  "Crescendo",
]);

const sharedUnchangedValues = new Set([
  "2FA",
  "404",
  "Android",
  "App Store",
  "BUIDL",
  "ChatGPT",
  "Claude",
  "Crescendo",
  "DAA",
  "DAG",
  "DAGVIZ",
  "Discord",
  "GitHub",
  "Google Play",
  "HODL",
  "iOS",
  "KAS",
  "Linux",
  "LORE",
  "LORE | Kaspa",
  "macOS",
  "Perplexity",
  "PNG",
  "SVG",
  "THINK",
  "UTXO",
  "Windows",
  "X",
  "<flicker><source>H</source><replacement>K</replacement></flicker>ODL Kaspa",
]);

const translationPolicies = {
  es: {
    allowedUnchangedValues: [
      "Beta",
      "Chat",
      "Control",
      "Error:",
      "Hardware",
      "Horizontal",
      "Multisig",
      "N/A",
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
  de: {
    allowedUnchangedValues: [
      "Beta",
      "Browser + {node}",
      "Chat",
      "Checkpoint",
      "Code",
      "Community",
      "Desktop",
      "Dev",
      "Explorer",
      "Forum",
      "Genesis",
      "Hardware",
      "Horizontal",
      "Hosting",
      "Indexer",
      "live",
      "Live",
      "Multisig",
      "Node",
      "Optional",
      "Server",
      "Start",
      "Testnet",
      "Tools",
      "Wallet",
    ],
  },
  fr: {
    allowedUnchangedValues: ["Acceptable", "Hard fork", "Menu"],
    preferredTerms: [[/(?:^|\W)blocks?(?:$|\W)/iu, "bloc"]],
  },
  "id-ID": {
    allowedUnchangedValues: [
      "Beta",
      "Checkpoint",
      "Desktop",
      "Dev",
      "Forum",
      "Genesis",
      "Hosting",
      "Infra",
      "Menu",
      "N/A",
      "Node",
      "Server",
      "Testnet",
      "upstream",
    ],
  },
  "pt-BR": {
    allowedUnchangedValues: [
      "Beta",
      "Chat",
      "Desktop",
      "Hard fork",
      "Hardware",
      "Menu",
      "upstream",
    ],
    preferredTerms: [
      [/(?:^|\W)proof[- ]of[- ]work(?:$|\W)/iu, "prova de trabalho"],
      [/(?:^|\W)fair[- ]launch(?:ed)?(?:$|\W)/iu, "lançamento justo"],
      [/(?:^|\W)self-custody(?:$|\W)/iu, "autocustódia"],
    ],
  },
} as const satisfies Readonly<Record<string, TranslationPolicy>>;

const emptyPolicy = {} satisfies TranslationPolicy;
const prohibitedZeroWidthCharacter = /[\u200B-\u200D\u2060\uFEFF]/u;

function getTranslationPolicy(locale: string): TranslationPolicy {
  return (
    translationPolicies[locale as keyof typeof translationPolicies] ??
    emptyPolicy
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function protectedTermExpression(term: ProtectedTerm): string {
  const suffix = ["Kaspa", "Bitcoin", "Ethereum", "cypherpunk"].includes(term)
    ? "s?"
    : "";
  return `(?<![\\p{L}\\p{N}_])${escapeRegExp(term)}${suffix}(?![\\p{L}\\p{N}_])`;
}

const protectedTermMatchers = new Map<ProtectedTerm, ProtectedTermMatchers>(
  SHARED_PROTECTED_TERMS.map((term) => {
    const expression = protectedTermExpression(term);
    const sourceFlags = caseInsensitiveProtectedSourceTerms.has(term)
      ? "giu"
      : "gu";
    return [
      term,
      {
        source: new RegExp(expression, sourceFlags),
        target: new RegExp(expression, term === "cypherpunk" ? "giu" : "gu"),
      },
    ];
  }),
);

function countProtectedTerm(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function visibleMessageText(value: string): string {
  return value
    .replace(/\{[^{}]+\}/gu, "")
    .replace(/<\/?[A-Za-z][A-Za-z0-9]*>/gu, "");
}

function containsOnlyMessageSyntax(value: string): boolean {
  const withoutSimpleArguments = value.replace(/\{[^{}]+\}/gu, "");
  return !/[{}\p{L}\p{N}]/u.test(withoutSimpleArguments);
}

export function isUnchangedMessageAllowed(
  locale: string,
  sourceValue: string,
): boolean {
  if (containsOnlyMessageSyntax(sourceValue)) return true;
  if (sharedUnchangedValues.has(sourceValue)) return true;
  return (
    getTranslationPolicy(locale).allowedUnchangedValues?.includes(
      sourceValue,
    ) ?? false
  );
}

export function validateTranslationCatalogContract(
  locale: string,
  namespace: string,
  sourceCatalog: MessageCatalog,
  targetCatalog: MessageCatalog,
): string[] {
  const errors: string[] = [];
  const source = flattenCatalog(sourceCatalog);
  const target = flattenCatalog(targetCatalog);
  const policy = getTranslationPolicy(locale);

  for (const [key, sourceValue] of source) {
    const fullKey = `${namespace}.${key}`;
    const targetValue = target.get(key);
    if (targetValue === undefined) continue;

    const zeroWidthMatch = targetValue.match(prohibitedZeroWidthCharacter);
    if (zeroWidthMatch) {
      errors.push(
        `${fullKey} contains prohibited zero-width character U+${zeroWidthMatch[0]
          .codePointAt(0)!
          .toString(16)
          .toUpperCase()
          .padStart(4, "0")}`,
      );
    }

    if (
      sourceValue === targetValue &&
      !isUnchangedMessageAllowed(locale, sourceValue)
    ) {
      errors.push(
        `${fullKey} is unchanged from English without an explicit ${locale} policy exception`,
      );
    }

    const visibleSourceValue = visibleMessageText(sourceValue);
    const visibleTargetValue = visibleMessageText(targetValue);
    for (const term of SHARED_PROTECTED_TERMS) {
      const matchers = protectedTermMatchers.get(term);
      if (!matchers) continue;
      const sourceCount = countProtectedTerm(
        visibleSourceValue,
        matchers.source,
      );
      const targetCount = countProtectedTerm(
        visibleTargetValue,
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

  return errors;
}
