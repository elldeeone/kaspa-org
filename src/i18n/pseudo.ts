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
  parse,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

type MessageCatalog = {
  readonly [key: string]: MessageCatalog | string;
};

type LiteralRange = {
  end: number;
  start: number;
};

const PROTECTED_TEXT =
  /(https?:\/\/[^\s<>]+|KasMedia\.com|kaspa\.news\/ask|\b(?:Kaspa|KAS|Bitcoin|GitHub|ChatGPT|Claude|Perplexity|Ezra|AtomicArc|getCoinSupply|kaspad|utxos\.gz|serialization\.go|covenant_id|vProg|vProgs|X)\b)/gu;

const PROTECTED_TAGS = new Set([
  "code",
  "daa",
  "kaspad",
  "kbd",
  "pre",
  "serialization",
  "supply",
  "utxos",
]);

const PSEUDO_CHARACTERS: Readonly<Record<string, string>> = {
  A: "ÅÅ",
  B: "Ɓ",
  C: "Ç",
  D: "Ď",
  E: "ËË",
  F: "Ƒ",
  G: "Ĝ",
  H: "Ħ",
  I: "ÏÏ",
  J: "Ĵ",
  K: "Ķ",
  L: "Ļ",
  M: "Ḿ",
  N: "Ń",
  O: "ÖÖ",
  P: "Þ",
  Q: "Q",
  R: "Ř",
  S: "Š",
  T: "Ť",
  U: "ÜÜ",
  V: "Ṽ",
  W: "Ŵ",
  X: "Ẋ",
  Y: "Ÿ",
  Z: "Ž",
  a: "åå",
  b: "ƀ",
  c: "ç",
  d: "ď",
  e: "ëë",
  f: "ƒ",
  g: "ĝ",
  h: "ħ",
  i: "ïï",
  j: "ĵ",
  k: "ķ",
  l: "ļ",
  m: "ḿ",
  n: "ń",
  o: "öö",
  p: "þ",
  q: "q",
  r: "ř",
  s: "š",
  t: "ţ",
  u: "üü",
  v: "ṽ",
  w: "ŵ",
  x: "ẋ",
  y: "ÿ",
  z: "ž",
};

function transformUnprotectedText(value: string): string {
  return [...value]
    .map((character) => PSEUDO_CHARACTERS[character] ?? character)
    .join("");
}

function transformLiteral(value: string): string {
  let result = "";
  let cursor = 0;

  for (const match of value.matchAll(PROTECTED_TEXT)) {
    const index = match.index;
    if (index === undefined) continue;
    result += transformUnprotectedText(value.slice(cursor, index));
    result += match[0];
    cursor = index + match[0].length;
  }

  result += transformUnprotectedText(value.slice(cursor));
  return result;
}

function collectLiteralRanges(
  elements: readonly MessageFormatElement[],
  ranges: LiteralRange[],
  isProtected = false,
): void {
  for (const element of elements) {
    if (isLiteralElement(element)) {
      if (!isProtected && element.location) {
        ranges.push({
          start: element.location.start.offset,
          end: element.location.end.offset,
        });
      }
      continue;
    }

    if (isPluralElement(element) || isSelectElement(element)) {
      for (const option of Object.values(element.options)) {
        collectLiteralRanges(option.value, ranges, isProtected);
      }
      continue;
    }

    if (isTagElement(element)) {
      collectLiteralRanges(
        element.children,
        ranges,
        isProtected || PROTECTED_TAGS.has(element.value),
      );
    }
  }
}

function normalizeStructuralValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeStructuralValue);
  }
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "location")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalizeStructuralValue(child)]),
  );
}

function collectIcuStructure(
  elements: readonly MessageFormatElement[],
): readonly unknown[] {
  const structures = elements.flatMap((element): readonly unknown[] => {
    if (isLiteralElement(element)) return [];

    if (isPluralElement(element)) {
      return [
        {
          type: element.type,
          value: element.value,
          pluralType: element.pluralType,
          offset: element.offset,
          options: Object.fromEntries(
            Object.entries(element.options)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, option]) => [key, collectIcuStructure(option.value)]),
          ),
        },
      ];
    }

    if (isSelectElement(element)) {
      return [
        {
          type: element.type,
          value: element.value,
          options: Object.fromEntries(
            Object.entries(element.options)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, option]) => [key, collectIcuStructure(option.value)]),
          ),
        },
      ];
    }

    if (isTagElement(element)) {
      return [
        {
          type: element.type,
          value: element.value,
          children: collectIcuStructure(element.children),
        },
      ];
    }

    if (
      isNumberElement(element) ||
      isDateElement(element) ||
      isTimeElement(element)
    ) {
      return [
        {
          type: element.type,
          value: element.value,
          style: normalizeStructuralValue(element.style),
        },
      ];
    }

    if (isArgumentElement(element)) {
      return [{ type: element.type, value: element.value }];
    }

    if (isPoundElement(element)) {
      return [{ type: element.type }];
    }

    return [];
  });

  return structures.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

export function pseudoLocalizeMessage(message: string): string {
  const ast = parse(message, { captureLocation: true });
  const ranges: LiteralRange[] = [];
  collectLiteralRanges(ast, ranges);

  let transformed = message;
  let changed = false;
  for (const range of ranges.sort((left, right) => right.start - left.start)) {
    const original = message.slice(range.start, range.end);
    const replacement = transformLiteral(original);
    changed ||= replacement !== original;
    transformed =
      transformed.slice(0, range.start) +
      replacement +
      transformed.slice(range.end);
  }

  const hasIcuInterface = collectIcuStructure(ast).length > 0;
  const result =
    changed || hasIcuInterface ? `[!! ${transformed} !!]` : message;
  if (!hasSameIcuStructure(message, result)) {
    throw new Error("Pseudo-localization changed the ICU message interface");
  }
  return result;
}

export function pseudoLocalizeCatalog<T extends MessageCatalog>(catalog: T): T {
  return Object.fromEntries(
    Object.entries(catalog).map(([key, value]) => [
      key,
      typeof value === "string"
        ? pseudoLocalizeMessage(value)
        : pseudoLocalizeCatalog(value),
    ]),
  ) as T;
}

export function hasSameIcuStructure(source: string, target: string): boolean {
  try {
    return (
      JSON.stringify(collectIcuStructure(parse(source))) ===
      JSON.stringify(collectIcuStructure(parse(target)))
    );
  } catch {
    return false;
  }
}
