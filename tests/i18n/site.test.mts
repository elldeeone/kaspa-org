import assert from "node:assert/strict";
import test from "node:test";

import { analyzeAppRouteFile } from "../../scripts/i18n/app-route-policy.mts";
import { serializeJsonLd } from "../../src/i18n/document.ts";
import { resolveLocale } from "../../src/i18n/config.ts";
import {
  defaultLocale,
  localeRegistry,
  resolveSupportedLocale,
  spanishLocale,
  supportedLocaleCodes,
  type Locale,
} from "../../src/i18n/locale-registry.ts";
import {
  RESERVED_NOT_FOUND_PATHNAME,
  ROUTE_MISS_HEADER,
  routeIds,
  routeManifest,
  type RouteId,
} from "../../src/i18n/manifest.ts";
import { spanishMessages } from "../../src/i18n/messages.ts";
import {
  createOpenGraphHeadingStyle,
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
  listLocalizedRoutes,
  resolveLocalizedRoute,
  siteUrl,
} from "../../src/i18n/site.ts";
import { isAiAvailable } from "../../src/i18n/site-capabilities.ts";
import {
  NEXT_INTL_LOCALE_HEADER,
  resolveRouteRequest,
} from "../../src/i18n/route-request.ts";
import { assertLocaleComplete } from "../../src/i18n/site-validation.ts";

function expectedCanonicalPathname(routeId: RouteId, locale: Locale): string {
  const pathname = routeManifest[routeId].pathname;
  if (locale === defaultLocale) return pathname;
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

function expectedLanguageAlternatives(routeId: RouteId) {
  const defaultPathname = expectedCanonicalPathname(routeId, defaultLocale);
  return {
    ...Object.fromEntries(
      supportedLocaleCodes.map((locale) => [
        localeRegistry[locale].hrefLang,
        `${siteUrl}${expectedCanonicalPathname(routeId, locale)}`,
      ]),
    ),
    "x-default":
      defaultPathname === "/" ? siteUrl : `${siteUrl}${defaultPathname}`,
  };
}

const completeRouteMatrix = routeIds.flatMap((routeId) =>
  supportedLocaleCodes.map((locale) => ({
    routeId,
    locale,
    canonicalPathname: expectedCanonicalPathname(routeId, locale),
  })),
);

test("JSON-LD serialization cannot terminate its script element", () => {
  assert.equal(
    serializeJsonLd({ value: "</script><script>alert(1)</script>" }),
    '{"value":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}',
  );
});

test("every registered locale publishes the complete route set", () => {
  assert.equal(defaultLocale, "en");
  assert.deepEqual(localeRegistry[spanishLocale], {
    code: spanishLocale,
    label: "Español",
    hrefLang: "es",
    dir: "ltr",
  });
  assert.equal(resolveSupportedLocale("ES"), spanishLocale);
  assert.equal(resolveLocale("es"), spanishLocale);
  for (const routeId of routeIds) {
    assert.equal(isAiAvailable(routeId, spanishLocale), false, routeId);
  }

  assert.deepEqual(
    listLocalizedRoutes().map(({ routeId, locale, canonicalPathname }) => ({
      routeId,
      locale,
      canonicalPathname,
    })),
    completeRouteMatrix,
  );
  assert.deepEqual(
    listLocalizedRoutes().map((route) => route.canonicalUrl),
    completeRouteMatrix.map(({ canonicalPathname }) =>
      canonicalPathname === "/" ? siteUrl : `${siteUrl}${canonicalPathname}`,
    ),
  );
  assert.doesNotThrow(() => assertLocaleComplete("en"));
  assert.doesNotThrow(() => assertLocaleComplete(spanishLocale));
});

test("route resolution accepts only registered locale prefixes and fixed English slugs", () => {
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
  assert.equal(resolveRouteRequest("/en-xa"), null);
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

test("Spanish metadata and Open Graph output are public", () => {
  for (const routeId of routeIds) {
    const route = resolveLocalizedRoute(routeId, spanishLocale);
    const metadata = createRouteMetadata(routeId, spanishLocale);
    assert.deepEqual(metadata.alternates, {
      canonical: route.canonicalPathname,
      languages: expectedLanguageAlternatives(routeId),
    });
    assert.ok(metadata.openGraph);
    assert.ok(metadata.twitter);
  }

  const spanishHeadingLines =
    spanishMessages.home.openGraph.heading.split("\n");
  assert.deepEqual(createOpenGraphRenderContract(spanishLocale), {
    headingLines: spanishHeadingLines,
    headingStyle: createOpenGraphHeadingStyle(spanishHeadingLines),
    tagline: spanishMessages.home.openGraph.tagline,
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
});

test("Open Graph heading typography fits content without locale branches", () => {
  const sharedWrapping = {
    letterSpacing: "-0.02em",
    lineHeight: 1,
    overflowWrap: "anywhere",
    wordBreak: "normal",
  } as const;
  const english = createOpenGraphHeadingStyle([
    "Real-time",
    "Decentralization",
  ]);
  const spanish = createOpenGraphHeadingStyle([
    "Descentralización",
    "en tiempo real",
  ]);
  assert.deepEqual(english, { fontSize: 131, ...sharedWrapping });
  assert.deepEqual(
    {
      letterSpacing: spanish.letterSpacing,
      lineHeight: spanish.lineHeight,
      overflowWrap: spanish.overflowWrap,
      wordBreak: spanish.wordBreak,
    },
    sharedWrapping,
  );
  assert.ok(spanish.fontSize < english.fontSize);
});

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
    const route = resolveLocalizedRoute(routeId, "en");
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
      languages: expectedLanguageAlternatives(routeId),
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
