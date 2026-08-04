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
import {
  assertEqualControlRow,
  assertNoHorizontalOverflow,
  assertWordsStayOnSingleLine,
  installStandaloneExampleMocks,
  measureOpenGraphImage,
  standaloneBasePath,
  standaloneExampleNames,
  waitForStableLayout,
} from "./i18n-preview-helpers";

const previewEnvironment = {
  NEXT_PUBLIC_KASPA_AI_ENABLED: "true",
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "preview",
  VERCEL_ENV: "preview",
} as const;

const spanishRoutes = [
  {
    id: "home",
    path: "/es",
    internalPath: "/es",
    englishFingerprint: "Get started",
  },
  {
    id: "lore",
    path: "/es/lore",
    internalPath: "/es/lore",
    englishFingerprint:
      "Kaspa is a live proof-of-work blockDAG running at 10 blocks per second.",
  },
  {
    id: "build",
    path: "/es/build",
    internalPath: "/es/build",
    englishFingerprint: "Build on Kaspa",
  },
  {
    id: "assets",
    path: "/es/assets",
    internalPath: "/es/assets",
    englishFingerprint: "Kaspa logo assets",
  },
  {
    id: "hodl",
    path: "/es/hodl",
    internalPath: "/es/hodl",
    englishFingerprint: "Buy KAS and move it into a wallet you control.",
  },
] as const;

type SpanishRouteId = (typeof spanishRoutes)[number]["id"];
type MessageCatalog = Record<string, unknown>;

const spanishRoutePathnames = new Set<string>(
  spanishRoutes.map((route) => route.path),
);
const forbiddenEnglishRoutePathnames = new Set([
  "/",
  "/lore",
  "/build",
  "/assets",
  "/hodl",
]);
const translatedSlugPaths = [
  "/es/historia",
  "/es/construir",
  "/es/recursos",
] as const;

// These are the reviewed, intentionally unchanged user-visible catalog entries.
// Every other static English catalog value is forbidden in rendered Spanish UI.
const approvedUnchangedCatalogKeys = new Set([
  "shared.navigation.links.lore",
  "shared.navigation.links.hodl",
  "shared.navigation.links.build",
  "shared.navigation.links.think",
  "shared.navigation.links.dagviz",
  "shared.footer.links.github",
  "shared.ai.launcher.beta",
  "shared.ai.providers.chatgpt",
  "shared.ai.providers.claude",
  "shared.ai.providers.perplexity",
  "home.proof.supply.timeline.crescendo.label",
  "lore.metadata.title",
  "build.terms.utxo",
  "build.artifacts.utxo.error",
  "build.tooling.emerging.python.status",
  "build.help.links.discord.eyebrow",
  "assets.groups.lockup",
  "hodl.navigation.current",
  "hodl.help.discord",
  "hodl.walletFinder.operatingSystems.android",
  "hodl.walletFinder.operatingSystems.windows",
  "hodl.walletFinder.operatingSystems.mac",
  "hodl.walletFinder.operatingSystems.linux",
  "hodl.walletFinder.operatingSystems.hardware",
  "hodl.walletFinder.guidance.hardware.shortTitle",
  "hodl.walletFinder.criteria.control.label",
  "hodl.walletFinder.features.multisig.label",
  "hodl.walletFinder.actions.app_store",
  "hodl.walletFinder.actions.google_play",
]);

const spanishRuntimeOutput: Readonly<
  Record<(typeof standaloneExampleNames)[number], string>
> = {
  "get-server-info": "Respuesta de GetServerInfo:",
  "get-block-dag-info": "Respuesta de GetBlockDagInfo:",
  "subscribe-block-added": "Suscribiéndose al evento de bloque añadido...",
  "subscribe-daa-changed": "Registrando notificaciones de DAA...",
  "utxo-context": "Esta demostración está pensada para pruebas manuales",
};

const localizedReturnPath = "/es/build#try-live";
const localizedReturnQuery = new URLSearchParams({
  returnTo: localizedReturnPath,
}).toString();

