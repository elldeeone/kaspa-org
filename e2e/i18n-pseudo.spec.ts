import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  expect,
  request as requestFactory,
  test,
  type APIRequestContext,
  type Page,
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
  NEXT_PUBLIC_KASPA_AI_ENABLED: "true",
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "preview",
  VERCEL_ENV: "preview",
} as const;

const pseudoRoutes = [
  {
    path: "/en-XA",
    internalPath: "/en-XA",
    englishFingerprint: "Get started",
  },
  {
    path: "/en-XA/lore",
    internalPath: "/en-XA/lore",
    englishFingerprint:
      "Kaspa is a live proof-of-work blockDAG running at 10 blocks per second.",
  },
  {
    path: "/en-XA/build",
    internalPath: "/en-XA/build",
    englishFingerprint: "Build on Kaspa",
  },
  {
    path: "/en-XA/assets",
    internalPath: "/en-XA/assets",
    englishFingerprint: "Kaspa logo assets",
  },
  {
    path: "/en-XA/hodl",
    internalPath: "/en-XA/hodl",
    englishFingerprint: "Buy KAS and move it into a wallet you control.",
  },
] as const;

const standaloneExampleNames = [
  "get-server-info",
  "get-block-dag-info",
  "subscribe-block-added",
  "subscribe-daa-changed",
  "utxo-context",
] as const;

const standaloneRuntimeFingerprints: Readonly<
  Record<(typeof standaloneExampleNames)[number], string>
> = {
  "get-server-info": "GetServerInfo",
  "get-block-dag-info": "GetBlockDagInfo",
  "subscribe-block-added": "Block Added",
  "subscribe-daa-changed": "DAA",
  "utxo-context": "UtxoProcessor",
};

const standaloneBasePath = "/vendor/kaspa-wasm/2.0.0/examples/web";
const localizedReturnPath = "/en-XA/build#try-live";
const localizedReturnQuery = new URLSearchParams({
  returnTo: localizedReturnPath,
}).toString();
const pseudoRoutePathnames = new Set<string>(
  pseudoRoutes.map((route) => route.path),
);
const forbiddenEnglishRoutePathnames = new Set([
  "/",
  "/lore",
  "/build",
  "/assets",
  "/hodl",
]);

let fixture: ProductionFixture | undefined;
let server: ProductionServer | undefined;
let api: APIRequestContext | undefined;
let activeProject = false;

function assertPrivatePseudoHtml(html: string, pathname: string) {
  expect(html, pathname).toContain('<html lang="en-XA" dir="ltr"');
  expect(html, pathname).toContain("[!! ");
  expect(html, pathname).toContain(" !!]");
  expect(html, pathname).toContain(
    '<meta name="robots" content="noindex, nofollow"/>',
  );
  expect(html, pathname).not.toContain('<link rel="canonical"');
  expect(html, pathname).not.toContain('hreflang="');
  expect(html, pathname).not.toContain('property="og:');
  expect(html, pathname).not.toContain('name="twitter:');
  expect(html, pathname).not.toContain(
    "https://kaspa.org/en-XA/opengraph-image",
  );
}

async function waitForStableLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => image.currentSrc)
        .map((image) =>
          image.complete ? undefined : image.decode().catch(() => undefined),
        ),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function installStandaloneExampleMocks(page: Page) {
  const interceptedModules = new Set<"core" | "rpc">();

  await page.route(
    "**/vendor/kaspa-wasm/2.0.0/web/kaspa-rpc/kaspa.js",
    async (route) => {
      interceptedModules.add("rpc");
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          export default async function initialize() {}

          export class Resolver {}

          export class RpcClient {
            constructor() {
              this.url = "mock://local-rpc";
              this.listeners = new Map();
            }

            addEventListener(name, listener) {
              const listeners = this.listeners.get(name) ?? [];
              listeners.push(listener);
              this.listeners.set(name, listeners);
            }

            async emit(name) {
              for (const listener of this.listeners.get(name) ?? []) {
                await listener({ type: name });
              }
            }

            async connect() {
              await this.emit("connect");
            }

            async disconnect() {
              await this.emit("disconnect");
            }

            async getServerInfo() {
              return { serverVersion: "mock-server" };
            }

            async getBlockDagInfo() {
              return { blockCount: 1 };
            }

            async subscribeBlockAdded() {}
            async subscribeVirtualDaaScoreChanged() {}
          }

          export const Encoding = { Borsh: "borsh" };
        `,
      });
    },
  );

  await page.route(
    "**/vendor/kaspa-wasm/2.0.0/web/kaspa-core/kaspa.js",
    async (route) => {
      interceptedModules.add("core");
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          export default async function initialize() {}

          export class Resolver {
            async connect() {
              return { url: "mock://local-core" };
            }
          }

          export class RpcClient {}

          export class UtxoProcessor {
            async start() {}
            async stop() {}
            addEventListener() {}
          }

          export class UtxoContext {
            async clear() {}
            async trackAddresses() {}
          }

          export const Encoding = { Borsh: "borsh" };
        `,
      });
    },
  );

  return interceptedModules;
}

