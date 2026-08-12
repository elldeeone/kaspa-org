import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createUnpublishedAssetsFixture } from "../scripts/i18n/unpublished-route-fixture.mts";
import {
  localizePublicPath,
  publicRouteGolden,
  readPrerenderRoutePathnames,
  runOnlyInProject,
  startBuiltLocaleScenario,
  type PublicRouteId,
} from "./i18n-scenario-harness";

const productionLocaleSelectorBudgetBytes = 3_000;

type EnglishRouteExpectation = {
  baselineBytes: number;
  description: string;
  localizedClientPayloadBudgetBytes?: number;
  localizedLayoutBudgetBytes?: number;
  title: string;
};

const englishRouteExpectations = {
  home: {
    baselineBytes: 37_238,
    // Locale-neutral responsive markers support translated hero text and
    // equal-width mobile proof actions. Budget only those HTML layout classes.
    localizedLayoutBudgetBytes: 192,
    title: "Kaspa | Proof-of-Work blockDAG for Real-Time Decentralization",
    description:
      "Kaspa is a fair-launched proof-of-work blockDAG cryptocurrency running at 10 blocks per second, built for real-time decentralization.",
  },
  lore: {
    baselineBytes: 62_860,
    title: "LORE | Kaspa",
    description:
      "Kaspa is a fair-launched proof-of-work blockDAG focused on real-time decentralization, with no premine, no insider allocation, and 10 BPS mainnet performance.",
  },
  build: {
    baselineBytes: 98_334,
    // This interactive route serializes only its reviewed route catalog.
    // Preserve the original baseline for unrelated payload growth.
    localizedClientPayloadBudgetBytes: 12_500,
    title: "Kaspa Developer Docs, SDKs, APIs, and Node Access | Kaspa",
    description:
      "Everything you need to start building on Kaspa. WASM SDK, Rust libraries, live API playground, node access, and developer tooling.",
  },
  assets: {
    baselineBytes: 72_650,
    title: "Kaspa Logos & Assets | Kaspa",
    description:
      "Download the official Kaspa logo set — horizontal and stacked lockups, the icon, and brand colors. SVG and high-resolution PNG.",
  },
  hodl: {
    baselineBytes: 91_253,
    // The wallet finder has the same reviewed, route-scoped client-catalog cost.
    localizedClientPayloadBudgetBytes: 12_500,
    title: "Buy KAS, Set Up a Wallet, and Self-Custody | Kaspa",
    description: "Get a wallet, buy KAS, and transfer to self-custody.",
  },
} as const satisfies Record<PublicRouteId, EnglishRouteExpectation>;

const publicRoutes = publicRouteGolden.map((route) => ({
  ...route,
  ...englishRouteExpectations[route.id],
  internalPath: localizePublicPath("en", route.path),
}));

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://kaspa.org#organization",
      name: "Kaspa",
      url: "https://kaspa.org",
      logo: "https://kaspa.org/kaspa-logo.svg",
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG cryptocurrency running at 10 blocks per second, built for real-time decentralization.",
      sameAs: [
        "https://github.com/kaspanet/rusty-kaspa/",
        "https://t.me/kasparnd",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://kaspa.org#website",
      name: "Kaspa",
      url: "https://kaspa.org",
      alternateName: ["kaspa.org"],
      publisher: { "@id": "https://kaspa.org#organization" },
    },
  ],
} as const;

const legacyRedirects = [
  ["/.well-known/llms.txt", "/llms.txt"],
  ["/.well-known/llms-full.txt", "/llms-full.txt"],
  ["/about-kaspa", "/lore"],
  ["/kaspa-overview", "/lore"],
  ["/vision", "/lore"],
  ["/developer", "/build"],
  ["/developers-resources", "/build"],
  ["/developers-resourses", "/build"],
  ["/developments", "/build#developments"],
  ["/swaps", "/hodl#buy"],
  ["/where-to-buy-kaspa-cryptocurrency-exchanges-for-trading-kas", "/hodl#buy"],
  ["/kaspa-wallets-non-custodial-wallet-options-for-kas", "/hodl#wallet"],
  ["/resources/block-explorer", "https://explorer.kaspa.org/"],
  ["/about-kaspa/contact-us", "/lore"],
  ["/about-kaspa/press-room", "/lore"],
  ["/features", "/lore"],
  ["/publications", "/lore"],
  ["/whitepapers", "/lore"],
  ["/resources/white-papers", "/lore"],
  ["/kaspa-faq", "/lore"],
] as const;

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function readTitle(html: string) {
  const match = html.match(/<title>(.*?)<\/title>/u);
  return match ? decodeHtml(match[1]) : null;
}

