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

export type MessageCatalog = {
  readonly [key: string]: MessageCatalog | string;
};

export type CatalogValidationResult = {
  catalog: MessageCatalog | null;
  errors: string[];
};

export type CatalogComparisonOptions = {
  targetLocale?: string;
};

type ReportError = (message: string) => void;

class JsonKeyScanner {
  private index = 0;
  private readonly source: string;
  private readonly report: ReportError;

  constructor(source: string, report: ReportError) {
    this.source = source;
    this.report = report;
  }

  scan(): void {
    this.skipWhitespace();
    this.scanValue([]);
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      throw new Error(`unexpected token at offset ${this.index}`);
    }
  }

  private scanValue(path: string[]): void {
    this.skipWhitespace();
    const token = this.source[this.index];
    if (token === "{") return this.scanObject(path);
    if (token === "[") return this.scanArray(path);
    if (token === '"') {
      this.scanString();
      return;
    }
    this.scanPrimitive();
  }

  private scanObject(path: string[]): void {
    this.index += 1;
    this.skipWhitespace();
    const keys = new Set<string>();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return;
    }

    while (this.index < this.source.length) {
      if (this.source[this.index] !== '"') {
        throw new Error(`expected an object key at offset ${this.index}`);
      }
      const key = this.scanString();
      const keyPath = [...path, key].join(".");
      if (keys.has(key)) this.report(`duplicate JSON key ${keyPath}`);
      keys.add(key);

      this.skipWhitespace();
      if (this.source[this.index] !== ":") {
        throw new Error(`expected ':' at offset ${this.index}`);
      }
      this.index += 1;
      this.scanValue([...path, key]);
      this.skipWhitespace();

      if (this.source[this.index] === "}") {
        this.index += 1;
        return;
      }
      if (this.source[this.index] !== ",") {
        throw new Error(`expected ',' at offset ${this.index}`);
      }
      this.index += 1;
      this.skipWhitespace();
    }

    throw new Error("unterminated object");
  }

  private scanArray(path: string[]): void {
    this.index += 1;
    this.skipWhitespace();
    if (this.source[this.index] === "]") {
      this.index += 1;
      return;
    }

    let itemIndex = 0;
    while (this.index < this.source.length) {
      this.scanValue([...path, String(itemIndex)]);
      itemIndex += 1;
      this.skipWhitespace();
      if (this.source[this.index] === "]") {
        this.index += 1;
        return;
      }
      if (this.source[this.index] !== ",") {
        throw new Error(`expected ',' at offset ${this.index}`);
      }
      this.index += 1;
      this.skipWhitespace();
    }

    throw new Error("unterminated array");
  }

  private scanString(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const token = this.source[this.index];
      if (token === "\\") {
        this.index += 2;
        continue;
      }
      this.index += 1;
      if (token === '"') {
        return JSON.parse(this.source.slice(start, this.index)) as string;
      }
    }
    throw new Error("unterminated string");
  }

  private scanPrimitive(): void {
    const start = this.index;
    while (
      this.index < this.source.length &&
      !/[\s,}\]]/u.test(this.source[this.index] ?? "")
    ) {
      this.index += 1;
    }
    JSON.parse(this.source.slice(start, this.index));
  }

  private skipWhitespace(): void {
    while (/\s/u.test(this.source[this.index] ?? "")) this.index += 1;
  }
}

function validateCatalogValue(
  value: unknown,
  path: readonly string[],
  report: ReportError,
): value is MessageCatalog | string {
  const displayPath = path.join(".") || "catalog";
  if (typeof value === "string") {
    if (!value.trim()) {
      report(`${displayPath} must not be empty`);
      return false;
    }
    try {
      parseIcuMessage(value);
      return true;
    } catch (error) {
      report(`${displayPath} has invalid ICU syntax: ${String(error)}`);
      return false;
    }
  }

  if (!value || Array.isArray(value) || typeof value !== "object") {
    report(`${displayPath} must be a string or object`);
    return false;
  }

  const entries = Object.entries(value);
  if (!entries.length) {
    report(`${displayPath} must not be empty`);
    return false;
  }

  let valid = true;
  for (const [key, child] of entries) {
    if (!key.trim()) {
      report(`${displayPath} keys must not be empty`);
      valid = false;
    }
    if (key.includes(".")) {
      report(`${[...path, key].join(".")} keys must not contain dots`);
      valid = false;
    }
    valid = validateCatalogValue(child, [...path, key], report) && valid;
  }
  return valid;
}

