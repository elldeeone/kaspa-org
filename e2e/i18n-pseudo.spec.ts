import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  expect,
  request as requestFactory,
  test,
  type APIRequestContext,
} from "@playwright/test";

import {
  startProductionServer,
  type ProductionServer,
} from "../scripts/i18n/production-server.mts";
import {
  buildProductionFixture,
  createProductionFixture,
  validateProductionFixtureClientPayload,
  type ProductionFixture,
} from "../scripts/i18n/unpublished-route-fixture.mts";

const previewEnvironment = {
  NEXT_PUBLIC_KASPA_AI_ENABLED: "false",
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "preview",
  VERCEL_ENV: "preview",
} as const;

let fixture: ProductionFixture | undefined;
let server: ProductionServer | undefined;
let api: APIRequestContext | undefined;
let activeProject = false;

test.describe("Phase 2 private pseudo-locale", () => {
  test.skip(
    process.env.PLAYWRIGHT_E2E_PSEUDO_ONLY !== "1",
    "run with npm run test:e2e:i18n:pseudo",
  );
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "desktop-chromium") return;
    activeProject = true;
    fixture = await createProductionFixture(process.cwd());
    await buildProductionFixture(fixture.root, previewEnvironment);
    await validateProductionFixtureClientPayload(
      fixture.root,
      previewEnvironment,
    );
    server = await startProductionServer(fixture.root, previewEnvironment);
    api = await requestFactory.newContext({ baseURL: server.baseUrl });
  });

  test.afterAll(async () => {
    await api?.dispose();
    await server?.stop();
    await fixture?.dispose();
  });

  test("is static, private, pseudo-localized, and isolated", async () => {
    test.skip(!activeProject, "pseudo build matrix runs once");
    if (!api || !fixture) throw new Error("pseudo fixture was not started");

    const home = await api.get("/en-XA");
    expect(home.status()).toBe(200);
    expect(home.headers()["x-nextjs-cache"]).toBe("HIT");
    expect(home.headers()["x-nextjs-prerender"]).toContain("1");
    const homeHtml = await home.text();
    expect(homeHtml).toContain('<html lang="en-XA" dir="ltr"');
    expect(homeHtml).toMatch(/\[!! Kaspa \| [^<]+ !!\]/u);
    expect(homeHtml).toContain(
      '<meta name="robots" content="noindex, nofollow"/>',
    );
    expect(homeHtml).not.toContain('<link rel="canonical"');
    expect(homeHtml).not.toContain('hreflang="en-XA"');
    expect(homeHtml).not.toContain('property="og:');
    expect(homeHtml).not.toContain('name="twitter:');
    expect(homeHtml).not.toContain("https://kaspa.org/en-XA/opengraph-image");
    expect(homeHtml).not.toContain("Get started");
    expect(homeHtml).not.toContain("Toggle menu");
    expect(homeHtml).not.toMatch(
      /href="\/en-XA\/(?:lore|build|hodl|assets)(?:[?#"])/u,
    );

    const prerenderManifest = JSON.parse(
      await readFile(
        join(fixture.root, ".next", "prerender-manifest.json"),
        "utf8",
      ),
    ) as { routes: Record<string, unknown> };
    expect(Object.hasOwn(prerenderManifest.routes, "/en-XA")).toBe(true);
    for (const path of ["lore", "build", "hodl", "assets"]) {
      expect(Object.hasOwn(prerenderManifest.routes, `/en-XA/${path}`)).toBe(
        false,
      );
    }

    const lowercase = await api.get("/en-xa", { maxRedirects: 0 });
    expect(lowercase.status()).toBe(307);
    expect(lowercase.headers().location).toBe("/en-XA");
    const trailingSlash = await api.get("/en-XA/", { maxRedirects: 0 });
    expect(trailingSlash.status()).toBe(308);
    expect(trailingSlash.headers().location).toBe("/en-XA");

    for (const pathname of [
      "/en-XA/lore",
      "/en-XA/build",
      "/en-XA/hodl",
      "/en-XA/assets",
      "/en-XA/missing",
    ]) {
      const response = await api.get(pathname, {
        headers: {
          "x-kaspa-i18n-route-miss": "1",
          "x-next-intl-locale": "en",
        },
      });
      expect(response.status(), pathname).toBe(404);
      const html = await response.text();
      expect(html, pathname).toContain('<html lang="en-XA" dir="ltr"');
      expect(html, pathname).toContain('data-kaspa-global-not-found="true"');
      expect(html, pathname).toMatch(/\[!! Þååĝëë Ńööţ Ƒööüüńď \| Kaspa !!\]/u);
    }

    const dotted = await api.get("/en-XA/missing.txt");
    expect(dotted.status()).toBe(404);
    expect(await dotted.text()).toContain('<html lang="en" dir="ltr"');

    const english = await api.get("/", {
      headers: { "accept-language": "en-XA" },
      maxRedirects: 0,
    });
    expect(english.status()).toBe(200);
    expect(await english.text()).toContain('<html lang="en" dir="ltr"');

    const pseudoOg = await api.get("/en-XA/opengraph-image");
    expect(pseudoOg.status()).toBe(200);
    expect(pseudoOg.headers()["content-type"]).toContain("image/png");
    expect(
      createHash("sha256")
        .update(await pseudoOg.body())
        .digest("hex"),
    ).toBe("ae84d2c2bf6be67acfcca4e2033249db8feffffc3a7790e3c3fa2f3e407d22a5");

    const proofCatalog = await api.get("/api/i18n/home-proof/en-XA");
    expect(proofCatalog.status()).toBe(200);
    const proofPayload = (await proofCatalog.json()) as Record<string, unknown>;
    expect(Object.keys(proofPayload)).toEqual(["home"]);
    expect(Object.keys(proofPayload.home as Record<string, unknown>)).toEqual([
      "proof",
    ]);
    expect(JSON.stringify(proofPayload)).toContain("[!! ");

    const sitemap = await api.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain("en-XA");

    if (!server) throw new Error("pseudo fixture server is unavailable");
    expect(server.readLogs()).not.toMatch(
      /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
    );
  });

  test("has no horizontal overflow at desktop and small mobile widths", async ({
    browser,
  }) => {
    test.skip(!activeProject, "pseudo build matrix runs once");
    if (!server) throw new Error("pseudo fixture was not started");

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 320, height: 640 },
    ]) {
      const context = await browser.newContext({
        baseURL: server.baseUrl,
        viewport,
        hasTouch: viewport.width < 768,
        isMobile: viewport.width < 768,
      });
      const page = await context.newPage();
      await page.goto("/en-XA", { waitUntil: "domcontentloaded" });
      await page.evaluate(async () => document.fonts.ready);

      if (viewport.width === 1440) {
        const bounds = await page.evaluate(async () => {
          const response = await fetch("/en-XA/opengraph-image");
          const bitmap = await createImageBitmap(await response.blob());
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("2D canvas is unavailable");
          context.drawImage(bitmap, 0, 0);
          const pixels = context.getImageData(
            0,
            0,
            bitmap.width,
            bitmap.height,
          ).data;
          const background = [pixels[0], pixels[1], pixels[2]];
          let minX = bitmap.width;
          let maxX = -1;
          let minY = bitmap.height;
          let maxY = -1;
          for (let y = 0; y < bitmap.height; y += 1) {
            for (let x = 0; x < bitmap.width; x += 1) {
              const offset = (y * bitmap.width + x) * 4;
              const distance =
                Math.abs(pixels[offset] - background[0]) +
                Math.abs(pixels[offset + 1] - background[1]) +
                Math.abs(pixels[offset + 2] - background[2]);
              if (pixels[offset + 3] === 0 || distance < 24) continue;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
          return {
            width: bitmap.width,
            height: bitmap.height,
            minX,
            maxX,
            minY,
            maxY,
          };
        });
        expect(bounds).toMatchObject({ width: 1200, height: 630 });
        expect(bounds.minX).toBeGreaterThanOrEqual(60);
        expect(bounds.maxX).toBeLessThanOrEqual(1140);
        expect(bounds.minY).toBeGreaterThanOrEqual(60);
        expect(bounds.maxY).toBeLessThanOrEqual(570);
      }

      const assertNoOverflow = async (state: string) => {
        const dimensions = await page.evaluate(() => ({
          body: document.body.scrollWidth,
          client: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(
          Math.max(dimensions.body, dimensions.document),
          `${viewport.width}px ${state}`,
        ).toBeLessThanOrEqual(dimensions.client + 1);
      };

      await assertNoOverflow("initial");
      if (viewport.width < 768) {
        const menu = page.locator('button[aria-controls="mobile-nav-links"]');
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        await assertNoOverflow("mobile menu open");
      }

      await page.locator("button.btn-primary").click();
      await expect(
        page
          .getByRole("heading", {
            name: "[!! Ļïïṽëë šüüþþļÿ ṽš. ëëḿïïššïïööń šçħëëďüüļëë !!]",
          })
          .first(),
      ).toBeVisible();
      await expect(
        page.getByRole("dialog").getByRole("button").first(),
      ).toBeFocused();
      await expect(page).toHaveURL(/(?:\?|&)proof=1(?:&|$)/u);
      await assertNoOverflow("proof overlay open");
      await context.close();
    }
  });

  test("lets keyboard users close the proof while its catalog loads", async ({
    browser,
  }) => {
    if (!server) throw new Error("pseudo fixture was not started");

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    await page.route("**/api/i18n/home-proof/en-XA", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.continue();
    });
    await page.goto("/en-XA");
    await page.locator("button.btn-primary").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).not.toHaveURL(/(?:\?|&)proof=1(?:&|$)/u);
    await expect(page.locator("button.btn-primary")).toBeFocused();
    await context.close();
  });

  test("rejects malformed proof payloads and keeps focus inside on retry", async ({
    browser,
  }) => {
    if (!server) throw new Error("pseudo fixture was not started");

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    let requests = 0;
    await page.route("**/api/i18n/home-proof/en-XA", async (route) => {
      requests += 1;
      if (requests === 1) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ error: "maintenance" }),
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto("/en-XA");
    await page.locator("button.btn-primary").click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByRole("button", { name: /Ťřÿ ååĝååïïń/u }).click();
    await expect(
      page.getByRole("dialog").getByRole("button").first(),
    ).toBeFocused();
    await expect(
      page
        .getByRole("heading", {
          name: "[!! Ļïïṽëë šüüþþļÿ ṽš. ëëḿïïššïïööń šçħëëďüüļëë !!]",
        })
        .first(),
    ).toBeVisible();
    expect(requests).toBe(2);
    await context.close();
  });
});
