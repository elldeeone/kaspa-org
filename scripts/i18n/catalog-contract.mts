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

export function compareCatalogs(
  sourceCatalog: MessageCatalog,
  targetCatalog: MessageCatalog,
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
    if (
      getIcuInterfaceSignature(sourceMessage) !==
      getIcuInterfaceSignature(targetMessage)
    ) {
      errors.push(`${key} has a different ICU interface`);
    }
  }

  return errors;
}
