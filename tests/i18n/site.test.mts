import assert from "node:assert/strict";
import test from "node:test";

import { analyzeAppRouteFile } from "../../scripts/i18n/app-route-policy.mts";
import { serializeJsonLd } from "../../src/i18n/document.ts";
import { i18nBuildTarget, resolveLocale } from "../../src/i18n/config.ts";
import {
  defaultLocale,
  localeRegistry,
  pseudoLocale,
  resolveSupportedLocale,
  spanishLocale,
  supportedLocaleCodes,
} from "../../src/i18n/locale-registry.ts";
import {
  isLifecycleEnabledForTarget,
  isLifecycleSelectable,
} from "../../src/i18n/locale-registry.ts";
import {
  RESERVED_NOT_FOUND_PATHNAME,
  ROUTE_MISS_HEADER,
  localizedDestinationInventory,
  routeIds,
  stablePathnames,
} from "../../src/i18n/manifest.ts";
import { spanishMessages } from "../../src/i18n/messages.ts";
import {
  isLocaleRouteSetComplete,
  isPathnamePublished,
} from "../../src/i18n/publication.ts";
import {
  createOpenGraphImageDescriptor,
  createOpenGraphRenderContract,
} from "../../src/i18n/opengraph-contract.ts";
import {
  isNextAsset,
  isOpenGraphImage,
  isRouteMiss,
  isStaticStylePathname,
  sanitizeRoutingHeaders,
  shouldBypassLocaleRouting,
} from "../../src/i18n/proxy-policy.ts";
import {
  createRouteMetadata,
  listEnabledLocales,
  listSelectableLocales,
  listDiscoverableRoutes,
  listPublishedLocales,
  listPublishedRoutes,
  resolvePublishedRoute,
  siteUrl,
} from "../../src/i18n/site.ts";
import { isAiAvailable } from "../../src/i18n/site-capabilities.ts";
import {
  NEXT_INTL_LOCALE_HEADER,
  resolveRouteRequest,
} from "../../src/i18n/route-request.ts";
import {
  assertPreviewLocaleComplete,
  assertProductionLocaleComplete,
  listProductionLocales,
} from "../../src/i18n/site-validation.ts";

const completeRouteMatrix = [
  { routeId: "home", locale: "en", canonicalPathname: "/" },
  { routeId: "home", locale: pseudoLocale, canonicalPathname: "/en-XA" },
  { routeId: "home", locale: spanishLocale, canonicalPathname: "/es" },
  { routeId: "lore", locale: "en", canonicalPathname: "/lore" },
  {
    routeId: "lore",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/lore",
  },
  {
    routeId: "lore",
    locale: spanishLocale,
    canonicalPathname: "/es/lore",
  },
  { routeId: "build", locale: "en", canonicalPathname: "/build" },
  {
    routeId: "build",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/build",
  },
  {
    routeId: "build",
    locale: spanishLocale,
    canonicalPathname: "/es/build",
  },
  { routeId: "assets", locale: "en", canonicalPathname: "/assets" },
  {
    routeId: "assets",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/assets",
  },
  {
    routeId: "assets",
    locale: spanishLocale,
    canonicalPathname: "/es/assets",
  },
  { routeId: "hodl", locale: "en", canonicalPathname: "/hodl" },
  {
    routeId: "hodl",
    locale: pseudoLocale,
    canonicalPathname: "/en-XA/hodl",
  },
  {
    routeId: "hodl",
    locale: spanishLocale,
    canonicalPathname: "/es/hodl",
  },
] as const;

test("JSON-LD serialization cannot terminate its script element", () => {
  assert.equal(
    serializeJsonLd({ value: "</script><script>alert(1)</script>" }),
    '{"value":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}',
  );
});

