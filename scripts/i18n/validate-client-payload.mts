import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  resolveSupportedLocale,
  supportedLocaleCodes,
  type Locale,
} from "../../src/i18n/locale-registry.ts";
import type { RouteId } from "../../src/i18n/manifest.ts";
import {
  assertClientMessagePolicyCoverage,
  auditClientPayloadArtifacts,
  type ClientMessagePolicy,
} from "./client-payload-policy.mts";

const [manifest, site, siteCapabilities] = await Promise.all([
  import("../../src/i18n/manifest.ts"),
  import("../../src/i18n/site.ts"),
  import("../../src/i18n/site-capabilities.ts"),
]);
const { getRouteIdForPathname, routeIds, routeManifest } = manifest;
const { listLocalizedRoutes } = site;
const { isAiAvailable } = siteCapabilities;

const repositoryRoot = process.cwd();
const nextDirectory = join(repositoryRoot, ".next");

const sharedClientPaths = [
  "shared.footer",
  "shared.logoMenu",
  "shared.navigation",
  "shared.theme",
] as const;

const routeClientPaths: Readonly<
  Partial<Record<RouteId, { readonly allowedPaths: readonly string[] }>>
> = {
  build: {
    allowedPaths: [
      "build.access",
      "build.developments",
      "build.help",
      "build.navigation",
      "build.paths",
      "build.runNode",
      "build.start",
      "build.terms",
      "build.tooling",
      "build.tryLive",
      "shared.pageSections",
    ],
  },
  hodl: {
    allowedPaths: [
      "hodl.buy",
      "hodl.help",
      "hodl.media",
      "hodl.navigation",
      "hodl.start",
      "hodl.transfer",
      "hodl.wallet",
      "hodl.walletFinder",
      "shared.pageSections",
    ],
  },
};

export function createRoutePolicies(): Readonly<
  Record<RouteId, ClientMessagePolicy>
> {
  const policies: Partial<Record<RouteId, ClientMessagePolicy>> = {};
  for (const routeId of routeIds) {
    const routePaths = routeClientPaths[routeId]?.allowedPaths ?? [];
    const allowedPaths = [...sharedClientPaths, ...routePaths];
    const requiredNamespaces = [
      ...new Set(allowedPaths.map((path) => path.split(".", 1)[0])),
    ];
    policies[routeId] = {
      allowedPaths,
      requiredNamespaces,
      requiredPaths: allowedPaths,
    };
  }

  assertClientMessagePolicyCoverage(routeIds, policies);
  return policies;
}

const routePolicies = createRoutePolicies();

type PrerenderManifest = {
  routes?: Record<string, unknown>;
};

type RouteArtifact = {
  kind: "html" | "rsc";
  path: string;
};

function resolveInternalRoute(internalPath: string): {
  locale: Locale;
  routeId: RouteId;
  routeSegments: string[];
} | null {
  const segments = internalPath.split("/").filter(Boolean);
  if (!segments.length) return null;
  const requestedLocale = segments[0];
  const locale = resolveSupportedLocale(requestedLocale);
  if (!locale) return null;
  const pathname =
    segments.length === 1 ? "/" : `/${segments.slice(1).join("/")}`;
  const routeId = getRouteIdForPathname(pathname);
  if (!routeId) return null;
  return {
    locale,
    routeId,
    routeSegments: routeManifest[routeId].pathname.split("/").filter(Boolean),
  };
}

function isLocalizedOpenGraphRoute(internalPath: string): boolean {
  const segments = internalPath.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[1] !== "opengraph-image") return false;
  const requestedLocale = segments[0];
  return resolveSupportedLocale(requestedLocale) !== null;
}

export function listExpectedPrerenderedPageRoutes(): string[] {
  return listLocalizedRoutes()
    .map(
      (route) =>
        `/${route.locale}${route.pathname === "/" ? "" : route.pathname}`,
    )
    .sort();
}

export function validatePrerenderedPageRouteSet(
  prerenderedPaths: readonly string[],
  expectedPaths: readonly string[] = listExpectedPrerenderedPageRoutes(),
): string[] {
  const expected = new Set(expectedPaths);
  const actual = new Set(
    prerenderedPaths.filter((internalPath) => {
      if (isLocalizedOpenGraphRoute(internalPath)) return false;
      const segments = internalPath.split("/").filter(Boolean);
      const requestedLocale = segments[0];
      if (!requestedLocale) return false;
      return resolveSupportedLocale(requestedLocale) !== null;
    }),
  );
  const errors: string[] = [];

  for (const internalPath of [...expected].sort()) {
    if (!actual.has(internalPath)) {
      errors.push(`${internalPath}: registered route is not prerendered`);
    }
  }
  for (const internalPath of [...actual].sort()) {
    if (!expected.has(internalPath)) {
      errors.push(`${internalPath}: unexpected localized page is prerendered`);
    }
  }
  return errors;
}

function resolveRoutePolicy(
  routeId: RouteId,
  locale: Locale,
): ClientMessagePolicy {
  const basePolicy = routePolicies[routeId];
  if (!isAiAvailable(routeId, locale)) return basePolicy;
  return {
    ...basePolicy,
    allowedPaths: [...basePolicy.allowedPaths, "shared.ai"],
    requiredPaths: [...(basePolicy.requiredPaths ?? []), "shared.ai"],
  };
}

async function listFilesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFilesRecursively(path)));
    else files.push(path);
  }
  return files;
}

