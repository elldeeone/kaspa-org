import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import { resolveLocale, type Locale } from "../../src/i18n/config.ts";
import {
  getRouteIdForPathname,
  routeIds,
  routeManifest,
  type RouteId,
} from "../../src/i18n/manifest.ts";
import { isAiAvailable, listPublishedRoutes } from "../../src/i18n/site.ts";
import {
  assertClientMessagePolicyCoverage,
  decodeEmbeddedFlight,
  extractNextIntlProviderPayloads,
  validateClientMessagePayloads,
  type ClientMessagePolicy,
  type NextIntlProviderPayload,
} from "./client-payload-policy.mts";

const repositoryRoot = process.cwd();
const nextDirectory = join(repositoryRoot, ".next");

const sharedClientPaths = [
  "shared.footer",
  "shared.logoMenu",
  "shared.navigation",
  "shared.theme",
] as const;

const routePolicies = {
  home: {
    allowedPaths: sharedClientPaths,
    requiredNamespaces: ["shared"],
    requiredPaths: sharedClientPaths,
  },
  lore: {
    allowedPaths: sharedClientPaths,
    requiredNamespaces: ["shared"],
    requiredPaths: sharedClientPaths,
  },
  build: {
    allowedPaths: sharedClientPaths,
    requiredNamespaces: ["shared"],
    requiredPaths: sharedClientPaths,
  },
  assets: {
    allowedPaths: sharedClientPaths,
    requiredNamespaces: ["shared"],
    requiredPaths: sharedClientPaths,
  },
  hodl: {
    allowedPaths: sharedClientPaths,
    requiredNamespaces: ["shared"],
    requiredPaths: sharedClientPaths,
  },
} as const satisfies Record<RouteId, ClientMessagePolicy>;

assertClientMessagePolicyCoverage(routeIds, routePolicies);

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
  const locale = resolveLocale(segments[0]);
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
  const payloads: NextIntlProviderPayload[] = [];

  for (const artifact of artifacts) {
    const source = await readFile(artifact.path, "utf8");
    const flight =
      artifact.kind === "html" ? decodeEmbeddedFlight(source) : source;
    const artifactPayloads = extractNextIntlProviderPayloads(
      manifestSource,
      flight,
    );
    if (
      (artifact.path ===
        join(nextDirectory, "server", "app", `${internalPath.slice(1)}.rsc`) ||
        artifact.kind === "html") &&
      !artifactPayloads.length
    ) {
      errors.push(
        `${relative(repositoryRoot, artifact.path)}: no NextIntlClientProvider payload found`,
      );
    }
    payloads.push(...artifactPayloads);
  }

  for (const issue of validateClientMessagePayloads(
    payloads,
    resolveRoutePolicy(route.routeId, route.locale as Locale),
  )) {
    errors.push(`${internalPath}: ${issue}`);
  }
  for (const payload of payloads) {
    if (payload.locale !== route.locale) {
      errors.push(
        `${internalPath}: provider locale ${JSON.stringify(payload.locale)} does not match ${route.locale}`,
      );
    }
  }

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

async function validateStaticChunks(): Promise<string[]> {
  const errors: string[] = [];
  const [errorsCatalog, homeCatalog, sharedCatalog] = await Promise.all([
    readJson(join(repositoryRoot, "messages/en/errors.json")),
    readJson(join(repositoryRoot, "messages/en/home.json")),
    readJson(join(repositoryRoot, "messages/en/shared.json")),
  ]);
  const fingerprints = [
    readCatalogMessage(errorsCatalog, "metadata.description"),
    readCatalogMessage(homeCatalog, "metadata.title"),
    readCatalogMessage(homeCatalog, "openGraph.tagline"),
    readCatalogMessage(sharedCatalog, "structuredData.organizationDescription"),
  ];
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

  const errors: string[] = [];
  for (const route of listPublishedRoutes()) {
    const internalPath = `/${route.locale}${route.pathname === "/" ? "" : route.pathname}`;
    if (!Object.hasOwn(prerenderRoutes, internalPath)) {
      errors.push(`${internalPath}: published route is not prerendered`);
    }
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

await main();
