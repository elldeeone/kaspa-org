import assert from "node:assert/strict";
import test from "node:test";

import { analyzeAppRouteFile } from "../../scripts/i18n/app-route-policy.mts";
import {
  defaultLocale,
  i18nBuildTarget,
  pseudoLocale,
} from "../../src/i18n/config.ts";
import {
  RESERVED_NOT_FOUND_PATHNAME,
  ROUTE_MISS_HEADER,
  isLocaleRouteSetComplete,
  isPathnamePublished,
  routeIds,
  stablePathnames,
} from "../../src/i18n/manifest.ts";
import {
  isNextAsset,
  isOpenGraphImage,
  isRouteMiss,
  sanitizeRoutingHeaders,
  shouldBypassLocaleRouting,
} from "../../src/i18n/proxy-policy.ts";
import {
  NEXT_INTL_LOCALE_HEADER,
  assertPreviewLocaleComplete,
  createRouteMetadata,
  listEnabledLocales,
  listDiscoverableRoutes,
  listPublishedLocales,
  listPublishedRoutes,
  resolvePublishedRoute,
  resolveRouteRequest,
  siteUrl,
} from "../../src/i18n/site.ts";

const previewRouteMatrix = [
  { routeId: "home", locale: "en", canonicalPathname: "/" },
  { routeId: "home", locale: pseudoLocale, canonicalPathname: "/en-XA" },
  { routeId: "lore", locale: "en", canonicalPathname: "/lore" },
  {
    routeId: "lore",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/lore",
  },
  { routeId: "build", locale: "en", canonicalPathname: "/build" },
  {
    routeId: "build",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/build",
  },
  { routeId: "assets", locale: "en", canonicalPathname: "/assets" },
  {
    routeId: "assets",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/assets",
  },
  { routeId: "hodl", locale: "en", canonicalPathname: "/hodl" },
  {
    routeId: "hodl",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/hodl",
  },
] as const;

test("the active build profile keeps discovery English-only", () => {
  const pseudoEnabled = i18nBuildTarget !== "production";
  assert.equal(defaultLocale, "en");
  assert.deepEqual(
    listEnabledLocales(),
    pseudoEnabled ? ["en", pseudoLocale] : ["en"],
  );
  assert.deepEqual(routeIds, ["home", "lore", "build", "assets", "hodl"]);
  assert.deepEqual(stablePathnames, [
    "/",
    "/lore",
    "/build",
    "/assets",
    "/hodl",
  ]);

  for (const routeId of routeIds) {
    assert.deepEqual(
      listPublishedLocales(routeId),
      pseudoEnabled ? ["en", pseudoLocale] : ["en"],
    );
  }
  assert.equal(isLocaleRouteSetComplete("en"), true);
  assert.equal(isLocaleRouteSetComplete(pseudoLocale), pseudoEnabled);
  for (const pathname of stablePathnames) {
    assert.equal(isPathnamePublished(pathname, "en"), true, pathname);
    assert.equal(
      isPathnamePublished(pathname, "en", () => false),
      false,
      `${pathname} unpublished`,
    );
  }
  assert.equal(isPathnamePublished("/es/historia", "en"), false);

  const publishedRoutes = listPublishedRoutes();
  assert.equal(publishedRoutes.length, pseudoEnabled ? 10 : 5);
  assert.deepEqual(
    listDiscoverableRoutes().map((route) => route.canonicalUrl),
    [
      siteUrl,
      `${siteUrl}/lore`,
      `${siteUrl}/build`,
      `${siteUrl}/assets`,
      `${siteUrl}/hodl`,
    ],
  );
  for (const routeId of routeIds) {
    assert.equal(
      resolvePublishedRoute(routeId, pseudoLocale)?.publication ?? null,
      pseudoEnabled ? "preview" : null,
      routeId,
    );
  }
});

