import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import {
  PSEUDO_BUILD_EXAMPLE_URLS,
  SPANISH_BUILD_EXAMPLE_URLS,
} from "../scripts/i18n/build-example-artifacts.mts";
import { startProductionServer } from "../scripts/i18n/production-server.mts";
import {
  buildProductionFixture,
  createEnglishOnlyProductionFixture,
  createPartialSpanishProductionFixture,
  validateProductionFixtureClientPayload,
} from "../scripts/i18n/unpublished-route-fixture.mts";

const productionEnvironment = {
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "production",
  VERCEL_ENV: "production",
} as const;

const englishRoutes = ["/", "/lore", "/build", "/assets", "/hodl"] as const;
const spanishRoutes = [
  "/es",
  "/es/lore",
  "/es/build",
  "/es/assets",
  "/es/hodl",
] as const;

test.describe("Phase 5 atomic Production profiles", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Production profile matrix runs once",
    );
  });

  test("supports complete rollback and rejects partial Spanish", async ({
    page,
    request,
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

    const englishFixture = await createEnglishOnlyProductionFixture(
      process.cwd(),
    );
    let server: Awaited<ReturnType<typeof startProductionServer>> | null = null;
    try {
      await buildProductionFixture(englishFixture.root, productionEnvironment);
      await validateProductionFixtureClientPayload(
        englishFixture.root,
        productionEnvironment,
      );

      const prerenderManifest = JSON.parse(
        await readFile(
          join(englishFixture.root, ".next", "prerender-manifest.json"),
          "utf8",
        ),
      ) as { routes: Record<string, unknown> };
      const localizedPageRoutes = Object.keys(prerenderManifest.routes)
        .filter((pathname) =>
          /^\/(?:en|es)(?:\/(?:lore|build|assets|hodl))?$/u.test(pathname),
        )
        .sort();
      expect(localizedPageRoutes).toEqual(
        ["/en", "/en/assets", "/en/build", "/en/hodl", "/en/lore"].sort(),
      );
      expect(prerenderManifest.routes).not.toHaveProperty(
        "/es/opengraph-image",
      );
      expect(prerenderManifest.routes).not.toHaveProperty(
        "/api/i18n/home-proof/es",
      );

      server = await startProductionServer(
        englishFixture.root,
        productionEnvironment,
      );

      for (const pathname of englishRoutes) {
        const response = await request.get(`${server.baseUrl}${pathname}`);
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
        const response = await request.get(`${server.baseUrl}${pathname}`, {
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
        const response = await request.get(`${server.baseUrl}${pathname}`, {
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
        ...SPANISH_BUILD_EXAMPLE_URLS,
        ...PSEUDO_BUILD_EXAMPLE_URLS,
      ]) {
        const response = await request.get(`${server.baseUrl}${pathname}`, {
          maxRedirects: 0,
        });
        expect(response.status(), pathname).toBe(404);
      }

      const sitemapResponse = await request.get(
        `${server.baseUrl}/sitemap.xml`,
      );
      expect(sitemapResponse.status()).toBe(200);
      const sitemap = await sitemapResponse.text();
      expect(
        [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]),
      ).toEqual([
        "https://kaspa.org",
        "https://kaspa.org/lore",
        "https://kaspa.org/build",
        "https://kaspa.org/assets",
        "https://kaspa.org/hodl",
      ]);
      expect(sitemap).not.toContain("/es");
      expect(sitemap).not.toContain("hreflang");

      await page.goto(`${server.baseUrl}/`);
      await expect(page.locator("[data-language-selector]")).toHaveCount(0);

      expect(server.readLogs()).not.toMatch(
        /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
      );
    } finally {
      await server?.stop();
      await englishFixture.dispose();
    }
  });
});