async function readRouteArtifacts(
  internalPath: string,
): Promise<RouteArtifact[]> {
  const basePath = join(
    nextDirectory,
    "server",
    "app",
    ...internalPath.split("/").filter(Boolean),
  );
  const artifacts: RouteArtifact[] = [
    { kind: "rsc", path: `${basePath}.rsc` },
    { kind: "html", path: `${basePath}.html` },
  ];
  const segmentDirectory = `${basePath}.segments`;
  for (const path of await listFilesRecursively(segmentDirectory)) {
    if (path.endsWith(".rsc")) artifacts.push({ kind: "rsc", path });
  }
  return artifacts;
}

function manifestPathForRoute(routeSegments: readonly string[]): string {
  return join(
    nextDirectory,
    "server",
    "app",
    "[locale]",
    ...routeSegments,
    "page_client-reference-manifest.js",
  );
}

async function validateRoute(
  internalPath: string,
  route: NonNullable<ReturnType<typeof resolveInternalRoute>>,
): Promise<{ artifacts: number; errors: string[] }> {
  const errors: string[] = [];
  const manifestPath = manifestPathForRoute(route.routeSegments);
  const manifestSource = await readFile(manifestPath, "utf8");
  const artifacts = await readRouteArtifacts(internalPath);

  async function* readAuditArtifacts() {
    for (const artifact of artifacts) {
      yield {
        kind: artifact.kind,
        path: relative(repositoryRoot, artifact.path),
        source: await readFile(artifact.path, "utf8"),
        providerRequired:
          artifact.path ===
            join(
              nextDirectory,
              "server",
              "app",
              `${internalPath.slice(1)}.rsc`,
            ) || artifact.kind === "html",
      };
    }
  }

  errors.push(
    ...(await auditClientPayloadArtifacts({
      routePath: internalPath,
      manifestSource,
      artifacts: readAuditArtifacts(),
      policy: resolveRoutePolicy(route.routeId, route.locale as Locale),
      expectedLocale: route.locale,
    })),
  );

  return { artifacts: artifacts.length, errors };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

function readCatalogMessage(catalog: unknown, path: string): string {
  let value = catalog;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`catalog fingerprint ${path} is not a string message`);
    }
    value = (value as Record<string, unknown>)[segment];
  }
  if (typeof value !== "string") {
    throw new Error(`catalog fingerprint ${path} is not a string message`);
  }
  return value;
}

export async function readServerOnlyCatalogFingerprints(
  root = repositoryRoot,
): Promise<string[]> {
  const fingerprints = new Set<string>();

  for (const locale of supportedLocaleCodes) {
    const [errorsCatalog, sharedCatalog, ...routeCatalogs] = await Promise.all([
      readJson(join(root, `messages/${locale}/errors.json`)),
      readJson(join(root, `messages/${locale}/shared.json`)),
      ...routeIds.map((routeId) =>
        readJson(join(root, `messages/${locale}/${routeId}.json`)),
      ),
    ]);
    fingerprints.add(readCatalogMessage(errorsCatalog, "metadata.description"));
    fingerprints.add(
      readCatalogMessage(
        sharedCatalog,
        "structuredData.organizationDescription",
      ),
    );

    for (const catalog of routeCatalogs) {
      fingerprints.add(readCatalogMessage(catalog, "metadata.title"));
      fingerprints.add(readCatalogMessage(catalog, "metadata.description"));
      fingerprints.add(readCatalogMessage(catalog, "openGraph.imageAlt"));
    }
    const homeCatalog = routeCatalogs[routeIds.indexOf("home")];
    fingerprints.add(readCatalogMessage(homeCatalog, "openGraph.tagline"));
  }
  return [...fingerprints].sort();
}

async function validateStaticChunks(): Promise<string[]> {
  const errors: string[] = [];
  const fingerprints = await readServerOnlyCatalogFingerprints();
  const chunksDirectory = join(nextDirectory, "static", "chunks");
  const chunks = (await listFilesRecursively(chunksDirectory)).filter((path) =>
    path.endsWith(".js"),
  );

  for (const chunk of chunks) {
    const source = await readFile(chunk, "utf8");
    for (const fingerprint of fingerprints) {
      if (source.includes(fingerprint)) {
        errors.push(
          `${relative(repositoryRoot, chunk)}: contains a server-only catalog fingerprint`,
        );
      }
    }
  }
  return errors;
}

async function main(): Promise<void> {
  await readFile(join(nextDirectory, "BUILD_ID"), "utf8");
  const prerenderManifest = (await readJson(
    join(nextDirectory, "prerender-manifest.json"),
  )) as PrerenderManifest;
  const prerenderRoutes = prerenderManifest.routes ?? {};
  const errors = validatePrerenderedPageRouteSet(Object.keys(prerenderRoutes));
  const routes = Object.keys(prerenderRoutes)
    .map((internalPath) => ({
      internalPath,
      route: resolveInternalRoute(internalPath),
    }))
    .filter(
      (
        entry,
      ): entry is {
        internalPath: string;
        route: NonNullable<ReturnType<typeof resolveInternalRoute>>;
      } => entry.route !== null,
    )
    .sort((left, right) => left.internalPath.localeCompare(right.internalPath));
  if (!routes.length) {
    throw new Error("prerender manifest contains no localized page routes");
  }

  let artifactCount = 0;
  for (const { internalPath, route } of routes) {
    const result = await validateRoute(internalPath, route);
    artifactCount += result.artifacts;
    errors.push(...result.errors);
  }
  errors.push(...(await validateStaticChunks()));

  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(
    `i18n client payload valid: ${routes.length} routes, ${artifactCount} HTML/RSC artifacts`,
  );
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) await main();
