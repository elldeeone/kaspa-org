import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { parse as parseIcuMessage } from "@formatjs/icu-messageformat-parser";

import { defaultLocale, localeCodes } from "../../src/i18n/config.ts";
import {
  RESERVED_NOT_FOUND_PATHNAME,
  routeIds,
  stablePathnames,
} from "../../src/i18n/manifest.ts";
import {
  listPublishedLocales,
  resolvePublishedRoute,
} from "../../src/i18n/site.ts";
import { shouldBypassLocaleRouting } from "../../src/i18n/proxy-policy.ts";
import { analyzeAppRouteFile, isAppRouteFile } from "./app-route-policy.mts";

const repositoryRoot = process.cwd();
const errors: string[] = [];

function fail(location: string, message: string) {
  errors.push(`${location}: ${message}`);
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.[cm]?[jt]sx?$/u.test(entry.name) ? [path] : [];
  });
}

class JsonKeyScanner {
  private index = 0;
  private readonly source: string;
  private readonly location: string;

  constructor(source: string, location: string) {
    this.source = source;
    this.location = location;
  }

  scan() {
    this.skipWhitespace();
    this.scanValue([]);
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      throw new Error(`unexpected token at offset ${this.index}`);
    }
  }

  private scanValue(path: string[]) {
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

  private scanObject(path: string[]) {
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
      if (keys.has(key)) fail(this.location, `duplicate JSON key ${keyPath}`);
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

  private scanArray(path: string[]) {
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

  private scanString() {
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

  private scanPrimitive() {
    const start = this.index;
    while (
      this.index < this.source.length &&
      !/[\s,}\]]/u.test(this.source[this.index] ?? "")
    ) {
      this.index += 1;
    }
    JSON.parse(this.source.slice(start, this.index));
  }

  private skipWhitespace() {
    while (/\s/u.test(this.source[this.index] ?? "")) this.index += 1;
  }
}

function validateMessages(
  value: unknown,
  location: string,
  path: string[] = [],
) {
  if (typeof value === "string") {
    if (!value.trim()) fail(location, `${path.join(".")} must not be empty`);
    try {
      parseIcuMessage(value);
    } catch (error) {
      fail(
        location,
        `${path.join(".")} has invalid ICU syntax: ${String(error)}`,
      );
    }
    return;
  }

  if (!value || Array.isArray(value) || typeof value !== "object") {
    fail(
      location,
      `${path.join(".") || "catalog"} must be an object or string`,
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    validateMessages(child, location, [...path, key]);
  }
}

for (const locale of localeCodes) {
  const catalogPath = join(repositoryRoot, "messages", locale, "errors.json");
  const location = `messages/${locale}/errors.json`;
  if (!existsSync(catalogPath)) {
    fail(location, "required Phase 1 catalog is missing");
    continue;
  }

  const source = readFileSync(catalogPath, "utf8");
  try {
    new JsonKeyScanner(source, location).scan();
    const catalog = JSON.parse(source) as Record<string, unknown>;
    validateMessages(catalog, location);
    for (const key of [
      "title",
      "description",
      "code",
      "heading",
      "body",
      "home",
    ]) {
      if (typeof catalog[key] !== "string")
        fail(location, `missing errors.${key}`);
    }
  } catch (error) {
    fail(location, `invalid JSON: ${String(error)}`);
  }
}

if (localeCodes.some((locale) => /-XA$/iu.test(locale))) {
  fail(
    "src/i18n/config.ts",
    "pseudo-locales must not be enabled in production",
  );
}

if (
  JSON.stringify(stablePathnames) !==
  JSON.stringify(["/", "/lore", "/build", "/assets", "/hodl"])
) {
  fail("src/i18n/manifest.ts", "stable public slugs changed unexpectedly");
}

if (stablePathnames.some((pathname) => pathname.includes("historia"))) {
  fail("src/i18n/manifest.ts", "translated public slugs are not allowed");
}

if (new Set<string>(stablePathnames).has(RESERVED_NOT_FOUND_PATHNAME)) {
  fail("src/i18n/manifest.ts", "reserved miss collides with a public route");
}

const localizedAdapters = new Set(
  routeIds.map((routeId) =>
    routeId === "home"
      ? "src/app/[locale]/page.tsx"
      : `src/app/[locale]/${routeId}/page.tsx`,
  ),
);

for (const routeId of routeIds) {
  const publishedLocales = listPublishedLocales(routeId);
  if (!publishedLocales.length)
    fail("src/i18n/manifest.ts", `${routeId} has no published static params`);
  for (const locale of publishedLocales) {
    if (!resolvePublishedRoute(routeId, locale)) {
      fail(
        "src/i18n/manifest.ts",
        `${routeId} cannot resolve published locale ${locale}`,
      );
    }
  }
}

for (const adapterPath of localizedAdapters) {
  if (!existsSync(join(repositoryRoot, adapterPath))) {
    fail(adapterPath, "required localized route adapter is missing");
  }
}

const appDirectory = join(repositoryRoot, "src", "app");
for (const sourceFile of listSourceFiles(appDirectory)) {
  const appRelativeFile = relative(appDirectory, sourceFile).replaceAll(
    "\\",
    "/",
  );
  if (!isAppRouteFile(appRelativeFile)) continue;

  const repositoryRelativeFile = `src/app/${appRelativeFile}`;
  const route = analyzeAppRouteFile(appRelativeFile, defaultLocale);
  if (route.hasUnsupportedSegment) {
    fail(
      repositoryRelativeFile,
      "uses an App Router segment that the i18n collision validator cannot model",
    );
    continue;
  }
  if (route.pathnamePattern.test(RESERVED_NOT_FOUND_PATHNAME)) {
    fail(
      repositoryRelativeFile,
      `route pattern collides with reserved miss ${RESERVED_NOT_FOUND_PATHNAME}`,
    );
  }
  if (
    !localizedAdapters.has(repositoryRelativeFile) &&
    !shouldBypassLocaleRouting(route.representativePathname)
  ) {
    fail(
      repositoryRelativeFile,
      `route ${route.representativePathname} is not represented in the fixed-route manifest or proxy bypass policy`,
    );
  }
}

for (const removedConvention of [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/opengraph-image.tsx",
]) {
  if (existsSync(join(repositoryRoot, removedConvention))) {
    fail(removedConvention, "obsolete top-level convention must stay removed");
  }
}

for (const sourcePath of listSourceFiles(join(repositoryRoot, "src", "app"))) {
  const source = readFileSync(sourcePath, "utf8");
  const location = sourcePath.slice(repositoryRoot.length + 1);
  if (/from\s+["']next\/link["']/u.test(source)) {
    fail(location, "internal links must use the publication-aware i18n Link");
  }
  if (
    /import\s*\{[^}]*\bLink\b[^}]*\}\s*from\s*["']@\/i18n\/navigation["']/su.test(
      source,
    )
  ) {
    fail(location, "Link must be imported from @/i18n/link");
  }
}

for (const sourcePath of listSourceFiles(
  join(repositoryRoot, "src", "app", "components"),
)) {
  const source = readFileSync(sourcePath, "utf8");
  if (source.includes("isKaspaAiEnabled")) {
    fail(
      sourcePath.slice(repositoryRoot.length + 1),
      "client UI must consume the route-locale AI capability",
    );
  }
}

const linkSource = readFileSync(
  join(repositoryRoot, "src", "i18n", "link.tsx"),
  "utf8",
);
if (!linkSource.includes("isPathnamePublished")) {
  fail("src/i18n/link.tsx", "Link must consult the publication matrix");
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `i18n validation passed: ${localeCodes.length} locale, ${routeIds.length} routes, Phase 1 catalogs and adapters valid`,
  );
}
