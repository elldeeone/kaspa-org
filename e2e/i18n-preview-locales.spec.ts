import { expect, test } from "@playwright/test";

import {
  localeRegistry,
  supportedLocaleCodes,
} from "../src/i18n/locale-registry.ts";
import {
  assertHeadingUsesResponsiveWrapping,
  assertNoHorizontalOverflow,
  standaloneBasePath,
  standaloneExampleNames,
  waitForStableLayout,
} from "./i18n-preview-helpers";
import {
  localizePublicRouteGolden,
  readPrerenderRoutePathnames,
  useBuiltLocaleScenario,
} from "./i18n-scenario-harness";

const previewEnvironment = {
  NEXT_PUBLIC_KASPA_AI_ENABLED: "true",
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "preview",
  VERCEL_ENV: "production",
} as const;

const previewLocaleCases = [
  {
    locale: "fr",
    endonym: "Français",
    languageLabel: "Langue",
    dir: "ltr",
    routes: localizePublicRouteGolden("fr"),
    fingerprints: {
      home: "Décentralisation",
      lore: "Kaspa est un blockDAG à preuve de travail actif",
      build: "Développer sur",
      assets: "Ressources graphiques de Kaspa",
      hodl: "Achetez des KAS et transférez-les",
    },
    proofFingerprint: "Vérifier la preuve",
    backFingerprint: "Retour",
    notFoundTitle: "Page introuvable | Kaspa",
  },
] as const;

test.describe("real preview locale contract", () => {
  const scenario = useBuiltLocaleScenario({
    enabled: process.env.PLAYWRIGHT_E2E_PREVIEW_LOCALES_ONLY === "1",
    enabledHint: "run with npm run test:e2e:i18n:preview",
    environment: previewEnvironment,
    name: "preview-locale build matrix",
  });

  test("has one descriptor for every registered preview locale", () => {
    const registeredPreviewLocales = supportedLocaleCodes.filter(
      (locale) => localeRegistry[locale].lifecycle === "preview",
    );
    expect(previewLocaleCases.map(({ locale }) => locale)).toEqual(
      registeredPreviewLocales,
    );
  });

  test("renders every preview route statically and privately", async () => {
    const { fixtureRoot, readLogs, request: api } = scenario.require();
    const prerenderRoutes = await readPrerenderRoutePathnames(fixtureRoot);

    for (const localeCase of previewLocaleCases) {
      for (const route of localeCase.routes) {
        const response = await api.get(route.path);
        expect(response.status(), route.path).toBe(200);
        expect(response.headers()["x-nextjs-cache"], route.path).toBe("HIT");
        const html = await response.text();
        expect(html, route.path).toContain(
          `<html lang="${localeCase.locale}" dir="${localeCase.dir}"`,
        );
        expect(html, route.path).toContain(localeCase.fingerprints[route.id]);
        expect(html, route.path).not.toContain(route.englishFingerprint);
        expect(html, route.path).toContain(
          '<meta name="robots" content="noindex, nofollow"/>',
        );
        expect(html, route.path).not.toContain('<link rel="canonical"');
        expect(html, route.path).not.toContain('<link rel="alternate"');
        expect(html, route.path).not.toContain('property="og:');
        expect(html, route.path).not.toContain('name="twitter:');
        expect(
          prerenderRoutes.has(route.internalPath),
          route.internalPath,
        ).toBe(true);
      }

      const missing = await api.get(`/${localeCase.locale}/missing`, {
        headers: {
          "x-kaspa-i18n-route-miss": "1",
          "x-next-intl-locale": "en",
        },
      });
      expect(missing.status()).toBe(404);
      expect(await missing.text()).toContain(
        `<html lang="${localeCase.locale}" dir="${localeCase.dir}"`,
      );
      expect(await missing.text()).toContain(localeCase.notFoundTitle);
      expect(await missing.text()).not.toContain("Page Not Found | Kaspa");

      const proofCatalog = await api.get(
        `/api/i18n/home-proof/${localeCase.locale}`,
      );
      expect(proofCatalog.status()).toBe(200);
      expect(JSON.stringify(await proofCatalog.json())).toContain(
        localeCase.proofFingerprint,
      );

      const sitemap = await api.get("/sitemap.xml");
      expect(sitemap.status()).toBe(200);
      expect(await sitemap.text()).not.toContain(`/${localeCase.locale}`);
    }

    expect((await api.get("/en-XA")).status()).toBe(404);
    expect(readLogs()).not.toMatch(
      /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
    );
  });

  test("serves the exact catalog-backed preview artifact set", async () => {
    const { request: api } = scenario.require();

    for (const localeCase of previewLocaleCases) {
      const returnPath = `/${localeCase.locale}/build#try-live`;
      const returnQuery = new URLSearchParams({
        returnTo: returnPath,
      }).toString();

      for (const name of standaloneExampleNames) {
        const pathname = `${standaloneBasePath}/${name}.${localeCase.locale}.html`;
        const response = await api.get(`${pathname}?${returnQuery}`);
        expect(response.status(), pathname).toBe(200);
        const html = await response.text();
        expect(html, pathname).toContain(
          `<html lang="${localeCase.locale}" dir="${localeCase.dir}">`,
        );
        expect(html, pathname).toContain(
          `from './resources/utils.${localeCase.locale}.js'`,
        );
        expect(html, pathname).toContain(
          '<meta name="robots" content="noindex, nofollow">',
        );
        expect(html, pathname).not.toContain("[!! ");
      }

      const utilsResponse = await api.get(
        `${standaloneBasePath}/resources/utils.${localeCase.locale}.js`,
      );
      expect(utilsResponse.status()).toBe(200);
      const utils = await utilsResponse.text();
      expect(utils).toContain(`'/${localeCase.locale}/build'`);
      expect(utils).toContain(`'/${localeCase.locale}/build#try-live'`);
      expect(utils).toContain(localeCase.backFingerprint);
    }

    expect(
      (
        await api.get(`${standaloneBasePath}/get-server-info.en-XA.html`)
      ).status(),
    ).toBe(404);
  });

  test("exposes preview locales in the selector without layout overflow", async ({
    browser,
  }) => {
    const { baseUrl } = scenario.require();

    for (const localeCase of previewLocaleCases) {
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
        { width: 320, height: 640 },
      ]) {
        const context = await browser.newContext({
          baseURL: baseUrl,
          viewport,
          hasTouch: viewport.width < 768,
          isMobile: viewport.width < 768,
        });
        const page = await context.newPage();

        for (const route of localeCase.routes) {
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          await waitForStableLayout(page);
          await assertNoHorizontalOverflow(
            page,
            viewport.width,
            `${route.path} initial`,
          );

          if (route.id === "home") {
            await assertHeadingUsesResponsiveWrapping(
              page.locator("main h1").first(),
              `${viewport.width}px ${localeCase.locale} home hero`,
            );

            const selector = page.locator("[data-language-selector]:visible");
            await selector
              .getByRole("button", {
                name: localeCase.languageLabel,
                exact: true,
              })
              .click();
            await expect(
              selector.getByRole("menuitemradio", {
                name: localeCase.endonym,
              }),
            ).toHaveAttribute("aria-checked", "true");
            await page.keyboard.press("Escape");
          }

          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight),
          );
          await waitForStableLayout(page);
          await assertNoHorizontalOverflow(
            page,
            viewport.width,
            `${route.path} after full-page scroll`,
          );
        }

        await context.close();
      }
    }
  });
});