test("the active build profile publishes approved Spanish atomically", () => {
  const pseudoEnabled = i18nBuildTarget !== "production";
  assert.equal(defaultLocale, "en");
  assert.deepEqual(supportedLocaleCodes, ["en", pseudoLocale, spanishLocale]);
  assert.equal(localeRegistry.en.lifecycle, "production");
  assert.equal(localeRegistry[spanishLocale].lifecycle, "production");
  assert.equal(localeRegistry[pseudoLocale].lifecycle, "test-only");
  assert.equal(resolveSupportedLocale("ES"), spanishLocale);
  assert.equal(resolveLocale("es"), spanishLocale);
  assert.deepEqual(
    listEnabledLocales(),
    pseudoEnabled ? ["en", pseudoLocale, spanishLocale] : ["en", spanishLocale],
  );
  assert.deepEqual(listSelectableLocales(), ["en", spanishLocale]);
  assert.deepEqual(listProductionLocales(), ["en", spanishLocale]);
  assert.deepEqual(routeIds, ["home", "lore", "build", "assets", "hodl"]);
  assert.deepEqual(stablePathnames, [
    "/",
    "/lore",
    "/build",
    "/assets",
    "/hodl",
  ]);
  assert.deepEqual(localizedDestinationInventory, {
    navigationHome: { pathname: "/" },
    navigationLore: { pathname: "/lore" },
    navigationHodl: { pathname: "/hodl" },
    navigationBuild: { pathname: "/build" },
    logoAssets: { pathname: "/assets" },
    homeGetStarted: { pathname: "/lore" },
    homeGetWallet: { pathname: "/hodl", hash: "wallet" },
    homeBuyKaspa: { pathname: "/hodl", hash: "buy" },
    notFoundHome: { pathname: "/" },
  });

  for (const routeId of routeIds) {
    assert.deepEqual(
      listPublishedLocales(routeId),
      pseudoEnabled
        ? ["en", pseudoLocale, spanishLocale]
        : ["en", spanishLocale],
    );
  }
  assert.equal(isLocaleRouteSetComplete("en"), true);
  assert.equal(isLocaleRouteSetComplete(pseudoLocale), pseudoEnabled);
  assert.equal(isLocaleRouteSetComplete(spanishLocale), true);
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
  assert.equal(publishedRoutes.length, pseudoEnabled ? 15 : 10);
  assert.deepEqual(
    listDiscoverableRoutes().map((route) => route.canonicalUrl),
    [
      siteUrl,
      `${siteUrl}/es`,
      `${siteUrl}/lore`,
      `${siteUrl}/es/lore`,
      `${siteUrl}/build`,
      `${siteUrl}/es/build`,
      `${siteUrl}/assets`,
      `${siteUrl}/es/assets`,
      `${siteUrl}/hodl`,
      `${siteUrl}/es/hodl`,
    ],
  );
  for (const routeId of routeIds) {
    assert.equal(
      resolvePublishedRoute(routeId, pseudoLocale)?.publication ?? null,
      pseudoEnabled ? "preview" : null,
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, spanishLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(isAiAvailable(routeId, spanishLocale), false, routeId);
  }
  assert.doesNotThrow(() => assertProductionLocaleComplete(spanishLocale));
  assert.throws(
    () =>
      assertProductionLocaleComplete(spanishLocale, (routeId, locale) =>
        routeId === "assets"
          ? null
          : (resolvePublishedRoute(routeId, locale)?.publication ?? null),
      ),
    /logoAssets:es requires public destination \/assets/u,
  );
});

test("locale lifecycle states map to build targets without partial routes", () => {
  for (const target of ["production", "preview", "test"] as const) {
    assert.equal(isLifecycleEnabledForTarget("production", target), true);
    assert.equal(
      isLifecycleEnabledForTarget("preview", target),
      target !== "production",
    );
    assert.equal(
      isLifecycleEnabledForTarget("test-only", target),
      target !== "production",
    );
    assert.equal(isLifecycleEnabledForTarget("disabled", target), false);
  }
  assert.equal(isLifecycleSelectable("production"), true);
  assert.equal(isLifecycleSelectable("preview"), true);
  assert.equal(isLifecycleSelectable("test-only"), false);
  assert.equal(isLifecycleSelectable("disabled"), false);

  const spanishPublications = routeIds.map(
    (routeId) => resolvePublishedRoute(routeId, spanishLocale)?.publication,
  );
  assert.deepEqual(
    spanishPublications,
    routeIds.map(() => "public"),
  );
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
  assert.deepEqual(resolveRouteRequest("/ES/lore"), {
    routeId: "lore",
    locale: spanishLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });

  for (const pathname of [
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
  "non-production builds add a private pseudo locale beside public Spanish",
  { skip: i18nBuildTarget === "production" },
  () => {
    assert.doesNotThrow(() => assertPreviewLocaleComplete(pseudoLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(spanishLocale));
    assert.deepEqual(
      listPublishedRoutes().map(({ routeId, locale, canonicalPathname }) => ({
        routeId,
        locale,
        canonicalPathname,
      })),
      completeRouteMatrix,
    );

    for (const privateLocale of [pseudoLocale] as const) {
      for (const routeId of routeIds) {
        const stablePathname = stablePathnames[routeIds.indexOf(routeId)];
        const localizedPathname =
          stablePathname === "/"
            ? `/${privateLocale}`
            : `/${privateLocale}${stablePathname}`;
        const route = resolvePublishedRoute(routeId, privateLocale);
        assert.ok(route);
        assert.equal(route.pathname, stablePathname);
        assert.equal(route.canonicalPathname, localizedPathname);
        assert.deepEqual(resolveRouteRequest(localizedPathname), {
          routeId,
          locale: privateLocale,
          stablePathname,
          hadLocalePrefix: true,
        });

        const metadata = createRouteMetadata(routeId, privateLocale);
        assert.ok(metadata);
        assert.deepEqual(metadata.alternates, {
          canonical: null,
          languages: undefined,
        });
        assert.equal(metadata.openGraph, undefined);
        assert.equal(metadata.twitter, undefined);
        assert.deepEqual(metadata.robots, { index: false, follow: false });
      }

      assert.equal(resolveRouteRequest(`/${privateLocale}/historia`), null);
    }

    for (const routeId of routeIds) {
      const route = resolvePublishedRoute(routeId, spanishLocale);
      assert.ok(route);
      const englishUrl = `${siteUrl}${route.pathname}`;
      const spanishUrl = `${siteUrl}${route.canonicalPathname}`;
      const xDefault =
        route.pathname === "/" ? siteUrl : `${siteUrl}${route.pathname}`;
      const metadata = createRouteMetadata(routeId, spanishLocale);
      assert.ok(metadata);
      assert.deepEqual(metadata.alternates, {
        canonical: route.canonicalPathname,
        languages: {
          en: englishUrl,
          es: spanishUrl,
          "x-default": xDefault,
        },
      });
      assert.equal(metadata.robots, undefined);
      assert.ok(metadata.openGraph);
      assert.ok(metadata.twitter);
    }

    assert.deepEqual(createOpenGraphRenderContract(spanishLocale), {
      headingLines: spanishMessages.home.openGraph.heading.split("\n"),
      tagline: spanishMessages.home.openGraph.tagline,
      layout: "localized",
    });
    for (const routeId of routeIds) {
      assert.deepEqual(createOpenGraphImageDescriptor(routeId, spanishLocale), {
        url: "/es/opengraph-image",
        width: 1200,
        height: 630,
        alt: spanishMessages[routeId].openGraph.imageAlt,
        ...(routeId === "home" ? { type: "image/png" } : {}),
      });
    }
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
      languages: {
        en: `${siteUrl}${expected[routeId].pathname}`,
        es: `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/es"
            : `/es${expected[routeId].pathname}`
        }`,
        "x-default":
          expected[routeId].pathname === "/"
            ? siteUrl
            : `${siteUrl}${expected[routeId].pathname}`,
      },
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
  assert.equal(isRouteMiss("/es/lore"), false);
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
    "/es/missing%2Etxt",
    "/opengraph-image",
    "/en/opengraph-image",
  ]) {
    assert.equal(shouldBypassLocaleRouting(pathname), true, pathname);
  }

  assert.equal(shouldBypassLocaleRouting("/lore"), false);
  assert.equal(shouldBypassLocaleRouting("/broken%encoding"), true);
  assert.equal(isStaticStylePathname("/es/missing%2Etxt"), true);
  assert.equal(isStaticStylePathname("/es/lore"), false);
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