async function assertNoHorizontalOverflow(
  page: Page,
  viewportWidth: number,
  state: string,
) {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(
    Math.max(dimensions.body, dimensions.document),
    `${viewportWidth}px ${state}`,
  ).toBeLessThanOrEqual(dimensions.client + 1);
}

test.describe("Phase 3 full-site private pseudo-locale", () => {
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

  test("renders every route statically, privately, and pseudo-localized", async () => {
    test.skip(!activeProject, "pseudo build matrix runs once");
    if (!api || !fixture) throw new Error("pseudo fixture was not started");

    const prerenderManifest = JSON.parse(
      await readFile(
        join(fixture.root, ".next", "prerender-manifest.json"),
        "utf8",
      ),
    ) as { routes: Record<string, unknown> };

    for (const route of pseudoRoutes) {
      const response = await api.get(route.path);
      expect(response.status(), route.path).toBe(200);
      expect(response.headers()["x-nextjs-cache"], route.path).toBe("HIT");
      expect(response.headers()["x-nextjs-prerender"], route.path).toContain(
        "1",
      );

      const html = await response.text();
      assertPrivatePseudoHtml(html, route.path);
      expect(html, route.path).not.toContain(route.englishFingerprint);
      expect(
        html,
        `${route.path} must not expose the disabled AI capability`,
      ).not.toContain("[!! ÅÅšķ ååńÿţħïïńĝ !!]");
      expect(
        Object.hasOwn(prerenderManifest.routes, route.internalPath),
        route.internalPath,
      ).toBe(true);
    }

    const lowercase = await api.get("/en-xa", { maxRedirects: 0 });
    expect(lowercase.status()).toBe(307);
    expect(lowercase.headers().location).toBe("/en-XA");
    const trailingSlash = await api.get("/en-XA/", { maxRedirects: 0 });
    expect(trailingSlash.status()).toBe(308);
    expect(trailingSlash.headers().location).toBe("/en-XA");

    const missing = await api.get("/en-XA/missing", {
      headers: {
        "x-kaspa-i18n-route-miss": "1",
        "x-next-intl-locale": "en",
      },
    });
    expect(missing.status()).toBe(404);
    const missingHtml = await missing.text();
    expect(missingHtml).toContain('<html lang="en-XA" dir="ltr"');
    expect(missingHtml).toContain('data-kaspa-global-not-found="true"');
    expect(missingHtml).toMatch(/\[!! Þååĝëë Ńööţ Ƒööüüńď \| Kaspa !!\]/u);

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

  test("restores every ordinary localized destination and key interaction", async ({
    browser,
  }) => {
    test.skip(!activeProject, "pseudo build matrix runs once");
    if (!api || !server) throw new Error("pseudo fixture was not started");

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    const observedPseudoRoutes = new Set<string>();

    for (const route of pseudoRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const headingText = await page.locator("h1").first().textContent();
      expect(headingText, `${route.path} h1`).toContain("[!! ");

      const hrefs = await page
        .locator("a[href]")
        .evaluateAll((anchors) =>
          anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
        );
      for (const href of hrefs) {
        const url = new URL(href);
        if (url.origin !== new URL(server.baseUrl).origin) continue;
        expect(
          forbiddenEnglishRoutePathnames.has(url.pathname),
          `${route.path} leaked an English route link: ${url.pathname}`,
        ).toBe(false);
        if (!pseudoRoutePathnames.has(url.pathname)) continue;
        observedPseudoRoutes.add(url.pathname);
        const response = await api.get(url.pathname);
        expect(response.status(), `${route.path} -> ${url.pathname}`).toBe(200);
      }
    }

    await page.goto("/en-XA");
    for (const href of [
      "/en-XA/lore",
      "/en-XA/hodl#wallet",
      "/en-XA/hodl#buy",
    ]) {
      expect(
        await page.locator(`a[href="${href}"]`).count(),
        `Home CTA ${href}`,
      ).toBeGreaterThan(0);
    }
    for (const href of [
      "https://research.kas.pa/",
      "https://kgi.kaspad.net/",
    ]) {
      expect(
        await page.locator(`nav a[href="${href}"]`).count(),
        `external navigation ${href}`,
      ).toBeGreaterThan(0);
    }

    const logo = page.locator('nav a[href="/en-XA"]').first();
    await logo.click({ button: "right" });
    const assetsMenuLink = page.locator(
      '[role="menu"] a[href="/en-XA/assets"]',
    );
    await expect(assetsMenuLink).toBeVisible();
    observedPseudoRoutes.add("/en-XA/assets");
    expect((await api.get("/en-XA/assets")).status()).toBe(200);
    await page.keyboard.press("Escape");

    for (const route of pseudoRoutes) {
      expect(observedPseudoRoutes.has(route.path), route.path).toBe(true);
    }

    await page.goto("/en-XA/build#try-live");
    const tryLive = page.locator("#try-live");
    await tryLive.scrollIntoViewIfNeeded();
    const exampleButtons = tryLive.locator("button[aria-pressed]:visible");
    await expect(exampleButtons).toHaveCount(standaloneExampleNames.length);
    const exampleFrame = tryLive.locator("iframe");
    for (const [index, name] of standaloneExampleNames.entries()) {
      await exampleButtons.nth(index).click();
      await expect(exampleButtons.nth(index)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const source = await exampleFrame.getAttribute("src");
      expect(source, name).toContain(`${name}.en-XA.html`);
      expect(source, name).toContain(localizedReturnQuery);
    }

    await page.goto("/en-XA/hodl#wallet");
    const walletFinder = page.locator("[data-wallet-finder-root]");
    await expect(walletFinder).toBeVisible();
    const wizardHeading = walletFinder.locator("h3").first();
    const initialWizardHeading = await wizardHeading.textContent();
    if (!initialWizardHeading) throw new Error("wallet wizard has no heading");
    await walletFinder.locator("button.btn-primary").click();
    await expect(wizardHeading).not.toHaveText(initialWizardHeading);

    await context.close();
  });

  test("serves the exact Preview-only standalone artifact set", async ({
    browser,
  }) => {
    test.skip(!activeProject, "pseudo build matrix runs once");
    if (!api || !server) throw new Error("pseudo fixture was not started");

    for (const name of standaloneExampleNames) {
      const pathname = `${standaloneBasePath}/${name}.en-XA.html`;
      const response = await api.get(`${pathname}?${localizedReturnQuery}`);
      expect(response.status(), pathname).toBe(200);
      expect(response.headers()["content-type"], pathname).toContain(
        "text/html",
      );
      const html = await response.text();
      expect(html, pathname).toContain('<html lang="en-XA" dir="ltr">');
      expect(html, pathname).toContain(
        '<meta name="robots" content="noindex, nofollow">',
      );
      expect(html, pathname).toContain("from './resources/utils.en-XA.js'");
      expect(html, pathname).toContain("[!! ");
      expect(html, pathname).not.toContain('<link rel="canonical"');
      expect(html, pathname).not.toContain('hreflang="');
      expect(html, pathname).not.toContain('property="og:');
      expect(html, pathname).not.toContain('name="twitter:');
    }

    const utilsPath = `${standaloneBasePath}/resources/utils.en-XA.js`;
    const utilsResponse = await api.get(utilsPath);
    expect(utilsResponse.status()).toBe(200);
    expect(utilsResponse.headers()["content-type"]).toContain("javascript");
    const utils = await utilsResponse.text();
    expect(utils).toContain("[!! ");
    expect(utils).toContain("'/en-XA/build'");
    expect(utils).toContain("'/en-XA/build#try-live'");

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    const interceptedSdkModules = await installStandaloneExampleMocks(page);
    for (const name of standaloneExampleNames) {
      await page.goto(
        `${standaloneBasePath}/${name}.en-XA.html?${localizedReturnQuery}`,
        { waitUntil: "domcontentloaded" },
      );
      await expect(page.locator("#back-link"), name).toHaveAttribute(
        "href",
        localizedReturnPath,
      );
      const runtimeOutput = page
        .locator("code")
        .filter({ hasText: standaloneRuntimeFingerprints[name] })
        .first();
      await expect(runtimeOutput, `${name} runtime output`).toBeVisible();
      await expect(
        runtimeOutput,
        `${name} pseudo runtime output`,
      ).toContainText("[!! ");
      expect(
        interceptedSdkModules.has(name === "utxo-context" ? "core" : "rpc"),
        `${name} must use the deterministic SDK mock`,
      ).toBe(true);
    }

    await page.goto(
      `${standaloneBasePath}/get-server-info.en-XA.html?${localizedReturnQuery}`,
      { waitUntil: "domcontentloaded" },
    );
    const backLink = page.locator("#back-link");
    await backLink.click();
    await expect(page).toHaveURL(/\/en-XA\/build#try-live$/u);
    await context.close();
  });

  test("has no horizontal overflow across every route and target width", async ({
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

      for (const route of pseudoRoutes) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStableLayout(page);
        await assertNoHorizontalOverflow(
          page,
          viewport.width,
          `${route.path} initial`,
        );

        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await waitForStableLayout(page);
        await assertNoHorizontalOverflow(
          page,
          viewport.width,
          `${route.path} after full-page scroll`,
        );

        if (viewport.width < 768) {
          const menu = page.locator('button[aria-controls="mobile-nav-links"]');
          await menu.click();
          await expect(menu).toHaveAttribute("aria-expanded", "true");
          await assertNoHorizontalOverflow(
            page,
            viewport.width,
            `${route.path} mobile menu open`,
          );
          await menu.click();
          await expect(menu).toHaveAttribute("aria-expanded", "false");

          const sectionSheetId =
            route.path === "/en-XA/build"
              ? "mobile-section-sheet"
              : route.path === "/en-XA/hodl"
                ? "mobile-section-sheet-hodl"
                : null;
          if (sectionSheetId) {
            const sectionId =
              route.path === "/en-XA/build" ? "#paths" : "#wallet";
            await page.locator(sectionId).scrollIntoViewIfNeeded();
            const sectionToggle = page.locator(
              `button[aria-controls="${sectionSheetId}"]`,
            );
            await expect(sectionToggle).toBeVisible();
            await sectionToggle.click();
            const sectionSheet = page.locator(`#${sectionSheetId}`);
            await expect(sectionSheet).toBeVisible();
            await assertNoHorizontalOverflow(
              page,
              viewport.width,
              `${route.path} section sheet open`,
            );
            await sectionSheet.locator("button").first().click();
            await expect(sectionToggle).toHaveAttribute(
              "aria-expanded",
              "false",
            );
          }
        }

        if (route.path === "/en-XA") {
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

          const proofTrigger = page.locator("button.btn-primary");
          await proofTrigger.click();
          const proofDialog = page.getByRole("dialog");
          await expect(proofDialog).toBeVisible();
          await expect(proofDialog).toContainText("[!! ");
          await expect(proofDialog.getByRole("button").first()).toBeFocused();
          await expect(page).toHaveURL(/(?:\?|&)proof=1(?:&|$)/u);
          await assertNoHorizontalOverflow(
            page,
            viewport.width,
            `${route.path} proof overlay open`,
          );
          await page.keyboard.press("Escape");
          await expect(proofDialog).toBeHidden();
          await expect(proofTrigger).toBeFocused();
        }
      }

      await context.close();
    }
  });

  test("lets keyboard users close the proof while its catalog loads", async ({
    browser,
  }) => {
    test.skip(!activeProject, "pseudo build matrix runs once");
    if (!server) throw new Error("pseudo fixture was not started");

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    await page.route("**/api/i18n/home-proof/en-XA", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.continue();
    });
    await page.goto("/en-XA");
    const proofTrigger = page.locator("button.btn-primary");
    await proofTrigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).not.toHaveURL(/(?:\?|&)proof=1(?:&|$)/u);
    await expect(proofTrigger).toBeFocused();
    await context.close();
  });

  test("rejects malformed proof payloads and keeps focus inside on retry", async ({
    browser,
  }) => {
    test.skip(!activeProject, "pseudo build matrix runs once");
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
    await page.getByRole("dialog").locator("button.btn-primary").click();
    await expect(
      page.getByRole("dialog").getByRole("button").first(),
    ).toBeFocused();
    await expect(page.getByRole("dialog")).toContainText("[!! ");
    expect(requests).toBe(2);
    await context.close();
  });
});
