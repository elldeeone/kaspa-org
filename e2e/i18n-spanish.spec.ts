import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

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
import {
  isGoldenEnglishPublicPath,
  localizePublicPath,
  localizePublicRouteGolden,
  publicRouteGolden,
  readPrerenderRoutePathnames,
  useBuiltLocaleScenario,
} from "./i18n-scenario-harness";

const productionEnvironment = {
  NEXT_PUBLIC_KASPA_AI_ENABLED: "true",
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "production",
  VERCEL_ENV: "production",
} as const;

const spanishRoutes = localizePublicRouteGolden("es");

type SpanishRouteId = (typeof spanishRoutes)[number]["id"];
type MessageCatalog = Record<string, unknown>;

const spanishRoutePathnames = new Set<string>(
  spanishRoutes.map((route) => route.path),
);
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

function assertPublicSpanishHtml(html: string, pathname: string) {
  const englishPathname = pathname.slice("/es".length) || "/";
  const englishUrl =
    englishPathname === "/"
      ? "https://kaspa.org"
      : `https://kaspa.org${englishPathname}`;
  const spanishUrl = `https://kaspa.org${pathname}`;
  const xDefault = englishPathname === "/" ? "https://kaspa.org" : englishUrl;

  expect(html, pathname).toContain('<html lang="es" dir="ltr"');
  expect(html, pathname).not.toContain(
    '<meta name="robots" content="noindex, nofollow"/>',
  );
  expect(html, pathname).toContain(
    `<link rel="canonical" href="${spanishUrl}"/>`,
  );
  for (const [hrefLang, href] of [
    ["en", englishUrl],
    ["es", spanishUrl],
    ["x-default", xDefault],
  ] as const) {
    expect(html, `${pathname} ${hrefLang}`).toMatch(
      new RegExp(
        `<link rel="alternate" hrefLang="${hrefLang}" href="${href.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"\\s*/>`,
        "u",
      ),
    );
  }
  expect(html, pathname).toContain('property="og:');
  expect(html, pathname).toContain('name="twitter:');
  expect(html, pathname).toContain("https://kaspa.org/es/opengraph-image");
}

test.describe("complete public Spanish production contract", () => {
  const scenario = useBuiltLocaleScenario({
    enabled: process.env.PLAYWRIGHT_E2E_SPANISH_ONLY === "1",
    enabledHint: "run with npm run test:e2e:i18n:spanish",
    environment: productionEnvironment,
    name: "Spanish production build matrix",
  });

  test("renders the complete static, public route and error contract", async () => {
    const { fixtureRoot, readLogs, request: api } = scenario.require();
    const prerenderRoutes = await readPrerenderRoutePathnames(fixtureRoot);

    for (const route of spanishRoutes) {
      const response = await api.get(route.path);
      expect(response.status(), route.path).toBe(200);
      expect(response.headers()["x-nextjs-cache"], route.path).toBe("HIT");
      expect(response.headers()["x-nextjs-prerender"], route.path).toContain(
        "1",
      );
      const html = await response.text();
      assertPublicSpanishHtml(html, route.path);
      expect(response.headers()["link"], route.path).toBeUndefined();
      expect(html, route.path).not.toContain(route.englishFingerprint);
      expect(html, `${route.path} must not expose Spanish AI`).not.toContain(
        "Pregunta lo que quieras",
      );
      expect(prerenderRoutes.has(route.internalPath), route.internalPath).toBe(
        true,
      );
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
    const sitemapText = await sitemap.text();
    expect(
      [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]),
    ).toEqual(
      publicRouteGolden.flatMap(({ path }) => [
        `https://kaspa.org${path === "/" ? "" : path}`,
        `https://kaspa.org${localizePublicPath("es", path)}`,
      ]),
    );
    expect(sitemapText).not.toContain("hreflang");

    const languageInvariant = await api.get("/", {
      headers: { "accept-language": "es-ES,es;q=0.9" },
    });
    expect(languageInvariant.status()).toBe(200);
    expect(await languageInvariant.text()).toContain(
      '<html lang="en" dir="ltr"',
    );

    expect((await api.get("/api/ask")).status()).toBe(405);
    const proofCatalog = await api.get("/api/i18n/home-proof/es");
    expect(proofCatalog.status()).toBe(200);
    const proofText = await proofCatalog.text();
    expect(proofText).toContain('"trigger":"Verificar la prueba"');
    expect(proofText).not.toContain('"trigger":"Verify the proof"');

    expect(readLogs()).not.toMatch(
      /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
    );
  });

  test("renders exact Spanish structured data and a safe Open Graph image", async ({
    browser,
  }) => {
    const { baseUrl, fixtureRoot } = scenario.require();

    const sharedCatalog = await loadCatalog(fixtureRoot, "es", "shared");
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

    const context = await browser.newContext({ baseURL: baseUrl });
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
    const { baseUrl, fixtureRoot } = scenario.require();

    const context = await browser.newContext({ baseURL: baseUrl });
    const page = await context.newPage();
    const observedSpanishRoutes = new Set<string>();

    for (const route of spanishRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      await auditRenderedSpanishText(page, fixtureRoot, route.id);
      const routeCatalog = await loadCatalog(fixtureRoot, "es", route.id);
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
        if (url.origin !== new URL(baseUrl).origin) continue;
        expect(
          isGoldenEnglishPublicPath(url.pathname),
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
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const unavailablePseudoSelector = getVisibleLanguageSelector(page);
    const { menu: unavailablePseudoMenu } = await openLanguageMenu(
      page,
      "Language",
    );
    await expect(unavailablePseudoSelector).toBeVisible();
    await expect(unavailablePseudoMenu).not.toContainText("Pseudo");
    await page.keyboard.press("Escape");

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
    const { baseUrl } = scenario.require();

    const context = await browser.newContext({
      baseURL: baseUrl,
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
    const { baseUrl, request: api } = scenario.require();

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

    const context = await browser.newContext({ baseURL: baseUrl });
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
    const { baseUrl } = scenario.require();

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 430, height: 932 },
      { width: 390, height: 844 },
      { width: 375, height: 812 },
      { width: 320, height: 640 },
    ]) {
      const context = await browser.newContext({
        baseURL: baseUrl,
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
