import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import {
  isPseudoLocaleEnabled,
  defaultLocale,
  localeCodes,
  pseudoLocale,
} from "../../src/i18n/config.ts";
import {
  RESERVED_NOT_FOUND_PATHNAME,
  routeIds,
  stablePathnames,
} from "../../src/i18n/manifest.ts";
import {
  assertPreviewLocaleComplete,
  getRouteDefinition,
  listPublishedLocales,
  resolvePublishedRoute,
} from "../../src/i18n/site.ts";
import { englishMessages } from "../../src/i18n/messages.ts";
import { shouldBypassLocaleRouting } from "../../src/i18n/proxy-policy.ts";
import { analyzeAppRouteFile, isAppRouteFile } from "./app-route-policy.mts";
import {
  compareCatalogs,
  flattenCatalog,
  validateCatalogSource,
  type MessageCatalog,
} from "./catalog-contract.mts";

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

const requiredNamespaces = new Set<string>(["errors", "shared"]);
for (const routeId of routeIds) {
  for (const namespace of getRouteDefinition(routeId).namespaces) {
    requiredNamespaces.add(namespace);
  }
}

const messagesDirectory = join(repositoryRoot, "messages");
const sourceDirectory = join(messagesDirectory, defaultLocale);
const sourceNamespaces = readdirSync(sourceDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name.slice(0, -".json".length))
  .sort();
const sourceCatalogs = new Map<string, MessageCatalog>();
for (const namespace of sourceNamespaces) {
  const location = `messages/${defaultLocale}/${namespace}.json`;
  const catalogPath = join(repositoryRoot, location);
  const result = validateCatalogSource(
    readFileSync(catalogPath, "utf8"),
    location,
  );
  errors.push(...result.errors);
  if (result.catalog) sourceCatalogs.set(namespace, result.catalog);
}

const registeredNamespaces = Object.keys(englishMessages).sort();
if (JSON.stringify(sourceNamespaces) !== JSON.stringify(registeredNamespaces)) {
  fail(
    "src/i18n/messages.ts",
    `registered namespaces ${JSON.stringify(registeredNamespaces)} do not match source catalogs ${JSON.stringify(sourceNamespaces)}`,
  );
}
for (const namespace of [...requiredNamespaces].sort()) {
  const location = `messages/${defaultLocale}/${namespace}.json`;
  if (!existsSync(join(repositoryRoot, location))) {
    fail(location, "required source catalog is missing");
  }
}

const requiredSemanticKeys = {
  errors: [
    "metadata.title",
    "metadata.description",
    "page.code",
    "page.heading",
    "page.body",
    "page.home",
  ],
  home: [
    "metadata.title",
    "metadata.description",
    "openGraph.imageAlt",
    "openGraph.heading",
    "openGraph.tagline",
  ],
  lore: ["metadata.title", "metadata.description", "openGraph.imageAlt"],
  build: ["metadata.title", "metadata.description", "openGraph.imageAlt"],
  assets: ["metadata.title", "metadata.description", "openGraph.imageAlt"],
  hodl: ["metadata.title", "metadata.description", "openGraph.imageAlt"],
} as const;

for (const [namespace, keys] of Object.entries(requiredSemanticKeys)) {
  const catalog = sourceCatalogs.get(namespace);
  if (!catalog) continue;
  const flattened = flattenCatalog(catalog);
  for (const key of keys) {
    if (!flattened.has(key)) {
      fail(
        `messages/${defaultLocale}/${namespace}.json`,
        `missing required ${namespace}.${key}`,
      );
    }
  }
}

const catalogLocales = readdirSync(messagesDirectory, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const locale of catalogLocales) {
  if (locale === defaultLocale || /-XA$/iu.test(locale)) continue;
  const localeDirectory = join(messagesDirectory, locale);
  const targetNamespaces = readdirSync(localeDirectory, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -".json".length))
    .sort();
  for (const namespace of targetNamespaces) {
    const location = `messages/${locale}/${namespace}.json`;
    const catalogPath = join(repositoryRoot, location);
    const sourceCatalog = sourceCatalogs.get(namespace);
    if (!sourceCatalog) {
      fail(location, "target namespace has no English source catalog");
      continue;
    }
    const result = validateCatalogSource(
      readFileSync(catalogPath, "utf8"),
      location,
    );
    errors.push(...result.errors);
    if (result.catalog) {
      for (const issue of compareCatalogs(sourceCatalog, result.catalog)) {
        fail(location, issue);
      }
    }
  }
}

for (const locale of localeCodes) {
  if (locale === pseudoLocale) continue;
  if (!catalogLocales.includes(locale)) {
    fail(`messages/${locale}`, "enabled locale catalog directory is missing");
    continue;
  }
  const requiredForLocale = new Set<string>(["errors", "shared"]);
  for (const routeId of routeIds) {
    if (!listPublishedLocales(routeId).includes(locale)) continue;
    for (const namespace of getRouteDefinition(routeId).namespaces) {
      requiredForLocale.add(namespace);
    }
  }
  for (const namespace of [...requiredForLocale].sort()) {
    const location = `messages/${locale}/${namespace}.json`;
    if (!existsSync(join(repositoryRoot, location))) {
      fail(location, "required enabled route-locale catalog is missing");
    }
  }
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

if (isPseudoLocaleEnabled) {
  try {
    assertPreviewLocaleComplete(pseudoLocale);
  } catch (error) {
    fail(
      "src/i18n/site.ts",
      error instanceof Error ? error.message : String(error),
    );
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
    `i18n validation passed: ${localeCodes.length} locale, ${routeIds.length} routes, Phase 3 full-site contracts valid`,
  );
}