test("route resolution accepts only enabled locale prefixes and fixed English slugs", () => {
  const pseudoEnabled = i18nBuildTarget !== "production";
  assert.deepEqual(resolveRouteRequest("/lore"), {
    routeId: "lore",
    locale: "en",
    stablePathname: "/lore",
    hadLocalePrefix: false,
  });
  assert.deepEqual(resolveRouteRequest("/%65%6E//lore/"), {
    routeId: "lore",
    locale: "en",
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/EN"), {
    routeId: "home",
    locale: "en",
    stablePathname: "/",
    hadLocalePrefix: true,
  });
  assert.deepEqual(
    resolveRouteRequest("/en-xa"),
    pseudoEnabled
      ? {
          routeId: "home",
          locale: pseudoLocale,
          stablePathname: "/",
          hadLocalePrefix: true,
        }
      : null,
  );

  for (const pathname of [
    "/es/lore",
    "/es/historia",
    "/en/LORE",
    "/en%2Flore",
    "/en\\lore",
    "/%E0%A4%A",
  ]) {
    assert.equal(resolveRouteRequest(pathname), null, pathname);
  }
});

test(
  "Preview publishes the exact complete private pseudo route matrix",
  { skip: i18nBuildTarget === "production" },
  () => {
    assert.doesNotThrow(() => assertPreviewLocaleComplete(pseudoLocale));
    assert.deepEqual(
      listPublishedRoutes().map(({ routeId, locale, canonicalPathname }) => ({
        routeId,
        locale,
        canonicalPathname,
      })),
      previewRouteMatrix,
    );

    for (const routeId of routeIds) {
      const stablePathname = stablePathnames[routeIds.indexOf(routeId)];
      const localizedPathname =
        stablePathname === "/"
          ? `/${pseudoLocale}`
          : `/${pseudoLocale}${stablePathname}`;
      const route = resolvePublishedRoute(routeId, pseudoLocale);
      assert.ok(route);
      assert.equal(route.pathname, stablePathname);
      assert.equal(route.canonicalPathname, localizedPathname);
      assert.deepEqual(resolveRouteRequest(localizedPathname), {
        routeId,
        locale: pseudoLocale,
        stablePathname,
        hadLocalePrefix: true,
      });

      const metadata = createRouteMetadata(routeId, pseudoLocale);
      assert.ok(metadata);
      assert.deepEqual(metadata.alternates, {
        canonical: null,
        languages: undefined,
      });
      assert.equal(metadata.openGraph, undefined);
      assert.equal(metadata.twitter, undefined);
      assert.deepEqual(metadata.robots, { index: false, follow: false });
    }

    assert.equal(resolveRouteRequest(`/${pseudoLocale}/historia`), null);
  },
);

test("published route contexts and English metadata share one authority", () => {
  const expected = {
    home: {
      pathname: "/",
      title: "Kaspa | Proof-of-Work blockDAG for Real-Time Decentralization",
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG cryptocurrency running at 10 blocks per second, built for real-time decentralization.",
    },
    lore: {
      pathname: "/lore",
      title: "LORE | Kaspa",
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG focused on real-time decentralization, with no premine, no insider allocation, and 10 BPS mainnet performance.",
    },
    build: {
      pathname: "/build",
      title: "Kaspa Developer Docs, SDKs, APIs, and Node Access | Kaspa",
      description:
        "Everything you need to start building on Kaspa. WASM SDK, Rust libraries, live API playground, node access, and developer tooling.",
    },
    assets: {
      pathname: "/assets",
      title: "Kaspa Logos & Assets | Kaspa",
      description:
        "Download the official Kaspa logo set — horizontal and stacked lockups, the icon, and brand colors. SVG and high-resolution PNG.",
    },
    hodl: {
      pathname: "/hodl",
      title: "Buy KAS, Set Up a Wallet, and Self-Custody | Kaspa",
      description: "Get a wallet, buy KAS, and transfer to self-custody.",
    },
  } as const;

  for (const routeId of routeIds) {
    const route = resolvePublishedRoute(routeId, "en");
    assert.ok(route);
    assert.equal(route.pathname, expected[routeId].pathname);
    assert.equal(route.localeDefinition.dir, "ltr");
    assert.equal(route.canonicalPathname, expected[routeId].pathname);

    const metadata = createRouteMetadata(routeId, "en");
    assert.ok(metadata);
    assert.equal(metadata.title, expected[routeId].title);
    assert.equal(metadata.description, expected[routeId].description);
    assert.equal(metadata.applicationName, "Kaspa");
    assert.deepEqual(metadata.alternates, {
      canonical: expected[routeId].pathname,
      languages: undefined,
    });
    assert.equal(metadata.openGraph?.title, expected[routeId].title);
    assert.equal(metadata.twitter?.title, expected[routeId].title);
  }
});

