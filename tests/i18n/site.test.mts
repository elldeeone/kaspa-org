import assert from "node:assert/strict";
import test from "node:test";

import { analyzeAppRouteFile } from "../../scripts/i18n/app-route-policy.mts";
import { serializeJsonLd } from "../../src/i18n/document.ts";
import { i18nBuildTarget, resolveLocale } from "../../src/i18n/config.ts";
import {
  brazilianPortugueseLocale,
  chineseLocale,
  defaultLocale,
  frenchLocale,
  germanLocale,
  indonesianLocale,
  japaneseLocale,
  koreanLocale,
  localeRegistry,
  pseudoLocale,
  resolveSupportedLocale,
  russianLocale,
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
import {
  brazilianPortugueseMessages,
  chineseMessages,
  frenchMessages,
  germanMessages,
  indonesianMessages,
  japaneseMessages,
  koreanMessages,
  russianMessages,
  spanishMessages,
} from "../../src/i18n/messages.ts";
import {
  getNonHtmlRobotsHeader,
  isLocaleRouteSetComplete,
  isPathnamePublished,
} from "../../src/i18n/publication.ts";
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

const pseudoEnabled = i18nBuildTarget === "test";
const expectedEnabledLocales =
  i18nBuildTarget === "test"
    ? ([
        "en",
        pseudoLocale,
        spanishLocale,
        germanLocale,
        frenchLocale,
        chineseLocale,
        russianLocale,
        indonesianLocale,
        brazilianPortugueseLocale,
        japaneseLocale,
        koreanLocale,
      ] as const)
    : i18nBuildTarget === "preview"
      ? ([
          "en",
          spanishLocale,
          germanLocale,
          frenchLocale,
          chineseLocale,
          russianLocale,
          indonesianLocale,
          brazilianPortugueseLocale,
          japaneseLocale,
          koreanLocale,
        ] as const)
      : ([
          "en",
          spanishLocale,
          germanLocale,
          frenchLocale,
          chineseLocale,
          russianLocale,
          indonesianLocale,
          brazilianPortugueseLocale,
          japaneseLocale,
          koreanLocale,
        ] as const);
const completeRouteMatrix = routeIds.flatMap((routeId, index) => {
  const stablePathname = stablePathnames[index];
  return expectedEnabledLocales.map((locale) => ({
    routeId,
    locale,
    canonicalPathname:
      locale === "en"
        ? stablePathname
        : stablePathname === "/"
          ? `/${locale}`
          : `/${locale}${stablePathname}`,
  }));
});

test("JSON-LD serialization cannot terminate its script element", () => {
  assert.equal(
    serializeJsonLd({ value: "</script><script>alert(1)</script>" }),
    '{"value":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}',
  );
});

test("the active build profile publishes and previews locales atomically", () => {
  assert.equal(defaultLocale, "en");
  assert.deepEqual(supportedLocaleCodes, [
    "en",
    pseudoLocale,
    spanishLocale,
    germanLocale,
    frenchLocale,
    chineseLocale,
    russianLocale,
    indonesianLocale,
    brazilianPortugueseLocale,
    japaneseLocale,
    koreanLocale,
  ]);
  assert.equal(localeRegistry.en.lifecycle, "production");
  assert.equal(localeRegistry[spanishLocale].lifecycle, "production");
  assert.equal(localeRegistry[pseudoLocale].lifecycle, "test-only");
  assert.equal(localeRegistry[germanLocale].lifecycle, "production");
  assert.equal(localeRegistry[frenchLocale].lifecycle, "production");
  assert.equal(localeRegistry[chineseLocale].lifecycle, "production");
  assert.equal(localeRegistry[russianLocale].lifecycle, "production");
  assert.equal(localeRegistry[indonesianLocale].lifecycle, "production");
  assert.equal(
    localeRegistry[brazilianPortugueseLocale].lifecycle,
    "production",
  );
  assert.equal(localeRegistry[japaneseLocale].lifecycle, "production");
  assert.equal(localeRegistry[koreanLocale].lifecycle, "production");
  assert.equal(resolveSupportedLocale("ES"), spanishLocale);
  assert.equal(resolveSupportedLocale("DE"), germanLocale);
  assert.equal(resolveSupportedLocale("FR"), frenchLocale);
  assert.equal(resolveSupportedLocale("ZH-cn"), chineseLocale);
  assert.equal(resolveSupportedLocale("RU"), russianLocale);
  assert.equal(resolveSupportedLocale("ID-id"), indonesianLocale);
  assert.equal(resolveSupportedLocale("PT-br"), brazilianPortugueseLocale);
  assert.equal(resolveSupportedLocale("JA"), japaneseLocale);
  assert.equal(resolveSupportedLocale("KO"), koreanLocale);
  assert.equal(resolveLocale("es"), spanishLocale);
  assert.equal(resolveLocale("de"), germanLocale);
  assert.equal(resolveLocale("fr"), frenchLocale);
  assert.equal(resolveLocale("zh-CN"), chineseLocale);
  assert.equal(resolveLocale("ru"), russianLocale);
  assert.equal(resolveLocale("id-ID"), indonesianLocale);
  assert.equal(resolveLocale("pt-BR"), brazilianPortugueseLocale);
  assert.equal(resolveLocale("JA"), japaneseLocale);
  assert.equal(resolveLocale("ko"), koreanLocale);
  assert.deepEqual(listEnabledLocales(), expectedEnabledLocales);
  assert.deepEqual(
    listSelectableLocales(),
    expectedEnabledLocales.filter((locale) => locale !== pseudoLocale),
  );
  assert.deepEqual(listProductionLocales(), [
    "en",
    spanishLocale,
    germanLocale,
    frenchLocale,
    chineseLocale,
    russianLocale,
    indonesianLocale,
    brazilianPortugueseLocale,
    japaneseLocale,
    koreanLocale,
  ]);
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
    assert.deepEqual(listPublishedLocales(routeId), expectedEnabledLocales);
  }
  assert.equal(isLocaleRouteSetComplete("en"), true);
  assert.equal(isLocaleRouteSetComplete(pseudoLocale), pseudoEnabled);
  assert.equal(isLocaleRouteSetComplete(spanishLocale), true);
  assert.equal(isLocaleRouteSetComplete(germanLocale), true);
  assert.equal(isLocaleRouteSetComplete(frenchLocale), true);
  assert.equal(isLocaleRouteSetComplete(chineseLocale), true);
  assert.equal(isLocaleRouteSetComplete(russianLocale), true);
  assert.equal(isLocaleRouteSetComplete(indonesianLocale), true);
  assert.equal(isLocaleRouteSetComplete(brazilianPortugueseLocale), true);
  assert.equal(isLocaleRouteSetComplete(japaneseLocale), true);
  assert.equal(isLocaleRouteSetComplete(koreanLocale), true);
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
  assert.equal(publishedRoutes.length, expectedEnabledLocales.length * 5);
  assert.deepEqual(
    listDiscoverableRoutes().map((route) => route.canonicalUrl),
    [
      siteUrl,
      `${siteUrl}/es`,
      `${siteUrl}/de`,
      `${siteUrl}/fr`,
      `${siteUrl}/zh-CN`,
      `${siteUrl}/ru`,
      `${siteUrl}/id-ID`,
      `${siteUrl}/pt-BR`,
      `${siteUrl}/ja`,
      `${siteUrl}/ko`,
      `${siteUrl}/lore`,
      `${siteUrl}/es/lore`,
      `${siteUrl}/de/lore`,
      `${siteUrl}/fr/lore`,
      `${siteUrl}/zh-CN/lore`,
      `${siteUrl}/ru/lore`,
      `${siteUrl}/id-ID/lore`,
      `${siteUrl}/pt-BR/lore`,
      `${siteUrl}/ja/lore`,
      `${siteUrl}/ko/lore`,
      `${siteUrl}/build`,
      `${siteUrl}/es/build`,
      `${siteUrl}/de/build`,
      `${siteUrl}/fr/build`,
      `${siteUrl}/zh-CN/build`,
      `${siteUrl}/ru/build`,
      `${siteUrl}/id-ID/build`,
      `${siteUrl}/pt-BR/build`,
      `${siteUrl}/ja/build`,
      `${siteUrl}/ko/build`,
      `${siteUrl}/assets`,
      `${siteUrl}/es/assets`,
      `${siteUrl}/de/assets`,
      `${siteUrl}/fr/assets`,
      `${siteUrl}/zh-CN/assets`,
      `${siteUrl}/ru/assets`,
      `${siteUrl}/id-ID/assets`,
      `${siteUrl}/pt-BR/assets`,
      `${siteUrl}/ja/assets`,
      `${siteUrl}/ko/assets`,
      `${siteUrl}/hodl`,
      `${siteUrl}/es/hodl`,
      `${siteUrl}/de/hodl`,
      `${siteUrl}/fr/hodl`,
      `${siteUrl}/zh-CN/hodl`,
      `${siteUrl}/ru/hodl`,
      `${siteUrl}/id-ID/hodl`,
      `${siteUrl}/pt-BR/hodl`,
      `${siteUrl}/ja/hodl`,
      `${siteUrl}/ko/hodl`,
    ],
  );
  for (const routeId of routeIds) {
    assert.equal(
      resolvePublishedRoute(routeId, pseudoLocale)?.publication ?? null,
      pseudoEnabled ? "preview" : null,
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, chineseLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, russianLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, indonesianLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, koreanLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, frenchLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, germanLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, spanishLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(isAiAvailable(routeId, spanishLocale), false, routeId);
    assert.equal(isAiAvailable(routeId, germanLocale), false, routeId);
    assert.equal(isAiAvailable(routeId, frenchLocale), false, routeId);
    assert.equal(isAiAvailable(routeId, chineseLocale), false, routeId);
    assert.equal(isAiAvailable(routeId, russianLocale), false, routeId);
    assert.equal(isAiAvailable(routeId, indonesianLocale), false, routeId);
    assert.equal(
      isAiAvailable(routeId, brazilianPortugueseLocale),
      false,
      routeId,
    );
    assert.equal(
      resolvePublishedRoute(routeId, brazilianPortugueseLocale)?.publication ??
        null,
      "public",
      routeId,
    );
    assert.equal(isAiAvailable(routeId, japaneseLocale), false, routeId);
    assert.equal(
      resolvePublishedRoute(routeId, japaneseLocale)?.publication ?? null,
      "public",
      routeId,
    );
    assert.equal(isAiAvailable(routeId, koreanLocale), false, routeId);
  }
  assert.doesNotThrow(() => assertProductionLocaleComplete(spanishLocale));
  assert.doesNotThrow(() => assertProductionLocaleComplete(germanLocale));
  assert.doesNotThrow(() => assertProductionLocaleComplete(frenchLocale));
  assert.doesNotThrow(() => assertProductionLocaleComplete(chineseLocale));
  assert.doesNotThrow(() => assertProductionLocaleComplete(russianLocale));
  assert.doesNotThrow(() => assertProductionLocaleComplete(japaneseLocale));
  assert.doesNotThrow(() => assertProductionLocaleComplete(koreanLocale));
  assert.doesNotThrow(() =>
    assertProductionLocaleComplete(brazilianPortugueseLocale),
  );
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
      target === "test",
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
  assert.deepEqual(resolveRouteRequest("/DE/lore"), {
    routeId: "lore",
    locale: germanLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/FR/lore"), {
    routeId: "lore",
    locale: frenchLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/ZH-cn/lore"), {
    routeId: "lore",
    locale: chineseLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/RU/lore"), {
    routeId: "lore",
    locale: russianLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/ID-id/lore"), {
    routeId: "lore",
    locale: indonesianLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/PT-br/lore"), {
    routeId: "lore",
    locale: brazilianPortugueseLocale,
    stablePathname: "/lore",
    hadLocalePrefix: true,
  });
  assert.deepEqual(resolveRouteRequest("/JA/lore"), {
    routeId: "lore",
    locale: japaneseLocale,
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
  "non-production builds preserve public locales and isolate test locales",
  { skip: i18nBuildTarget === "production" },
  () => {
    if (pseudoEnabled) {
      assert.doesNotThrow(() => assertPreviewLocaleComplete(pseudoLocale));
    }
    assert.doesNotThrow(() => assertProductionLocaleComplete(japaneseLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(koreanLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(spanishLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(germanLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(frenchLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(chineseLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(russianLocale));
    assert.doesNotThrow(() => assertProductionLocaleComplete(indonesianLocale));
    assert.doesNotThrow(() =>
      assertProductionLocaleComplete(brazilianPortugueseLocale),
    );
    assert.deepEqual(
      listPublishedRoutes().map(({ routeId, locale, canonicalPathname }) => ({
        routeId,
        locale,
        canonicalPathname,
      })),
      completeRouteMatrix,
    );

    const privateLocales = [...(pseudoEnabled ? [pseudoLocale] : [])] as const;
    for (const privateLocale of privateLocales) {
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
        assert.equal(
          getNonHtmlRobotsHeader(routeId, privateLocale, "data"),
          "noindex, nofollow",
        );
        assert.equal(
          getNonHtmlRobotsHeader(routeId, privateLocale, "image"),
          "noindex, nofollow, noimageindex",
        );
      }

      assert.equal(resolveRouteRequest(`/${privateLocale}/historia`), null);
    }

    const publicLocaleFixtures = [
      { locale: spanishLocale, messages: spanishMessages },
      { locale: germanLocale, messages: germanMessages },
      { locale: frenchLocale, messages: frenchMessages },
      { locale: chineseLocale, messages: chineseMessages },
      { locale: russianLocale, messages: russianMessages },
      { locale: indonesianLocale, messages: indonesianMessages },
      {
        locale: brazilianPortugueseLocale,
        messages: brazilianPortugueseMessages,
      },
    ] as const;
    assert.doesNotThrow(() => assertProductionLocaleComplete(russianLocale));
    assert.equal(
      russianMessages.home.hero.dagAnnotation,
      "pow в реальном времени",
    );
    assert.equal(
      indonesianMessages.home.hero.dagAnnotation,
      "pow secara real-time",
    );
    assert.equal(
      indonesianMessages.home.verify.heading,
      "jangan percaya, verifikasi.",
    );
    assert.equal(
      brazilianPortugueseMessages.home.hero.dagAnnotation,
      "pow em tempo real",
    );
    assert.equal(
      brazilianPortugueseMessages.home.verify.heading,
      "não confie, verifique.",
    );
    assert.equal(
      japaneseMessages.home.hero.dagAnnotation,
      "リアルタイムの pow",
    );
    assert.equal(koreanMessages.home.hero.dagAnnotation, "실시간 pow");
    for (const routeId of routeIds) {
      const spanishRoute = resolvePublishedRoute(routeId, spanishLocale);
      const germanRoute = resolvePublishedRoute(routeId, germanLocale);
      const frenchRoute = resolvePublishedRoute(routeId, frenchLocale);
      const chineseRoute = resolvePublishedRoute(routeId, chineseLocale);
      const russianRoute = resolvePublishedRoute(routeId, russianLocale);
      const indonesianRoute = resolvePublishedRoute(routeId, indonesianLocale);
      const brazilianPortugueseRoute = resolvePublishedRoute(
        routeId,
        brazilianPortugueseLocale,
      );
      const japaneseRoute = resolvePublishedRoute(routeId, japaneseLocale);
      const koreanRoute = resolvePublishedRoute(routeId, koreanLocale);
      assert.ok(spanishRoute);
      assert.ok(germanRoute);
      assert.ok(frenchRoute);
      assert.ok(chineseRoute);
      assert.ok(russianRoute);
      assert.ok(indonesianRoute);
      assert.ok(brazilianPortugueseRoute);
      assert.ok(japaneseRoute);
      assert.ok(koreanRoute);
      const englishUrl = `${siteUrl}${spanishRoute.pathname}`;
      const xDefault =
        spanishRoute.pathname === "/"
          ? siteUrl
          : `${siteUrl}${spanishRoute.pathname}`;
      const languages = {
        en: englishUrl,
        es: `${siteUrl}${spanishRoute.canonicalPathname}`,
        de: `${siteUrl}${germanRoute.canonicalPathname}`,
        fr: `${siteUrl}${frenchRoute.canonicalPathname}`,
        "zh-CN": `${siteUrl}${chineseRoute.canonicalPathname}`,
        ru: `${siteUrl}${russianRoute.canonicalPathname}`,
        "id-ID": `${siteUrl}${indonesianRoute.canonicalPathname}`,
        "pt-BR": `${siteUrl}${brazilianPortugueseRoute.canonicalPathname}`,
        ja: `${siteUrl}${japaneseRoute.canonicalPathname}`,
        ko: `${siteUrl}${koreanRoute.canonicalPathname}`,
        "x-default": xDefault,
      };

      for (const { locale } of publicLocaleFixtures) {
        const route = resolvePublishedRoute(routeId, locale);
        assert.ok(route);
        const metadata = createRouteMetadata(routeId, locale);
        assert.ok(metadata);
        assert.deepEqual(metadata.alternates, {
          canonical: route.canonicalPathname,
          languages,
        });
        assert.equal(metadata.robots, undefined);
        assert.equal(getNonHtmlRobotsHeader(routeId, locale, "data"), null);
        assert.equal(getNonHtmlRobotsHeader(routeId, locale, "image"), null);
        assert.ok(metadata.openGraph);
        assert.ok(metadata.twitter);
      }
    }

    for (const { locale, messages } of publicLocaleFixtures) {
      const headingLines = messages.home.openGraph.heading.split("\n");
      assert.deepEqual(createOpenGraphRenderContract(locale), {
        headingLines,
        headingStyle: createOpenGraphHeadingStyle(headingLines),
        tagline: messages.home.openGraph.tagline,
      });
      for (const routeId of routeIds) {
        assert.deepEqual(createOpenGraphImageDescriptor(routeId, locale), {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: messages[routeId].openGraph.imageAlt,
          ...(routeId === "home" ? { type: "image/png" } : {}),
        });
      }
    }

    const frenchHeadingLines =
      frenchMessages.home.openGraph.heading.split("\n");
    assert.deepEqual(createOpenGraphRenderContract(frenchLocale), {
      headingLines: frenchHeadingLines,
      headingStyle: createOpenGraphHeadingStyle(frenchHeadingLines),
      tagline: frenchMessages.home.openGraph.tagline,
    });

    const japaneseHeadingLines =
      japaneseMessages.home.openGraph.heading.split("\n");
    assert.deepEqual(createOpenGraphRenderContract(japaneseLocale), {
      headingLines: japaneseHeadingLines,
      headingStyle: {
        ...createOpenGraphHeadingStyle(japaneseHeadingLines),
        lineBreak: "strict",
      },
      tagline: japaneseMessages.home.openGraph.tagline,
      taglineStyle: {
        lineBreak: "strict",
        overflowWrap: "anywhere",
        wordBreak: "normal",
      },
    });
  },
);

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
  const pseudo = createOpenGraphHeadingStyle([
    "[!! Řëëååļ-ţïïḿëë",
    "Ďëëçëëńţřååļïïžååţïïööń !!]",
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
  assert.deepEqual(
    {
      letterSpacing: pseudo.letterSpacing,
      lineHeight: pseudo.lineHeight,
      overflowWrap: pseudo.overflowWrap,
      wordBreak: pseudo.wordBreak,
    },
    sharedWrapping,
  );
  assert.ok(spanish.fontSize < english.fontSize);
  assert.ok(pseudo.fontSize < spanish.fontSize);
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
        de: `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/de"
            : `/de${expected[routeId].pathname}`
        }`,
        fr: `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/fr"
            : `/fr${expected[routeId].pathname}`
        }`,
        "zh-CN": `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/zh-CN"
            : `/zh-CN${expected[routeId].pathname}`
        }`,
        ru: `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/ru"
            : `/ru${expected[routeId].pathname}`
        }`,
        "id-ID": `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/id-ID"
            : `/id-ID${expected[routeId].pathname}`
        }`,
        "pt-BR": `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/pt-BR"
            : `/pt-BR${expected[routeId].pathname}`
        }`,
        ja: `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/ja"
            : `/ja${expected[routeId].pathname}`
        }`,
        ko: `${siteUrl}${
          expected[routeId].pathname === "/"
            ? "/ko"
            : `/ko${expected[routeId].pathname}`
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