function readMeta(html: string, attribute: "name" | "property", key: string) {
  const pattern = new RegExp(
    `<meta ${attribute}="${escapeRegExp(key)}" content="([^"]*)"\\s*\\/>`,
    "u",
  );
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]) : null;
}

function readMetas(html: string, attribute: "name" | "property", key: string) {
  const pattern = new RegExp(
    `<meta ${attribute}="${escapeRegExp(key)}" content="([^"]*)"\\s*\\/>`,
    "gu",
  );
  return [...html.matchAll(pattern)].map((match) => decodeHtml(match[1]));
}

function readCanonical(html: string) {
  return html.match(/<link rel="canonical" href="([^"]+)"\s*\/>/u)?.[1] ?? null;
}

test.describe("production i18n foundation contract", () => {
  runOnlyInProject("HTTP foundation contract runs once");

  test("keeps all English routes static and preserves exact metadata", async ({
    page,
    request,
  }) => {
    for (const route of publicRoutes) {
      const response = await request.get(route.path);
      expect(response.status(), route.path).toBe(200);
      expect(response.headers()["x-nextjs-cache"], route.path).toBe("HIT");
      expect(response.headers()["x-nextjs-prerender"], route.path).toContain(
        "1",
      );

      const html = await response.text();
      expect(Buffer.byteLength(html), route.path).toBeLessThanOrEqual(
        Math.floor(route.baselineBytes * 1.1) +
          ("localizedClientPayloadBudgetBytes" in route
            ? route.localizedClientPayloadBudgetBytes
            : 0) +
          ("localizedLayoutBudgetBytes" in route
            ? route.localizedLayoutBudgetBytes
            : 0) +
          productionLocaleSelectorBudgetBytes,
      );
      expect(html, route.path).toContain('<html lang="en" dir="ltr"');
      expect(readMeta(html, "name", "viewport"), route.path).toBe(
        "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      );
      expect(readTitle(html), route.path).toBe(route.title);
      expect(readMeta(html, "name", "description"), route.path).toBe(
        route.description,
      );
      expect(readMeta(html, "name", "application-name"), route.path).toBe(
        "Kaspa",
      );
      const canonical = `https://kaspa.org${route.path === "/" ? "" : route.path}`;
      expect(readCanonical(html), route.path).toBe(canonical);
      for (const [hrefLang, href] of [
        ["en", canonical],
        [
          "es",
          `https://kaspa.org${route.path === "/" ? "/es" : `/es${route.path}`}`,
        ],
        ["x-default", canonical],
      ] as const) {
        expect(html, `${route.path} ${hrefLang}`).toContain(
          `<link rel="alternate" hrefLang="${hrefLang}" href="${href}"/>`,
        );
      }
      expect(readMeta(html, "property", "og:title"), route.path).toBe(
        route.title,
      );
      expect(readMeta(html, "property", "og:description"), route.path).toBe(
        route.description,
      );
      expect(readMeta(html, "property", "og:url"), route.path).toBe(canonical);
      expect(readMeta(html, "property", "og:site_name"), route.path).toBe(
        "Kaspa",
      );
      expect(readMeta(html, "property", "og:image"), route.path).toBe(
        "https://kaspa.org/opengraph-image",
      );
      expect(readMeta(html, "property", "og:image:width"), route.path).toBe(
        "1200",
      );
      expect(readMeta(html, "property", "og:image:height"), route.path).toBe(
        "630",
      );
      expect(readMeta(html, "property", "og:image:alt"), route.path).toBe(
        "Kaspa — Real-time Decentralization",
      );
      expect(readMeta(html, "property", "og:image:type"), route.path).toBe(
        route.path === "/" ? "image/png" : null,
      );
      expect(readMeta(html, "property", "og:type"), route.path).toBe("website");
      expect(readMeta(html, "name", "twitter:card"), route.path).toBe(
        "summary_large_image",
      );
      expect(readMeta(html, "name", "twitter:title"), route.path).toBe(
        route.title,
      );
      expect(readMeta(html, "name", "twitter:description"), route.path).toBe(
        route.description,
      );
      expect(readMeta(html, "name", "twitter:image"), route.path).toBe(
        "https://kaspa.org/opengraph-image",
      );
      for (const [key, value] of [
        ["twitter:image:alt", "Kaspa — Real-time Decentralization"],
        ["twitter:image:type", "image/png"],
        ["twitter:image:width", "1200"],
        ["twitter:image:height", "630"],
      ] as const) {
        expect(readMeta(html, "name", key), `${route.path} ${key}`).toBe(
          route.path === "/" ? value : null,
        );
      }
      expect(html, route.path).toContain(
        `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`,
      );
      expect(html, route.path).toContain('data-scroll-behavior="smooth"');
      expect(html, route.path).toMatch(
        /<body class="geist_[^"]+__variable geist_mono_[^"]+__variable antialiased">/u,
      );
      expect(html, route.path).toContain("rybbit.kasmedia.com/api/script.js");
      expect(html, route.path).toContain(
        'integrity="sha384-H0pPS5ok8JJU1gmvnWE/8MDghtGFYeyfM5WjL8LYxEOh6lNozzFWp4AXrlPeUbJo"',
      );
    }

    const prerenderRoutes = await readPrerenderRoutePathnames(process.cwd());
    for (const route of publicRoutes) {
      expect(prerenderRoutes.has(route.internalPath)).toBe(true);
    }

    await page.goto("/");
    const analytics = page.locator(
      'script[src="https://rybbit.kasmedia.com/api/script.js"]',
    );
    await expect(analytics).toHaveAttribute("data-site-id", "1");
    await expect(analytics).toHaveAttribute("crossorigin", "anonymous");
    await expect(analytics).toHaveAttribute(
      "integrity",
      "sha384-H0pPS5ok8JJU1gmvnWE/8MDghtGFYeyfM5WjL8LYxEOh6lNozzFWp4AXrlPeUbJo",
    );
  });

  test("normalizes redundant English prefixes and ignores browser language", async ({
    request,
  }) => {
    for (const route of publicRoutes) {
      const prefixed = route.path === "/" ? "/en" : `/en${route.path}`;
      const response = await request.get(prefixed, { maxRedirects: 0 });
      expect(response.status(), prefixed).toBe(307);
      expect(response.headers().location, prefixed).toBe(route.path);
    }

    const languageResponse = await request.get("/", {
      headers: { "accept-language": "es-ES,es;q=0.9" },
      maxRedirects: 0,
    });
    expect(languageResponse.status()).toBe(200);
    expect(await languageResponse.text()).toContain(
      '<html lang="en" dir="ltr"',
    );
  });

  test("keeps the published logo-assets menu keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/");
    const logo = page.getByRole("link", { name: "Kaspa home" });
    await expect(logo).toHaveAttribute("aria-haspopup", "menu");
    await expect(logo).toHaveAttribute("aria-expanded", "false");

    await logo.click({ button: "right" });
    const menu = page.getByRole("menu", { name: "Kaspa logo" });
    await expect(menu).toBeVisible();
    await expect(logo).toHaveAttribute("aria-expanded", "true");
    await expect(logo).toHaveAttribute("aria-controls", "kaspa-logo-menu");
    await expect(menu.getByRole("menuitem")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(logo).toBeFocused();
  });

  test("preserves every legacy redirect", async ({ request }) => {
    for (const [source, destination] of legacyRedirects) {
      const response = await request.get(source, { maxRedirects: 0 });
      expect(response.status(), source).toBe(308);
      expect(response.headers().location, source).toBe(destination);
    }
  });

  test("returns raw English global 404s and ignores spoofed routing headers", async ({
    request,
  }) => {
    const unknownPaths = [
      "/missing",
      "/zz/missing",
      "/missing.txt",
      "/api/nope",
      "/_vercel/missing",
      "/__kaspa_i18n_unpublished__/not/found",
    ];

    for (const pathname of unknownPaths) {
      const response = await request.get(pathname, {
        headers: {
          "x-kaspa-i18n-route-miss": "1",
          "x-next-intl-locale": "es",
        },
        maxRedirects: 0,
      });
      expect(response.status(), pathname).toBe(404);
      expect(response.headers().location, pathname).toBeUndefined();
      const html = await response.text();
      expect(html, pathname).toContain('<html lang="en" dir="ltr"');
      expect(html, pathname).toContain('data-kaspa-global-not-found="true"');
      expect(html, pathname).toContain("Wrong route.");
      expect(html, pathname).toContain("Right network.");
      expect(readMeta(html, "name", "viewport"), pathname).toBe(
        "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      );
      expect(readMetas(html, "name", "robots"), pathname).toEqual([
        "noindex",
        "noindex, nofollow",
      ]);
    }

    for (const pathname of ["/es/missing", "/es/historia"]) {
      const spanishMissing = await request.get(pathname, {
        headers: {
          "x-kaspa-i18n-route-miss": "1",
          "x-next-intl-locale": "en",
        },
        maxRedirects: 0,
      });
      expect(spanishMissing.status(), pathname).toBe(404);
      const spanishMissingHtml = await spanishMissing.text();
      expect(spanishMissingHtml, pathname).toContain(
        '<html lang="es" dir="ltr"',
      );
      expect(spanishMissingHtml, pathname).toContain("Ruta incorrecta.");
    }
  });

  test("preserves sitemap, API, static files, and the exact English OG image", async ({
    request,
  }) => {
    const apiResponse = await request.get("/api/ask");
    expect(apiResponse.status()).toBe(405);

    const iconResponse = await request.get("/icon.svg");
    expect(iconResponse.status()).toBe(200);
    expect(iconResponse.headers()["content-type"]).toContain("image/svg+xml");

    const sitemapResponse = await request.get("/sitemap.xml");
    expect(sitemapResponse.status()).toBe(200);
    const sitemap = await sitemapResponse.text();
    expect(
      [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]),
    ).toEqual(
      publicRouteGolden.flatMap(({ path }) => [
        `https://kaspa.org${path === "/" ? "" : path}`,
        `https://kaspa.org${localizePublicPath("es", path)}`,
        `https://kaspa.org${localizePublicPath("de", path)}`,
        `https://kaspa.org${localizePublicPath("fr", path)}`,
      ]),
    );
    expect(sitemap).not.toContain("hreflang");
    expect(sitemap).not.toContain("/en");

    const imageResponse = await request.get("/opengraph-image");
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toBe("image/png");
    expect(imageResponse.headers()["cache-control"]).toBe(
      "public, max-age=0, must-revalidate",
    );
    const image = await imageResponse.body();
    expect(image.byteLength).toBe(51_023);
    expect(createHash("sha256").update(image).digest("hex")).toBe(
      "8e3e4323193fb91ce668c727252e3f1afadbfe459bd5e839674095fbc18c8551",
    );

    const redundantEnglishImage = await request.get("/en/opengraph-image", {
      maxRedirects: 0,
    });
    expect(redundantEnglishImage.status()).toBe(404);
    expect(redundantEnglishImage.headers().location).toBeUndefined();

    const spanishImage = await request.get("/es/opengraph-image");
    expect(spanishImage.status()).toBe(200);
    expect(spanishImage.headers()["content-type"]).toBe("image/png");
    const germanImage = await request.get("/de/opengraph-image");
    expect(germanImage.status()).toBe(200);
    expect(germanImage.headers()["content-type"]).toBe("image/png");
  });

  test("routes an enabled but unpublished page through the production miss stack", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const scenario = await startBuiltLocaleScenario({
      createFixture: createUnpublishedAssetsFixture,
      validateClientPayload: false,
    });

    try {
      const prerenderRoutes = await readPrerenderRoutePathnames(
        scenario.fixtureRoot,
      );
      expect(prerenderRoutes.has("/en/assets")).toBe(false);

      const unpublishedResponse = await scenario.request.get("/assets", {
        headers: {
          "x-kaspa-i18n-route-miss": "1",
          "x-next-intl-locale": "es",
        },
        maxRedirects: 0,
      });
      expect(unpublishedResponse.status()).toBe(404);
      expect(unpublishedResponse.headers().location).toBeUndefined();
      const unpublishedHtml = await unpublishedResponse.text();
      expect(unpublishedHtml).toContain('<html lang="en" dir="ltr"');
      expect(unpublishedHtml).toContain('data-kaspa-global-not-found="true"');
      expect(unpublishedHtml).toContain("Wrong route.");
      expect(unpublishedHtml).toContain("Right network.");

      const publishedResponse = await scenario.request.get("/lore");
      expect(publishedResponse.status()).toBe(200);
      expect(publishedResponse.headers()["x-nextjs-cache"]).toBe("HIT");

      await page.goto(`${scenario.baseUrl}/`);
      const logo = page.getByRole("link", { name: "Kaspa home" });
      await expect(logo).not.toHaveAttribute("aria-haspopup");
      await expect(logo).not.toHaveAttribute("aria-expanded");
      await expect(logo).not.toHaveAttribute("aria-controls");
      await expect(logo).not.toHaveClass(/\[-webkit-touch-callout:none\]/u);
      const contextMenuCancelled = await logo.evaluate((element) => {
        const event = new MouseEvent("contextmenu", {
          bubbles: true,
          button: 2,
          cancelable: true,
        });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(contextMenuCancelled).toBe(false);
      await expect(page.getByRole("menu")).toHaveCount(0);

      await page.waitForTimeout(250);
      for (const forbidden of [
        /NoFallbackError/u,
        /ERR_INVALID_URL/u,
        /Internal Server Error/u,
        /TypeError: Invalid URL/u,
      ]) {
        expect(scenario.readLogs()).not.toMatch(forbidden);
      }
    } finally {
      await scenario.dispose();
    }
  });
});