test("the route-miss policy is collision-safe and spoof-resistant", () => {
  assert.equal(isRouteMiss("/lore"), false);
  assert.equal(
    isRouteMiss("/lore", () => false),
    true,
  );
  assert.equal(isRouteMiss("/missing"), true);
  assert.equal(isRouteMiss("/es/lore"), true);
  assert.equal(isRouteMiss("/missing.txt"), true);
  assert.equal(isRouteMiss("/api/nope"), true);
  assert.equal(isRouteMiss(RESERVED_NOT_FOUND_PATHNAME), false);
  assert.equal(isRouteMiss("/opengraph-image"), false);
  assert.equal(isRouteMiss("/en/opengraph-image"), false);
  assert.equal(isRouteMiss("/_next/static/chunk.js"), false);

  const sanitized = sanitizeRoutingHeaders({
    [ROUTE_MISS_HEADER]: "1",
    [NEXT_INTL_LOCALE_HEADER]: "es",
    "x-keep-me": "yes",
  });
  assert.equal(sanitized.has(ROUTE_MISS_HEADER), false);
  assert.equal(sanitized.has(NEXT_INTL_LOCALE_HEADER), false);
  assert.equal(sanitized.get("x-keep-me"), "yes");
});

test("framework bypasses are explicit and do not collide with OG or Next assets", () => {
  for (const pathname of [
    "/api/ask",
    "/_next/static/chunk.js",
    "/_vercel/insights",
    "/icon.svg",
    "/opengraph-image",
    "/en/opengraph-image",
  ]) {
    assert.equal(shouldBypassLocaleRouting(pathname), true, pathname);
  }

  assert.equal(shouldBypassLocaleRouting("/lore"), false);
  assert.equal(isOpenGraphImage("/en/opengraph-image"), true);
  assert.equal(isOpenGraphImage("/en/opengraph-image/extra"), false);
  assert.equal(isNextAsset("/_next/image"), true);
  assert.equal(isNextAsset("/_next/data/example.json"), false);
});

test("App Router analysis exposes unmodelled and reserved-route collisions", () => {
  const localizedRoute = analyzeAppRouteFile(
    "[locale]/lore/page.tsx",
    defaultLocale,
  );
  assert.equal(localizedRoute.representativePathname, "/en/lore");
  assert.equal(
    localizedRoute.pathnamePattern.test(RESERVED_NOT_FOUND_PATHNAME),
    false,
  );

  const publicDynamicRoute = analyzeAppRouteFile(
    "blog/[slug]/page.tsx",
    defaultLocale,
  );
  assert.equal(publicDynamicRoute.representativePathname, "/blog/example");
  assert.equal(
    shouldBypassLocaleRouting(publicDynamicRoute.representativePathname),
    false,
  );

  const apiCatchAll = analyzeAppRouteFile(
    "api/[...path]/route.ts",
    defaultLocale,
  );
  assert.equal(apiCatchAll.representativePathname, "/api/example/child");
  assert.equal(
    shouldBypassLocaleRouting(apiCatchAll.representativePathname),
    true,
  );

  const rootCatchAll = analyzeAppRouteFile("[...path]/page.tsx", defaultLocale);
  assert.equal(
    rootCatchAll.pathnamePattern.test(RESERVED_NOT_FOUND_PATHNAME),
    true,
  );
});