export function validateCatalogSource(
  source: string,
  location: string,
): CatalogValidationResult {
  const errors: string[] = [];
  const report = (message: string) => errors.push(`${location}: ${message}`);

  try {
    new JsonKeyScanner(source, report).scan();
  } catch (error) {
    report(`invalid JSON: ${String(error)}`);
    return { catalog: null, errors };
  }

  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    report(`invalid JSON: ${String(error)}`);
    return { catalog: null, errors };
  }

  if (!value || Array.isArray(value) || typeof value !== "object") {
    report("catalog root must be an object");
    return { catalog: null, errors };
  }

  const valid = validateCatalogValue(value, [], report);
  return {
    catalog: valid ? (value as MessageCatalog) : null,
    errors,
  };
}

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
    if (isSelectElement(element)) {
      return [
        [
          "select",
          element.value,
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
    if (isPluralElement(element)) {
      return [
        [
          "plural",
          element.value,
          element.pluralType,
          element.offset,
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

export function getIcuInterfaceSignature(message: string): string {
  return JSON.stringify(signatureForElements(parseIcuMessage(message)));
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
  targetLocale: string,
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

    const allowedTargetCategories = pluralCategoriesForLocale(
      targetLocale,
      target.pluralType,
    );
    const sourceCategoryKeys = optionKeys(source.options, false);
    const targetCategoryKeys = optionKeys(target.options, false);
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
  targetLocale: string,
): boolean {
  const source = interfaceElements(sourceElements);
  const target = interfaceElements(targetElements);
  if (source.length !== target.length) return false;

  const match = (
    sourceIndex: number,
    remaining: readonly number[],
  ): boolean => {
    if (sourceIndex === source.length) return true;
    return remaining.some((targetIndex, remainingIndex) => {
      if (
        !hasSameElementInterface(
          source[sourceIndex],
          target[targetIndex],
          targetLocale,
        )
      ) {
        return false;
      }
      return match(sourceIndex + 1, [
        ...remaining.slice(0, remainingIndex),
        ...remaining.slice(remainingIndex + 1),
      ]);
    });
  };

  return match(
    0,
    target.map((_, index) => index),
  );
}

function hasLocaleAwareIcuInterface(
  sourceMessage: string,
  targetMessage: string,
  targetLocale: string,
): boolean {
  return hasSameElementsInterface(
    parseIcuMessage(sourceMessage),
    parseIcuMessage(targetMessage),
    targetLocale,
  );
}

export function compareCatalogs(
  sourceCatalog: MessageCatalog,
  targetCatalog: MessageCatalog,
  options: CatalogComparisonOptions = {},
): string[] {
  const errors: string[] = [];
  const source = flattenCatalog(sourceCatalog);
  const target = flattenCatalog(targetCatalog);
  const sourceKeys = [...source.keys()].sort();
  const targetKeys = [...target.keys()].sort();

  for (const key of sourceKeys) {
    if (!target.has(key)) errors.push(`missing key ${key}`);
  }
  for (const key of targetKeys) {
    if (!source.has(key)) errors.push(`extra key ${key}`);
  }
  for (const key of sourceKeys) {
    const sourceMessage = source.get(key);
    const targetMessage = target.get(key);
    if (sourceMessage === undefined || targetMessage === undefined) continue;
    const exactInterfaceMatches =
      getIcuInterfaceSignature(sourceMessage) ===
      getIcuInterfaceSignature(targetMessage);
    const localeAwareInterfaceMatches =
      options.targetLocale !== undefined &&
      hasLocaleAwareIcuInterface(
        sourceMessage,
        targetMessage,
        options.targetLocale,
      );
    if (!exactInterfaceMatches && !localeAwareInterfaceMatches) {
      errors.push(`${key} has a different ICU interface`);
    }
  }

  return errors;
}