let fixture: ProductionFixture | undefined;
let server: ProductionServer | undefined;
let api: APIRequestContext | undefined;
let activeProject = false;

function getVisibleLanguageSelector(page: Page) {
  return page.locator("[data-language-selector]:visible");
}

async function openLanguageMenu(page: Page, label: string) {
  const selector = getVisibleLanguageSelector(page);
  const trigger = selector.getByRole("button", { name: label, exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = selector.getByRole("menu", { name: label });
  await expect(menu).toBeVisible();
  return { menu, selector, trigger };
}

function flattenCatalog(
  value: MessageCatalog,
  prefix = "",
  output = new Map<string, string>(),
): Map<string, string> {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") {
      output.set(path, child);
    } else if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenCatalog(child as MessageCatalog, path, output);
    }
  }
  return output;
}

function normalizeVisibleText(value: string) {
  return value
    .replace(/<[^>]+>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function containsWholeVisibleMessage(bodyText: string, message: string) {
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(message)}(?=$|[^\\p{L}\\p{N}])`,
    "u",
  ).test(bodyText);
}

function isStaticVisibleMessage(value: string) {
  return !value.includes("{") && normalizeVisibleText(value).length >= 8;
}

async function loadCatalog(
  fixtureRoot: string,
  locale: "en" | "es",
  namespace: "shared" | SpanishRouteId,
) {
  return JSON.parse(
    await readFile(
      join(fixtureRoot, "messages", locale, `${namespace}.json`),
      "utf8",
    ),
  ) as MessageCatalog;
}

async function auditRenderedSpanishText(
  page: Page,
  fixtureRoot: string,
  routeId: SpanishRouteId,
) {
  const bodyText = normalizeVisibleText(await page.locator("body").innerText());

  for (const namespace of ["shared", routeId] as const) {
    const [english, spanish] = await Promise.all([
      loadCatalog(fixtureRoot, "en", namespace),
      loadCatalog(fixtureRoot, "es", namespace),
    ]);
    const englishMessages = flattenCatalog(english);
    const spanishMessages = flattenCatalog(spanish);

    for (const [key, englishMessage] of englishMessages) {
      if (!isStaticVisibleMessage(englishMessage)) continue;
      const spanishMessage = spanishMessages.get(key);
      const catalogKey = `${namespace}.${key}`;
      const visibleEnglish = normalizeVisibleText(englishMessage);

      if (englishMessage === spanishMessage) {
        if (!containsWholeVisibleMessage(bodyText, visibleEnglish)) continue;
        expect(
          approvedUnchangedCatalogKeys.has(catalogKey),
          `${routeId} renders unapproved unchanged English at ${catalogKey}: ${visibleEnglish}`,
        ).toBe(true);
        continue;
      }

      expect(
        containsWholeVisibleMessage(bodyText, visibleEnglish),
        `${routeId} leaked English ${catalogKey}: ${visibleEnglish}`,
      ).toBe(false);
    }
  }
}

function assertPrivateSpanishHtml(html: string, pathname: string) {
  expect(html, pathname).toContain('<html lang="es" dir="ltr"');
  expect(html, pathname).toContain(
    '<meta name="robots" content="noindex, nofollow"/>',
  );
  expect(html, pathname).not.toContain('<link rel="canonical"');
  expect(html, pathname).not.toContain('hreflang="');
  expect(html, pathname).not.toContain('property="og:');
  expect(html, pathname).not.toContain('name="twitter:');
  expect(html, pathname).not.toContain("https://kaspa.org/es/opengraph-image");
}

test.describe("Phase 4 complete private Spanish Preview", () => {
  test.skip(
    process.env.PLAYWRIGHT_E2E_SPANISH_ONLY !== "1",
    "run with npm run test:e2e:i18n:spanish",
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

  test("renders the complete static, private route and error contract", async () => {
    test.skip(!activeProject, "Spanish Preview matrix runs once");
    if (!api || !fixture || !server) {
      throw new Error("Spanish Preview fixture was not started");
    }

    const prerenderManifest = JSON.parse(
      await readFile(
        join(fixture.root, ".next", "prerender-manifest.json"),
        "utf8",
      ),
    ) as { routes: Record<string, unknown> };

    for (const route of spanishRoutes) {
      const response = await api.get(route.path);
      expect(response.status(), route.path).toBe(200);
      expect(response.headers()["x-nextjs-cache"], route.path).toBe("HIT");
      expect(response.headers()["x-nextjs-prerender"], route.path).toContain(
        "1",
      );
      const html = await response.text();
      assertPrivateSpanishHtml(html, route.path);
      expect(html, route.path).not.toContain(route.englishFingerprint);
      expect(html, `${route.path} must not expose Spanish AI`).not.toContain(
        "Pregunta lo que quieras",
      );
      expect(
        Object.hasOwn(prerenderManifest.routes, route.internalPath),
        route.internalPath,
      ).toBe(true);
    }

    for (const translatedPath of translatedSlugPaths) {
      const response = await api.get(translatedPath, { maxRedirects: 0 });
      expect(response.status(), translatedPath).toBe(404);
      expect(response.headers().location, translatedPath).toBeUndefined();
    }

    for (const unknown of [
      { path: "/missing", lang: "en" },
      { path: "/es/missing", lang: "es" },
      { path: "/zz/missing", lang: "en" },
    ] as const) {
      const response = await api.get(unknown.path, {
        headers: {
          "x-kaspa-i18n-route-miss": "1",
          "x-next-intl-locale": unknown.lang === "es" ? "en" : "es",
        },
      });
      expect(response.status(), unknown.path).toBe(404);
      const html = await response.text();
      expect(html, unknown.path).toContain(
        `<html lang="${unknown.lang}" dir="ltr"`,
      );
      expect(html, unknown.path).toContain(
        'data-kaspa-global-not-found="true"',
      );
      if (unknown.lang === "es") {
        expect(html, unknown.path).toContain("Página no encontrada | Kaspa");
      } else {
        expect(html, unknown.path).toContain("Page Not Found | Kaspa");
      }
    }

    for (const pathname of ["/es/missing.txt", "/es/missing%2Etxt"]) {
      const dotted = await api.get(pathname);
      expect(dotted.status(), pathname).toBe(404);
      expect(await dotted.text(), pathname).toContain(
        '<html lang="en" dir="ltr"',
      );
    }

    const spanishOg = await api.get("/es/opengraph-image");
    const repeatedSpanishOg = await api.get("/es/opengraph-image");
    const englishOg = await api.get("/opengraph-image");
    expect(spanishOg.status()).toBe(200);
    expect(spanishOg.headers()["content-type"]).toContain("image/png");
    const spanishOgHash = createHash("sha256")
      .update(await spanishOg.body())
      .digest("hex");
    expect(
      createHash("sha256")
        .update(await repeatedSpanishOg.body())
        .digest("hex"),
    ).toBe(spanishOgHash);
    expect(
      createHash("sha256")
        .update(await englishOg.body())
        .digest("hex"),
    ).not.toBe(spanishOgHash);

    const sitemap = await api.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain("/es");

    expect((await api.get("/api/ask")).status()).toBe(405);
    const proofCatalog = await api.get("/api/i18n/home-proof/es");
    expect(proofCatalog.status()).toBe(200);
    const proofText = await proofCatalog.text();
    expect(proofText).toContain('"trigger":"Verificar la prueba"');
    expect(proofText).not.toContain('"trigger":"Verify the proof"');

    expect(server.readLogs()).not.toMatch(
      /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
    );
  });

  test("renders exact Spanish structured data and a safe Open Graph image", async ({
    browser,
  }) => {
    test.skip(!activeProject, "Spanish Preview matrix runs once");
    if (!fixture || !server) {
      throw new Error("Spanish Preview fixture was not started");
    }

    const sharedCatalog = await loadCatalog(fixture.root, "es", "shared");
    const structuredData = sharedCatalog.structuredData as MessageCatalog;
    const expectedStructuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://kaspa.org#organization",
          name: "Kaspa",
          url: "https://kaspa.org",
          logo: "https://kaspa.org/kaspa-logo.svg",
          description: structuredData.organizationDescription,
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
    };

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    for (const route of spanishRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const scripts = page.locator('script[type="application/ld+json"]');
      await expect(scripts, route.path).toHaveCount(1);
      const rendered = await scripts.textContent();
      expect(rendered, route.path).not.toBeNull();
      expect(JSON.parse(rendered ?? "null"), route.path).toEqual(
        expectedStructuredData,
      );
    }

    const metrics = await measureOpenGraphImage(page, "/es/opengraph-image");
    expect(metrics).toMatchObject({ width: 1200, height: 630 });
    expect(metrics.inkPixels).toBeGreaterThan(1_000);
    expect(metrics.inkBandCount).toBeGreaterThanOrEqual(2);
    expect(metrics.minX).toBeGreaterThanOrEqual(48);
    expect(metrics.maxX).toBeLessThanOrEqual(1152);
    expect(metrics.minY).toBeGreaterThanOrEqual(48);
    expect(metrics.maxY).toBeLessThanOrEqual(582);
    await context.close();
  });

  test("keeps navigation, CTAs, selector state, and key interactions in Spanish", async ({
    browser,
  }) => {
    test.skip(!activeProject, "Spanish Preview matrix runs once");
    if (!api || !fixture || !server) {
      throw new Error("Spanish Preview fixture was not started");
    }

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    const observedSpanishRoutes = new Set<string>();

    for (const route of spanishRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      await auditRenderedSpanishText(page, fixture.root, route.id);
      const routeCatalog = await loadCatalog(fixture.root, "es", route.id);
      const metadata = routeCatalog.metadata as Record<string, unknown>;
      expect(await page.title(), `${route.path} title`).toBe(metadata.title);
      await expect(
        page.locator('meta[name="description"]'),
        `${route.path} description`,
      ).toHaveAttribute("content", metadata.description as string);
      await expect(
        page.getByPlaceholder("Pregunta lo que quieras..."),
        `${route.path} must not expose the Spanish AI launcher`,
      ).toHaveCount(0);

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
        expect(
          translatedSlugPaths.includes(
            url.pathname as (typeof translatedSlugPaths)[number],
          ),
          `${route.path} linked a translated slug: ${url.pathname}`,
        ).toBe(false);
        if (spanishRoutePathnames.has(url.pathname)) {
          observedSpanishRoutes.add(url.pathname);
        }
      }
    }

    await page.goto("/es");
    for (const href of ["/es/lore", "/es/hodl#wallet", "/es/hodl#buy"]) {
      expect(
        await page.locator(`a[href="${href}"]`).count(),
        `Spanish Home CTA ${href}`,
      ).toBeGreaterThan(0);
    }
    for (const href of [
      "/es/lore",
      "/es/hodl",
      "/es/build",
      "https://research.kas.pa/",
      "https://kgi.kaspad.net/",
    ]) {
      expect(
        await page.locator(`nav a[href="${href}"]`).count(),
        `Spanish navigation ${href}`,
      ).toBeGreaterThan(0);
    }

    const logo = page.locator('nav a[href="/es"]').first();
    await logo.click({ button: "right" });
    const assetsMenuLink = page.locator('[role="menu"] a[href="/es/assets"]');
    await expect(assetsMenuLink).toBeVisible();
    observedSpanishRoutes.add("/es/assets");
    await page.keyboard.press("Escape");

    for (const route of spanishRoutes) {
      expect(observedSpanishRoutes.has(route.path), route.path).toBe(true);
    }

    await page.goto("/es/lore?source=spanish-gate&step=4#roadmap");
    const spanishSelector = getVisibleLanguageSelector(page);
    const spanishTrigger = spanishSelector.getByRole("button", {
      name: "Idioma",
      exact: true,
    });
    await spanishTrigger.focus();
    await expect(spanishTrigger).toBeFocused();
    await spanishTrigger.press("ArrowDown");
    const spanishMenu = spanishSelector.getByRole("menu", { name: "Idioma" });
    await expect(spanishMenu).toBeVisible();
    await expect(spanishMenu).not.toContainText("EN-XA");
    const currentSpanish = spanishMenu.getByRole("menuitemradio", {
      name: "Español",
    });
    await expect(currentSpanish).toHaveAttribute("aria-checked", "true");
    await expect(currentSpanish).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(spanishMenu).toHaveCount(0);
    await expect(spanishTrigger).toBeFocused();

    await spanishTrigger.press("Enter");
    const switchToEnglish = spanishSelector.getByRole("menuitemradio", {
      name: "English",
    });
    await switchToEnglish.press("Enter");
    await expect(page).toHaveURL(
      /\/lore\?source=spanish-gate&step=4#roadmap$/u,
    );
    const englishSelector = getVisibleLanguageSelector(page);
    const englishTrigger = englishSelector.getByRole("button", {
      name: "Language",
      exact: true,
    });
    await englishTrigger.press("Enter");
    const englishMenu = englishSelector.getByRole("menu", {
      name: "Language",
    });
    await expect(
      englishMenu.getByRole("menuitemradio", { name: "English" }),
    ).toHaveAttribute("aria-checked", "true");
    const switchToSpanish = englishMenu.getByRole("menuitemradio", {
      name: "Español",
    });
    await switchToSpanish.press("Enter");
    await expect(page).toHaveURL(
      /\/es\/lore\?source=spanish-gate&step=4#roadmap$/u,
    );

    await page.goto("/%65%73/lore?source=encoded-locale#roadmap");
    const { menu: encodedMenu } = await openLanguageMenu(page, "Idioma");
    await encodedMenu.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page).toHaveURL(/\/lore\?source=encoded-locale#roadmap$/u);

    await page.goto("/es/%256core");
    const { menu: unknownPathMenu } = await openLanguageMenu(page, "Idioma");
    await unknownPathMenu
      .getByRole("menuitemradio", { name: "English" })
      .click();
    await expect(page).toHaveURL(/\/%256core$/u);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator('[data-kaspa-global-not-found="true"]'),
    ).toBeVisible();

    await page.goto("/en-XA/lore");
    await expect(page.locator("[data-language-selector]")).toHaveCount(0);

    await page.goto("/es/missing");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(
      getVisibleLanguageSelector(page).getByRole("button", {
        name: "Idioma",
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/es/missing.txt");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("[data-language-selector]")).toHaveCount(0);

    await page.goto("/es/build#try-live");
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
      expect(source, name).toContain(`${name}.es.html`);
      expect(source, name).toContain(localizedReturnQuery);
    }

    await page.goto("/es/hodl#wallet");
    const walletFinder = page.locator("[data-wallet-finder-root]");
    await expect(walletFinder).toBeVisible();
    const wizardHeading = walletFinder.locator("h3").first();
    const initialHeading = await wizardHeading.textContent();
    if (!initialHeading)
      throw new Error("Spanish wallet wizard has no heading");
    await walletFinder.locator("button.btn-primary").click();
    await expect(wizardHeading).not.toHaveText(initialHeading);

    await context.close();
  });

  test("keeps the mobile language selector accessible and route-preserving", async ({
    browser,
  }) => {
    test.skip(!activeProject, "Spanish Preview matrix runs once");
    if (!server) throw new Error("Spanish Preview fixture was not started");

    const context = await browser.newContext({
      baseURL: server.baseUrl,
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto("/es/lore?source=spanish-mobile-gate&step=4#roadmap");
    const spanishSelector = getVisibleLanguageSelector(page);
    const spanishTrigger = spanishSelector.getByRole("button", {
      name: "Idioma",
      exact: true,
    });
    await spanishTrigger.focus();
    await spanishTrigger.press("Enter");
    const spanishMenu = spanishSelector.getByRole("menu", { name: "Idioma" });
    await expect(spanishMenu).not.toContainText("EN-XA");
    await expect(
      spanishMenu.getByRole("menuitemradio", { name: "Español" }),
    ).toHaveAttribute("aria-checked", "true");
    const switchToEnglish = spanishMenu.getByRole("menuitemradio", {
      name: "English",
    });
    await switchToEnglish.press("Enter");
    await expect(page).toHaveURL(
      /\/lore\?source=spanish-mobile-gate&step=4#roadmap$/u,
    );

    const englishSelector = getVisibleLanguageSelector(page);
    const englishTrigger = englishSelector.getByRole("button", {
      name: "Language",
      exact: true,
    });
    await englishTrigger.press("Enter");
    const englishMenu = englishSelector.getByRole("menu", {
      name: "Language",
    });
    await expect(
      englishMenu.getByRole("menuitemradio", { name: "English" }),
    ).toHaveAttribute("aria-checked", "true");
    const switchToSpanish = englishMenu.getByRole("menuitemradio", {
      name: "Español",
    });
    await switchToSpanish.press("Enter");
    await expect(page).toHaveURL(
      /\/es\/lore\?source=spanish-mobile-gate&step=4#roadmap$/u,
    );

    await context.close();
  });

  test("serves and runs every Spanish standalone artifact deterministically", async ({
    browser,
  }) => {
    test.skip(!activeProject, "Spanish Preview matrix runs once");
    if (!api || !server) {
      throw new Error("Spanish Preview fixture was not started");
    }

    for (const name of standaloneExampleNames) {
      const pathname = `${standaloneBasePath}/${name}.es.html`;
      const response = await api.get(`${pathname}?${localizedReturnQuery}`);
      expect(response.status(), pathname).toBe(200);
      expect(response.headers()["content-type"], pathname).toContain(
        "text/html",
      );
      const html = await response.text();
      expect(html, pathname).toContain('<html lang="es" dir="ltr">');
      expect(html, pathname).toContain(
        '<meta name="robots" content="noindex, nofollow">',
      );
      expect(html, pathname).toContain("from './resources/utils.es.js'");
      expect(html, pathname).not.toContain("Connecting to Kaspa network");
      expect(html, pathname).not.toContain('<link rel="canonical"');
      expect(html, pathname).not.toContain('hreflang="');
      expect(html, pathname).not.toContain('property="og:');
      expect(html, pathname).not.toContain('name="twitter:');
    }

    const utilsPath = `${standaloneBasePath}/resources/utils.es.js`;
    const utilsResponse = await api.get(utilsPath);
    expect(utilsResponse.status()).toBe(200);
    const utils = await utilsResponse.text();
    expect(utils).toContain("Volver");
    expect(utils).toContain("Red:");
    expect(utils).toContain("'/es/build'");
    expect(utils).toContain("'/es/build#try-live'");
    expect(utils).toContain("innerHTML = ` | Conectando...`;");

    const context = await browser.newContext({ baseURL: server.baseUrl });
    const page = await context.newPage();
    const interceptedSdkModules = await installStandaloneExampleMocks(page);
    for (const name of standaloneExampleNames) {
      await page.goto(
        `${standaloneBasePath}/${name}.es.html?${localizedReturnQuery}`,
        { waitUntil: "domcontentloaded" },
      );
      await expect(page.locator("#back-link"), name).toHaveAttribute(
        "href",
        localizedReturnPath,
      );
      await expect(page.locator("#back-link"), name).toContainText("Volver");
      const runtimeOutput = page
        .locator("code")
        .filter({ hasText: spanishRuntimeOutput[name] })
        .first();
      await expect(
        runtimeOutput,
        `${name} Spanish runtime output`,
      ).toBeVisible();
      expect(
        interceptedSdkModules.has(name === "utxo-context" ? "core" : "rpc"),
        `${name} must use the deterministic SDK mock`,
      ).toBe(true);
    }

    await page.goto(
      `${standaloneBasePath}/get-server-info.es.html?${localizedReturnQuery}`,
      { waitUntil: "domcontentloaded" },
    );
    await page.locator("#back-link").click();
    await expect(page).toHaveURL(/\/es\/build#try-live$/u);
    await context.close();
  });

  test("has no desktop or mobile overflow and preserves key modal behavior", async ({
    browser,
  }) => {
    test.skip(!activeProject, "Spanish Preview matrix runs once");
    if (!server) throw new Error("Spanish Preview fixture was not started");

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 430, height: 932 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
      { width: 320, height: 640 },
    ]) {
      const context = await browser.newContext({
        baseURL: server.baseUrl,
        viewport,
        hasTouch: viewport.width < 768,
        isMobile: viewport.width < 768,
      });
      const page = await context.newPage();

      for (const route of spanishRoutes) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStableLayout(page);
        await assertNoHorizontalOverflow(
          page,
          viewport.width,
          `${route.path} initial`,
        );

        if (route.path === "/es" && viewport.width < 768) {
          await assertWordsStayOnSingleLine(
            page.locator("main h1").first(),
            `${viewport.width}px Spanish home hero`,
          );
          await assertEqualControlRow(
            page.locator("#verify .btn-primary, #verify .btn-ghost"),
            `${viewport.width}px Spanish proof actions`,
          );

          const languageTrigger = getVisibleLanguageSelector(page).getByRole(
            "button",
            { name: "Idioma", exact: true },
          );
          await languageTrigger.click();
          await expect(languageTrigger).toHaveAttribute(
            "aria-expanded",
            "true",
          );
          await assertNoHorizontalOverflow(
            page,
            viewport.width,
            `${route.path} language menu open`,
          );
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

          const sectionSheetId =
            route.path === "/es/build"
              ? "mobile-section-sheet"
              : route.path === "/es/hodl"
                ? "mobile-section-sheet-hodl"
                : null;
          if (sectionSheetId) {
            const sectionId = route.path === "/es/build" ? "#paths" : "#wallet";
            const targetScrollY = await page
              .locator(sectionId)
              .evaluate((section) => {
                const sectionTop =
                  window.scrollY + section.getBoundingClientRect().top;
                const maximumScroll =
                  document.documentElement.scrollHeight - window.innerHeight;
                const target = Math.min(
                  maximumScroll,
                  Math.max(sectionTop - 128, window.innerHeight),
                );
                window.scrollTo({ top: target, behavior: "smooth" });
                return target;
              });
            await expect
              .poll(async () =>
                Math.abs(
                  (await page.evaluate(() => window.scrollY)) - targetScrollY,
                ),
              )
              .toBeLessThanOrEqual(2);
            const sectionToggle = page.locator(
              `button[aria-controls="${sectionSheetId}"]`,
            );
            const mobileSectionBar = sectionToggle.locator(
              'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " fixed ")][1]',
            );
            await expect(mobileSectionBar).toHaveClass(
              /(?:^|\s)translate-y-0(?:\s|$)/u,
            );
            await sectionToggle.click();
            const sectionSheet = page.locator(`#${sectionSheetId}`);
            await expect(sectionSheet).toBeVisible();
            await assertNoHorizontalOverflow(
              page,
              viewport.width,
              `${route.path} section sheet open`,
            );
            await sectionSheet.locator("button").first().click();
          }
        }

        if (route.path === "/es") {
          const proofTrigger = page.locator("button.btn-primary");
          await proofTrigger.click();
          const proofDialog = page.getByRole("dialog");
          await expect(proofDialog).toBeVisible();
          await expect(proofDialog).toContainText("Verificar");
          await expect(proofDialog.getByRole("button").first()).toBeFocused();
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
});
