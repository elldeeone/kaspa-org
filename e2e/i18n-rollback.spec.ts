import { expect, test } from "@playwright/test";

import { buildExampleContract } from "../src/i18n/build-example-contract.ts";
import {
  buildProductionFixture,
  createEnglishOnlyProductionFixture,
  createPartialSpanishProductionFixture,
} from "../scripts/i18n/unpublished-route-fixture.mts";
import {
  localizePublicRouteGolden,
  publicRouteGolden,
  readPrerenderRoutePathnames,
  runOnlyInProject,
  startBuiltLocaleScenario,
} from "./i18n-scenario-harness";

const productionEnvironment = {
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "production",
  VERCEL_ENV: "production",
} as const;

const englishRoutes = publicRouteGolden.map(({ path }) => path);
const spanishRoutes = localizePublicRouteGolden("es").map(({ path }) => path);
const internalEnglishRoutes = localizePublicRouteGolden("en").map(
  ({ path }) => path,
);
const localizedRouteGolden = new Set([
  ...internalEnglishRoutes,
  ...spanishRoutes,
]);

test.describe("atomic locale publication profiles", () => {
  runOnlyInProject("Production profile matrix runs once");

  test("supports complete rollback and rejects partial Spanish", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const partialFixture = await createPartialSpanishProductionFixture(
      process.cwd(),
    );
    try {
      await expect(
        buildProductionFixture(partialFixture.root, productionEnvironment),
      ).rejects.toThrow(/logoAssets:es requires public destination \/assets/u);
    } finally {
      await partialFixture.dispose();
    }

    const scenario = await startBuiltLocaleScenario({
      createFixture: createEnglishOnlyProductionFixture,
      environment: productionEnvironment,
    });
    try {
      const prerenderRoutes = await readPrerenderRoutePathnames(
        scenario.fixtureRoot,
      );
      const localizedPageRoutes = [...prerenderRoutes]
        .filter((pathname) => localizedRouteGolden.has(pathname))
        .sort();
      expect(localizedPageRoutes).toEqual([...internalEnglishRoutes].sort());
      expect(prerenderRoutes.has("/es/opengraph-image")).toBe(false);
      expect(prerenderRoutes.has("/api/i18n/home-proof/es")).toBe(false);

      for (const pathname of englishRoutes) {
        const response = await scenario.request.get(pathname);
        expect(response.status(), pathname).toBe(200);
        const html = await response.text();
        const canonicalPathname = pathname === "/" ? "" : pathname;
        expect(html, pathname).toContain(
          `<link rel="canonical" href="https://kaspa.org${canonicalPathname}"`,
        );
        expect(html, pathname).not.toContain("hreflang=");
        expect(html, pathname).not.toContain("data-language-selector");
      }

      for (const pathname of spanishRoutes) {
        const response = await scenario.request.get(pathname, {
          maxRedirects: 0,
        });
        expect(response.status(), pathname).toBe(404);
        const html = await response.text();
        expect(html, pathname).toContain('<html lang="en" dir="ltr"');
        expect(html, pathname).toContain('data-kaspa-global-not-found="true"');
      }

      for (const pathname of [
        "/missing",
        "/es/missing",
        "/zz/missing",
        "/es/missing.txt",
      ] as const) {
        const response = await scenario.request.get(pathname, {
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
        expect(html, pathname).toContain("Page Not Found | Kaspa");
        expect(html, pathname).toContain("Wrong route.");
        expect(html, pathname).toContain("Right network.");
      }

      for (const pathname of [
        "/es/opengraph-image",
        "/api/i18n/home-proof/es",
        ...buildExampleContract.artifactManifest.urlsByLocale.es,
        ...buildExampleContract.artifactManifest.urlsByLocale["en-XA"],
      ]) {
        const response = await scenario.request.get(pathname, {
          maxRedirects: 0,
        });
        expect(response.status(), pathname).toBe(404);
      }

      const sitemapResponse = await scenario.request.get("/sitemap.xml");
      expect(sitemapResponse.status()).toBe(200);
      const sitemap = await sitemapResponse.text();
      expect(
        [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]),
      ).toEqual(
        englishRoutes.map(
          (pathname) => `https://kaspa.org${pathname === "/" ? "" : pathname}`,
        ),
      );
      expect(sitemap).not.toContain("/es");
      expect(sitemap).not.toContain("hreflang");

      await page.goto(`${scenario.baseUrl}/`);
      await expect(page.locator("[data-language-selector]")).toHaveCount(0);

      expect(scenario.readLogs()).not.toMatch(
        /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
      );
    } finally {
      await scenario.dispose();
    }
  });
});
