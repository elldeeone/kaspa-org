import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  defaultLocale,
  localeRegistry,
  supportedLocaleCodes,
  type Locale,
} from "../src/i18n/locale-registry";
import {
  assertHeadingUsesResponsiveWrapping,
  assertNoHorizontalOverflow,
  measureOpenGraphImage,
  standaloneBasePath,
  standaloneExampleNames,
  waitForStableLayout,
} from "./i18n-helpers";
import {
  localizePublicPath,
  publicRouteGolden,
  readPrerenderRoutePathnames,
  runOnlyInProject,
  type PublicRouteId,
} from "./i18n-route-fixtures";

type MessageCatalog = Record<string, unknown>;

const translatedLocales = supportedLocaleCodes.filter(
  (locale): locale is Exclude<Locale, typeof defaultLocale> =>
    locale !== defaultLocale,
);
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

async function loadCatalog(
  locale: Locale,
  namespace: "errors" | "shared" | PublicRouteId,
) {
  return JSON.parse(
    await readFile(
      join(process.cwd(), "messages", locale, `${namespace}.json`),
      "utf8",
    ),
  ) as MessageCatalog;
}

function readMessage(catalog: MessageCatalog, path: string): string {
  let value: unknown = catalog;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`catalog message ${path} is missing`);
    }
    value = (value as MessageCatalog)[segment];
  }
  if (typeof value !== "string") {
    throw new Error(`catalog message ${path} is not a string`);
  }
  return value;
}

function getVisibleLanguageSelector(page: Page) {
  return page.locator("[data-language-selector]:visible");
}

const routeFingerprintPaths = {
  home: "hero.tagline",
  lore: "article.heading",
  build: "start.quickstart.title",
  assets: "page.heading",
  hodl: "wallet.description",
} as const satisfies Readonly<Record<PublicRouteId, string>>;

test.describe("registered locale browser contract", () => {
  test.skip(
    process.env.PLAYWRIGHT_E2E_LOCALES_ONLY !== "1",
    "run with npm run test:e2e:i18n:locales",
  );
  test.describe.configure({ mode: "serial", timeout: 240_000 });
  runOnlyInProject("registered locale suite runs once");

  test("publishes every registered route and no others", async ({
    request,
  }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(
      [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]),
    ).toEqual(
      publicRouteGolden.flatMap(({ path }) =>
        supportedLocaleCodes.map((locale) =>
          locale === defaultLocale
            ? `https://kaspa.org${path === "/" ? "" : path}`
            : `https://kaspa.org${localizePublicPath(locale, path)}`,
        ),
      ),
    );

    const prerendered = await readPrerenderRoutePathnames(process.cwd());
    for (const locale of translatedLocales) {
      for (const route of publicRouteGolden) {
        const pathname = localizePublicPath(locale, route.path);
        const response = await request.get(pathname);
        expect(response.status(), pathname).toBe(200);
        expect(response.headers()["x-nextjs-cache"], pathname).toBe("HIT");
        expect(response.headers()["x-nextjs-prerender"], pathname).toContain(
          "1",
        );
        expect(prerendered.has(pathname), pathname).toBe(true);

        const html = await response.text();
        expect(html, pathname).toContain(
          `<html lang="${locale}" dir="${localeRegistry[locale].dir}"`,
        );
        expect(html, pathname).toContain(
          `<link rel="canonical" href="https://kaspa.org${pathname}"/>`,
        );
        expect(html, pathname).not.toContain(
          '<meta name="robots" content="noindex, nofollow"/>',
        );
        expect(html, pathname).toContain(
          `https://kaspa.org/${locale}/opengraph-image`,
        );

        for (const alternative of supportedLocaleCodes) {
          const hrefLang = localeRegistry[alternative].hrefLang;
          const alternativePath =
            alternative === defaultLocale
              ? route.path
              : localizePublicPath(alternative, route.path);
          const href = `https://kaspa.org${alternativePath === "/" ? "" : alternativePath}`;
          expect(html, `${pathname} ${hrefLang}`).toContain(
            `<link rel="alternate" hrefLang="${hrefLang}" href="${href}"/>`,
          );
        }
      }

      const notFound = await request.get(`/${locale}/missing`);
      expect(notFound.status()).toBe(404);
      expect(await notFound.text()).toContain(
        `<html lang="${locale}" dir="${localeRegistry[locale].dir}"`,
      );
    }
  });

  test("switches languages and keeps registered pages usable", async ({
    browser,
  }) => {
    for (const locale of translatedLocales) {
      const shared = await loadCatalog(locale, "shared");
      const languageLabel = readMessage(shared, "navigation.language.label");
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();

      for (const route of publicRouteGolden) {
        const pathname = localizePublicPath(locale, route.path);
        await page.goto(pathname, { waitUntil: "domcontentloaded" });
        await waitForStableLayout(page);
        const catalog = await loadCatalog(locale, route.id);
        expect(await page.title(), `${pathname} title`).toBe(
          readMessage(catalog, "metadata.title"),
        );
        await expect(
          page.locator("main"),
          `${pathname} translated copy`,
        ).toContainText(readMessage(catalog, routeFingerprintPaths[route.id]));
        await assertNoHorizontalOverflow(page, 390, pathname);
        if (route.id === "home") {
          await assertHeadingUsesResponsiveWrapping(
            page.locator("main h1").first(),
            `${locale} home hero`,
          );
        }
      }

      const notFoundPathname = localizePublicPath(locale, "/missing");
      const notFoundResponse = await page.goto(notFoundPathname, {
        waitUntil: "domcontentloaded",
      });
      expect(notFoundResponse?.status(), notFoundPathname).toBe(404);
      const errors = await loadCatalog(locale, "errors");
      await expect(
        page.locator("main"),
        `${notFoundPathname} translated error copy`,
      ).toContainText(readMessage(errors, "page.heading"));

      await page.goto(
        `${localizePublicPath(locale, "/lore")}?source=locale#roadmap`,
      );
      const selector = getVisibleLanguageSelector(page);
      await selector
        .getByRole("button", { name: languageLabel, exact: true })
        .click();
      const menu = selector.getByRole("menu", { name: languageLabel });
      for (const registeredLocale of supportedLocaleCodes) {
        await expect(
          menu.getByRole("menuitemradio", {
            name: localeRegistry[registeredLocale].label,
          }),
        ).toHaveCount(1);
      }
      await menu
        .getByRole("menuitemradio", {
          name: localeRegistry[defaultLocale].label,
        })
        .click();
      await expect(page).toHaveURL(/\/lore\?source=locale#roadmap$/u);
      await context.close();
    }
  });

  test("serves localized Build examples and Open Graph images", async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext({ baseURL: baseUrl });
    const page = await context.newPage();
    await page.goto("/");

    for (const locale of translatedLocales) {
      for (const name of standaloneExampleNames) {
        const pathname = `${standaloneBasePath}/${name}.${locale}.html`;
        const response = await request.get(pathname);
        expect(response.status(), pathname).toBe(200);
        expect(await response.text(), pathname).toContain(
          `<html lang="${locale}" dir="${localeRegistry[locale].dir}">`,
        );
      }

      const metrics = await measureOpenGraphImage(
        page,
        `/${locale}/opengraph-image`,
      );
      expect(metrics).toMatchObject({ width: 1200, height: 630 });
      expect(metrics.inkPixels).toBeGreaterThan(1_000);
    }

    await context.close();
  });
});
