import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { isUnchangedMessageAllowed } from "../scripts/i18n/translation-contract.mts";
import {
  defaultLocale,
  localeRegistry,
  pseudoLocale,
  supportedLocaleCodes,
  type Locale,
  type TextDirection,
} from "../src/i18n/locale-registry";
import {
  assertEqualControlRow,
  assertHeadingUsesResponsiveWrapping,
  assertLocatorsDoNotOverlap,
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
  type PublicRouteId,
  useBuiltLocaleScenario,
} from "./i18n-scenario-harness";

const productionEnvironment = {
  NEXT_PUBLIC_KASPA_AI_ENABLED: "true",
  NEXT_PUBLIC_KASPA_I18N_BUILD_TARGET: "production",
  VERCEL_ENV: "production",
} as const;

type MessageCatalog = Record<string, unknown>;
type TranslatedProductionLocale = Exclude<
  Locale,
  typeof defaultLocale | typeof pseudoLocale
>;
type AiSurfaceId = PublicRouteId | "not-found";
type StandaloneRuntimeOutput = Readonly<
  Record<(typeof standaloneExampleNames)[number], string>
>;

type ReviewedLocaleCopy = {
  languageLabel: string;
  aiLauncherAskAnything: string;
  aiLauncherPlaceholder: string;
  notFoundTitle: string;
  proofTrigger: string;
  homeVerifyHeading: string;
  homeDagAnnotation: string;
  standaloneBackLabel: string;
  standaloneNetworkLabel: string;
  standaloneConnectingLabel: string;
  standaloneRuntimeOutput: StandaloneRuntimeOutput;
};

type ProductionLocaleDescriptor = {
  locale: TranslatedProductionLocale;
  hrefLang: string;
  dir: TextDirection;
  endonym: string;
  acceptLanguage: string;
  aiAvailability: Readonly<Record<AiSurfaceId, boolean>>;
  reviewedCopy: ReviewedLocaleCopy;
  preserveWhitespaceDelimitedWords: boolean;
  forbiddenTranslatedSlugPaths: readonly string[];
  dagAnnotationFont?: Readonly<{
    family: string;
    minimumInkHeight: number;
  }>;
  openGraphInkBandCount?: number;
};

const reviewedDefaultLocaleCopy = {
  languageLabel: "Language",
  aiLauncherAskAnything: "Ask anything",
  aiLauncherPlaceholder: "Ask anything...",
  notFoundTitle: "Page Not Found | Kaspa",
  proofTrigger: "Verify the proof",
  standaloneConnectingNetwork: "Connecting to Kaspa network...",
} as const;

const defaultLocaleAiAvailability = {
  home: true,
  lore: true,
  build: true,
  assets: false,
  hodl: true,
  "not-found": true,
} as const satisfies Readonly<Record<AiSurfaceId, boolean>>;

// This is intentionally a compact, test-owned locale oracle. Adding a public
// language extends this table; it must not require another copied E2E suite.
const productionLocaleDescriptors = [
  {
    locale: "es",
    hrefLang: "es",
    dir: "ltr",
    endonym: "Español",
    acceptLanguage: "es-ES,es;q=0.9",
    aiAvailability: {
      home: false,
      lore: false,
      build: false,
      assets: false,
      hodl: false,
      "not-found": false,
    },
    reviewedCopy: {
      languageLabel: "Idioma",
      aiLauncherAskAnything: "Pregunta lo que quieras",
      aiLauncherPlaceholder: "Pregunta lo que quieras...",
      notFoundTitle: "Página no encontrada | Kaspa",
      proofTrigger: "Verificar la prueba",
      homeVerifyHeading: "no confíes, verifica.",
      homeDagAnnotation: "pow en tiempo real",
      standaloneBackLabel: "Volver",
      standaloneNetworkLabel: "Red",
      standaloneConnectingLabel: "| Conectando...",
      standaloneRuntimeOutput: {
        "get-server-info": "Respuesta de GetServerInfo:",
        "get-block-dag-info": "Respuesta de GetBlockDagInfo:",
        "subscribe-block-added":
          "Suscribiéndose al evento de bloque añadido...",
        "subscribe-daa-changed": "Registrando notificaciones de DAA...",
        "utxo-context": "Esta demostración está pensada para pruebas manuales",
      },
    },
    preserveWhitespaceDelimitedWords: true,
    forbiddenTranslatedSlugPaths: [
      "/es/historia",
      "/es/construir",
      "/es/recursos",
    ],
  },
  {
    locale: "de",
    hrefLang: "de",
    dir: "ltr",
    endonym: "Deutsch",
    acceptLanguage: "de-DE,de;q=0.9",
    aiAvailability: {
      home: false,
      lore: false,
      build: false,
      assets: false,
      hodl: false,
      "not-found": false,
    },
    reviewedCopy: {
      languageLabel: "Sprache",
      aiLauncherAskAnything: "Frag einfach",
      aiLauncherPlaceholder: "Frag einfach ...",
      notFoundTitle: "Seite nicht gefunden | Kaspa",
      proofTrigger: "Nachweis verifizieren",
      homeVerifyHeading: "vertrau nicht, verifiziere.",
      homeDagAnnotation: "pow in echtzeit",
      standaloneBackLabel: "Zurück",
      standaloneNetworkLabel: "Netzwerk",
      standaloneConnectingLabel: "| Verbindung wird hergestellt ...",
      standaloneRuntimeOutput: {
        "get-server-info": "GetServerInfo-Antwort:",
        "get-block-dag-info": "GetBlockDagInfo-Antwort:",
        "subscribe-block-added": "Block-Added-Ereignis wird abonniert ...",
        "subscribe-daa-changed":
          "DAA-Benachrichtigungen werden registriert ...",
        "utxo-context": "Diese Demo ist für manuelle Tests",
      },
    },
    preserveWhitespaceDelimitedWords: true,
    forbiddenTranslatedSlugPaths: [
      "/de/geschichte",
      "/de/entwickeln",
      "/de/ressourcen",
    ],
  },
  {
    locale: "fr",
    hrefLang: "fr",
    dir: "ltr",
    endonym: "Français",
    acceptLanguage: "fr-FR,fr;q=0.9",
    aiAvailability: {
      home: false,
      lore: false,
      build: false,
      assets: false,
      hodl: false,
      "not-found": false,
    },
    reviewedCopy: {
      languageLabel: "Langue",
      aiLauncherAskAnything: "Posez votre question",
      aiLauncherPlaceholder: "Posez votre question…",
      notFoundTitle: "Page introuvable | Kaspa",
      proofTrigger: "Vérifier la preuve",
      homeVerifyHeading: "ne faites pas confiance, vérifiez.",
      homeDagAnnotation: "pow en temps réel",
      standaloneBackLabel: "Retour",
      standaloneNetworkLabel: "Réseau",
      standaloneConnectingLabel: "| Connexion…",
      standaloneRuntimeOutput: {
        "get-server-info": "Réponse GetServerInfo :",
        "get-block-dag-info": "Réponse GetBlockDagInfo :",
        "subscribe-block-added": "Abonnement aux nouveaux blocs…",
        "subscribe-daa-changed": "Inscription aux notifications DAA…",
        "utxo-context": "Cette démonstration est destinée aux essais manuels",
      },
    },
    preserveWhitespaceDelimitedWords: true,
    forbiddenTranslatedSlugPaths: [
      "/fr/histoire",
      "/fr/construire",
      "/fr/ressources",
    ],
  },
  {
    locale: "zh-CN",
    hrefLang: "zh-CN",
    dir: "ltr",
    endonym: "简体中文",
    acceptLanguage: "zh-CN,zh;q=0.9",
    aiAvailability: {
      home: false,
      lore: false,
      build: false,
      assets: false,
      hodl: false,
      "not-found": false,
    },
    reviewedCopy: {
      languageLabel: "语言",
      aiLauncherAskAnything: "有问必答",
      aiLauncherPlaceholder: "请输入问题…",
      notFoundTitle: "页面未找到 | Kaspa",
      proofTrigger: "验证证明",
      homeVerifyHeading: "别信，去验证。",
      homeDagAnnotation: "实时 pow",
      standaloneBackLabel: "返回",
      standaloneNetworkLabel: "网络",
      standaloneConnectingLabel: "| 正在连接…",
      standaloneRuntimeOutput: {
        "get-server-info": "GetServerInfo 响应：",
        "get-block-dag-info": "GetBlockDagInfo 响应：",
        "subscribe-block-added": "正在订阅新增区块事件…",
        "subscribe-daa-changed": "正在注册 DAA 通知…",
        "utxo-context": "此演示用于手动测试",
      },
    },
    preserveWhitespaceDelimitedWords: false,
    forbiddenTranslatedSlugPaths: ["/zh-CN/故事", "/zh-CN/构建", "/zh-CN/素材"],
    dagAnnotationFont: {
      family: "maShanZheng",
      minimumInkHeight: 19,
    },
    openGraphInkBandCount: 2,
  },
] as const satisfies readonly ProductionLocaleDescriptor[];

type ProductionLocaleCase = ProductionLocaleDescriptor & {
  routes: ReturnType<typeof localizePublicRouteGolden>;
  routePathnames: ReadonlySet<string>;
  homePath: string;
  buildPath: string;
  hodlPath: string;
  lorePath: string;
  assetsPath: string;
  localizedReturnPath: string;
  localizedReturnQuery: string;
};

const productionLocaleCases: readonly ProductionLocaleCase[] =
  productionLocaleDescriptors.map((descriptor) => {
    const routes = localizePublicRouteGolden(descriptor.locale);
    const localizedReturnPath = `${localizePublicPath(descriptor.locale, "/build")}#try-live`;
    return {
      ...descriptor,
      routes,
      routePathnames: new Set(routes.map((route) => route.path)),
      homePath: localizePublicPath(descriptor.locale, "/"),
      buildPath: localizePublicPath(descriptor.locale, "/build"),
      hodlPath: localizePublicPath(descriptor.locale, "/hodl"),
      lorePath: localizePublicPath(descriptor.locale, "/lore"),
      assetsPath: localizePublicPath(descriptor.locale, "/assets"),
      localizedReturnPath,
      localizedReturnQuery: new URLSearchParams({
        returnTo: localizedReturnPath,
      }).toString(),
    };
  });

const productionHeroCases = [
  {
    locale: defaultLocale,
    path: "/",
    preserveWhitespaceDelimitedWords: true,
  },
  ...productionLocaleCases.map(
    ({ locale, homePath: path, preserveWhitespaceDelimitedWords }) => ({
      locale,
      path,
      preserveWhitespaceDelimitedWords,
    }),
  ),
] as const;

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
  await expect(
    menu.getByRole("menuitemradio", { checked: true }),
  ).toBeFocused();
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
  locale: Locale,
  namespace: "shared" | "errors" | PublicRouteId,
) {
  return JSON.parse(
    await readFile(
      join(fixtureRoot, "messages", locale, `${namespace}.json`),
      "utf8",
    ),
  ) as MessageCatalog;
}

function readCatalogMessage(catalog: MessageCatalog, path: string): string {
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

function substituteCatalogMessage(
  message: string,
  values: Readonly<Record<string, string>>,
) {
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu, (token, key) =>
    Object.hasOwn(values, key) ? values[key] : token,
  );
}

function encodePathSegment(value: string) {
  return [...value]
    .map((character) =>
      [...new TextEncoder().encode(character)]
        .map((byte) => `%${byte.toString(16).padStart(2, "0")}`)
        .join(""),
    )
    .join("");
}

function isPathForLocale(pathname: string, locale: Locale) {
  const prefix = `/${locale}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getStandaloneRuntimeOutput(catalog: MessageCatalog) {
  const message = (
    path: string,
    values: Readonly<Record<string, string>> = {},
  ) => substituteCatalogMessage(readCatalogMessage(catalog, path), values);

  return {
    "get-server-info": message("artifacts.runtime.apiResponse", {
      api: "GetServerInfo",
    }),
    "get-block-dag-info": message("artifacts.runtime.apiResponse", {
      api: "GetBlockDagInfo",
    }),
    "subscribe-block-added": message("artifacts.runtime.subscribingBlockAdded"),
    "subscribe-daa-changed": message(
      "artifacts.runtime.registeringProtocolNotifications",
      { protocol: "DAA" },
    ),
    "utxo-context": message("artifacts.utxo.noticeManualTesting", {
      api: "UtxoProcessor",
      term: "UTXOs",
    }),
  } satisfies Readonly<Record<(typeof standaloneExampleNames)[number], string>>;
}

async function auditRenderedLocaleText(
  page: Page,
  fixtureRoot: string,
  routeId: PublicRouteId,
  descriptor: ProductionLocaleDescriptor,
) {
  const bodyText = normalizeVisibleText(await page.locator("body").innerText());

  for (const namespace of ["shared", routeId] as const) {
    const [english, localized] = await Promise.all([
      loadCatalog(fixtureRoot, defaultLocale, namespace),
      loadCatalog(fixtureRoot, descriptor.locale, namespace),
    ]);
    const englishMessages = flattenCatalog(english);
    const localizedMessages = flattenCatalog(localized);

    for (const [key, englishMessage] of englishMessages) {
      if (!isStaticVisibleMessage(englishMessage)) continue;
      const localizedMessage = localizedMessages.get(key);
      const catalogKey = `${namespace}.${key}`;
      const visibleEnglish = normalizeVisibleText(englishMessage);

      if (englishMessage === localizedMessage) {
        if (!containsWholeVisibleMessage(bodyText, visibleEnglish)) continue;
        expect(
          isUnchangedMessageAllowed(descriptor.locale, englishMessage),
          `${descriptor.locale}:${routeId} renders unapproved unchanged English at ${catalogKey}: ${visibleEnglish}`,
        ).toBe(true);
        continue;
      }

      expect(
        containsWholeVisibleMessage(bodyText, visibleEnglish),
        `${descriptor.locale}:${routeId} leaked English ${catalogKey}: ${visibleEnglish}`,
      ).toBe(false);
    }
  }
}

function assertPublicLocaleHtml(
  html: string,
  pathname: string,
  descriptor: ProductionLocaleDescriptor,
) {
  const localePrefix = `/${descriptor.locale}`;
  const englishPathname = pathname.slice(localePrefix.length) || "/";
  const englishUrl =
    englishPathname === "/"
      ? "https://kaspa.org"
      : `https://kaspa.org${englishPathname}`;
  const localizedUrl = `https://kaspa.org${pathname}`;
  const xDefault = englishPathname === "/" ? "https://kaspa.org" : englishUrl;

  expect(html, pathname).toContain(
    `<html lang="${descriptor.locale}" dir="${descriptor.dir}"`,
  );
  expect(html, pathname).not.toContain(
    '<meta name="robots" content="noindex, nofollow"/>',
  );
  expect(html, pathname).toContain(
    `<link rel="canonical" href="${localizedUrl}"/>`,
  );
  const alternates: ReadonlyArray<readonly [string, string]> = [
    ["en", englishUrl],
    ...productionLocaleCases.map(
      (localeCase) =>
        [
          localeCase.hrefLang,
          `https://kaspa.org${localizePublicPath(localeCase.locale, englishPathname)}`,
        ] as const,
    ),
    ["x-default", xDefault],
  ];
  for (const [hrefLang, href] of alternates) {
    expect(html, `${pathname} ${hrefLang}`).toMatch(
      new RegExp(
        `<link rel="alternate" hrefLang="${escapeRegExp(hrefLang)}" href="${escapeRegExp(href)}"\\s*/>`,
        "u",
      ),
    );
  }
  expect(html, pathname).toContain('property="og:');
  expect(html, pathname).toContain('name="twitter:');
  expect(html, pathname).toContain(
    `https://kaspa.org/${descriptor.locale}/opengraph-image`,
  );
}

test.describe("complete public production locale contract", () => {
  const scenario = useBuiltLocaleScenario({
    enabled: process.env.PLAYWRIGHT_E2E_PRODUCTION_LOCALES_ONLY === "1",
    enabledHint: "run with npm run test:e2e:i18n:production-locales",
    environment: productionEnvironment,
    name: "production locale build matrix",
  });

  test("has one test descriptor for every translated production locale", () => {
    const registeredProductionLocales = supportedLocaleCodes.filter(
      (locale) => localeRegistry[locale].lifecycle === "production",
    );
    expect(registeredProductionLocales).toEqual([
      defaultLocale,
      ...productionLocaleCases.map(({ locale }) => locale),
    ]);
    for (const descriptor of productionLocaleCases) {
      expect(localeRegistry[descriptor.locale]).toMatchObject({
        label: descriptor.endonym,
        hrefLang: descriptor.hrefLang,
        dir: descriptor.dir,
        lifecycle: "production",
      });
    }
  });

  test("publishes the exact production locale sitemap matrix", async () => {
    const { request: api } = scenario.require();
    const sitemap = await api.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    expect(
      [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]),
    ).toEqual(
      publicRouteGolden.flatMap(({ path }) => [
        `https://kaspa.org${path === "/" ? "" : path}`,
        ...productionLocaleCases.map(
          ({ locale }) =>
            `https://kaspa.org${localizePublicPath(locale, path)}`,
        ),
      ]),
    );
    expect(sitemapText).not.toContain("hreflang");
  });

  test("keeps every production-locale hero readable at responsive boundaries", async ({
    browser,
  }) => {
    const { baseUrl } = scenario.require();

    for (const width of [768, 1280, 1440]) {
      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();

      for (const localeCase of productionHeroCases) {
        await page.goto(localeCase.path, { waitUntil: "domcontentloaded" });
        await waitForStableLayout(page);

        const heading = page.locator("main h1").first();
        await assertHeadingUsesResponsiveWrapping(
          heading,
          `${width}px ${localeCase.locale} home hero`,
        );
        if (localeCase.preserveWhitespaceDelimitedWords) {
          await assertWordsStayOnSingleLine(
            heading,
            `${width}px ${localeCase.locale} home hero`,
          );
        }
      }

      await context.close();
    }
  });

  test("keeps the DAG annotation arrow anchored across scripts", async ({
    page,
  }) => {
    const { baseUrl } = scenario.require();
    await page.setViewportSize({ width: 1440, height: 900 });

    const measureArrowCenter = async (pathname: string, text: string) => {
      await page.goto(`${baseUrl}${pathname}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForStableLayout(page);
      return page.getByText(text, { exact: true }).evaluate((element) => {
        const arrow = element.parentElement?.querySelector("svg");
        if (!arrow) throw new Error("DAG annotation arrow is missing");
        const bounds = arrow.getBoundingClientRect();
        return (bounds.left + bounds.right) / 2;
      });
    };

    const englishArrowCenter = await measureArrowCenter(
      "/",
      "pow in real-time",
    );
    const chineseArrowCenter = await measureArrowCenter("/zh-CN", "实时 pow");

    expect(
      Math.abs(chineseArrowCenter - englishArrowCenter),
    ).toBeLessThanOrEqual(12);
  });

  test("honours route-specific AI availability in the default locale", async ({
    browser,
  }) => {
    const { baseUrl } = scenario.require();
    const context = await browser.newContext({ baseURL: baseUrl });
    const page = await context.newPage();
    const surfaces = [
      ...publicRouteGolden.map(({ id, path }) => ({ id, path })),
      { id: "not-found", path: "/missing" },
    ] as const satisfies readonly { id: AiSurfaceId; path: string }[];

    for (const surface of surfaces) {
      await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      const launcher = page.getByRole("button", {
        name: reviewedDefaultLocaleCopy.aiLauncherAskAnything,
        exact: true,
      });
      if (defaultLocaleAiAvailability[surface.id]) {
        await expect(launcher, `${surface.path} AI launcher`).toHaveCount(1);
      } else {
        await expect(launcher, `${surface.path} AI launcher`).toHaveCount(0);
      }
    }

    await context.close();
  });

  for (const localeCase of productionLocaleCases) {
    test(`${localeCase.locale} renders the complete static, public route and error contract`, async () => {
      const { fixtureRoot, readLogs, request: api } = scenario.require();
      const [sharedCatalog, errorCatalog, homeCatalog, buildCatalog] =
        await Promise.all([
          loadCatalog(fixtureRoot, localeCase.locale, "shared"),
          loadCatalog(fixtureRoot, localeCase.locale, "errors"),
          loadCatalog(fixtureRoot, localeCase.locale, "home"),
          loadCatalog(fixtureRoot, localeCase.locale, "build"),
        ]);
      expect(
        readCatalogMessage(sharedCatalog, "navigation.language.label"),
      ).toBe(localeCase.reviewedCopy.languageLabel);
      expect(readCatalogMessage(sharedCatalog, "ai.launcher.askAnything")).toBe(
        localeCase.reviewedCopy.aiLauncherAskAnything,
      );
      expect(readCatalogMessage(sharedCatalog, "ai.launcher.placeholder")).toBe(
        localeCase.reviewedCopy.aiLauncherPlaceholder,
      );
      expect(readCatalogMessage(errorCatalog, "metadata.title")).toBe(
        localeCase.reviewedCopy.notFoundTitle,
      );
      expect(readCatalogMessage(homeCatalog, "proof.trigger")).toBe(
        localeCase.reviewedCopy.proofTrigger,
      );
      expect(readCatalogMessage(homeCatalog, "verify.heading")).toBe(
        localeCase.reviewedCopy.homeVerifyHeading,
      );
      expect(readCatalogMessage(homeCatalog, "hero.dagAnnotation")).toBe(
        localeCase.reviewedCopy.homeDagAnnotation,
      );
      expect(readCatalogMessage(buildCatalog, "artifacts.controls.back")).toBe(
        localeCase.reviewedCopy.standaloneBackLabel,
      );
      expect(
        readCatalogMessage(buildCatalog, "artifacts.controls.network"),
      ).toBe(localeCase.reviewedCopy.standaloneNetworkLabel);
      expect(
        readCatalogMessage(buildCatalog, "artifacts.controls.connecting"),
      ).toBe(localeCase.reviewedCopy.standaloneConnectingLabel);
      const catalogRuntimeOutput = getStandaloneRuntimeOutput(buildCatalog);
      for (const name of standaloneExampleNames) {
        expect(catalogRuntimeOutput[name], name).toContain(
          localeCase.reviewedCopy.standaloneRuntimeOutput[name],
        );
      }
      const prerenderRoutes = await readPrerenderRoutePathnames(fixtureRoot);

      for (const route of localeCase.routes) {
        const response = await api.get(route.path);
        expect(response.status(), route.path).toBe(200);
        expect(response.headers()["x-nextjs-cache"], route.path).toBe("HIT");
        expect(response.headers()["x-nextjs-prerender"], route.path).toContain(
          "1",
        );
        const html = await response.text();
        assertPublicLocaleHtml(html, route.path, localeCase);
        expect(response.headers()["link"], route.path).toBeUndefined();
        expect(html, route.path).not.toContain(route.englishFingerprint);
        if (!localeCase.aiAvailability[route.id]) {
          expect(
            html,
            `${route.path} must not expose disabled localized AI`,
          ).not.toContain(localeCase.reviewedCopy.aiLauncherAskAnything);
        }
        expect(
          prerenderRoutes.has(route.internalPath),
          route.internalPath,
        ).toBe(true);
      }

      for (const translatedPath of localeCase.forbiddenTranslatedSlugPaths) {
        const response = await api.get(translatedPath, { maxRedirects: 0 });
        expect(response.status(), translatedPath).toBe(404);
        expect(response.headers().location, translatedPath).toBeUndefined();
      }

      for (const unknown of [
        {
          path: "/missing",
          locale: defaultLocale,
          dir: localeRegistry[defaultLocale].dir,
          title: reviewedDefaultLocaleCopy.notFoundTitle,
          aiAvailable: defaultLocaleAiAvailability["not-found"],
          aiText: reviewedDefaultLocaleCopy.aiLauncherAskAnything,
        },
        {
          path: `${localeCase.homePath}/missing`,
          locale: localeCase.locale,
          dir: localeCase.dir,
          title: localeCase.reviewedCopy.notFoundTitle,
          aiAvailable: localeCase.aiAvailability["not-found"],
          aiText: localeCase.reviewedCopy.aiLauncherAskAnything,
        },
        {
          path: "/zz/missing",
          locale: defaultLocale,
          dir: localeRegistry[defaultLocale].dir,
          title: reviewedDefaultLocaleCopy.notFoundTitle,
          aiAvailable: defaultLocaleAiAvailability["not-found"],
          aiText: reviewedDefaultLocaleCopy.aiLauncherAskAnything,
        },
      ] as const) {
        const response = await api.get(unknown.path, {
          headers: {
            "x-kaspa-i18n-route-miss": "1",
            "x-next-intl-locale":
              unknown.locale === localeCase.locale
                ? defaultLocale
                : localeCase.locale,
          },
        });
        expect(response.status(), unknown.path).toBe(404);
        const html = await response.text();
        expect(html, unknown.path).toContain(
          `<html lang="${unknown.locale}" dir="${unknown.dir}"`,
        );
        expect(html, unknown.path).toContain(
          'data-kaspa-global-not-found="true"',
        );
        expect(html, unknown.path).toContain(unknown.title);
        if (!unknown.aiAvailable) {
          expect(html, `${unknown.path} AI launcher`).not.toContain(
            unknown.aiText,
          );
        }
      }

      for (const pathname of [
        `${localeCase.homePath}/missing.txt`,
        `${localeCase.homePath}/missing%2Etxt`,
      ]) {
        const dotted = await api.get(pathname);
        expect(dotted.status(), pathname).toBe(404);
        expect(await dotted.text(), pathname).toContain(
          `<html lang="${defaultLocale}" dir="${localeRegistry[defaultLocale].dir}"`,
        );
      }

      const localizedOgPath = `/${localeCase.locale}/opengraph-image`;
      const localizedOg = await api.get(localizedOgPath);
      const repeatedLocalizedOg = await api.get(localizedOgPath);
      const englishOg = await api.get("/opengraph-image");
      expect(localizedOg.status()).toBe(200);
      expect(localizedOg.headers()["content-type"]).toContain("image/png");
      const localizedOgHash = createHash("sha256")
        .update(await localizedOg.body())
        .digest("hex");
      expect(
        createHash("sha256")
          .update(await repeatedLocalizedOg.body())
          .digest("hex"),
      ).toBe(localizedOgHash);
      expect(
        createHash("sha256")
          .update(await englishOg.body())
          .digest("hex"),
      ).not.toBe(localizedOgHash);

      const languageInvariant = await api.get("/", {
        headers: { "accept-language": localeCase.acceptLanguage },
      });
      expect(languageInvariant.status()).toBe(200);
      expect(await languageInvariant.text()).toContain(
        `<html lang="${defaultLocale}" dir="${localeRegistry[defaultLocale].dir}"`,
      );

      expect((await api.get("/api/ask")).status()).toBe(405);
      const proofCatalog = await api.get(
        `/api/i18n/home-proof/${localeCase.locale}`,
      );
      expect(proofCatalog.status()).toBe(200);
      const proofPayload = (await proofCatalog.json()) as MessageCatalog;
      expect(readCatalogMessage(proofPayload, "home.proof.trigger")).toBe(
        localeCase.reviewedCopy.proofTrigger,
      );
      expect(readCatalogMessage(proofPayload, "home.proof.trigger")).not.toBe(
        reviewedDefaultLocaleCopy.proofTrigger,
      );

      expect(readLogs()).not.toMatch(
        /NoFallbackError|ERR_INVALID_URL|Internal Server Error|TypeError: Invalid URL/u,
      );
    });

    test(`${localeCase.locale} renders exact localized structured data and a safe Open Graph image`, async ({
      browser,
    }) => {
      const { baseUrl, fixtureRoot } = scenario.require();

      const sharedCatalog = await loadCatalog(
        fixtureRoot,
        localeCase.locale,
        "shared",
      );
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
      for (const route of localeCase.routes) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        const scripts = page.locator('script[type="application/ld+json"]');
        await expect(scripts, route.path).toHaveCount(1);
        const rendered = await scripts.textContent();
        expect(rendered, route.path).not.toBeNull();
        expect(JSON.parse(rendered ?? "null"), route.path).toEqual(
          expectedStructuredData,
        );
      }

      const metrics = await measureOpenGraphImage(
        page,
        `/${localeCase.locale}/opengraph-image`,
      );
      expect(metrics).toMatchObject({ width: 1200, height: 630 });
      expect(metrics.inkPixels).toBeGreaterThan(1_000);
      expect(metrics.inkBandCount).toBe(localeCase.openGraphInkBandCount ?? 3);
      expect(metrics.minX).toBeGreaterThanOrEqual(48);
      expect(metrics.maxX).toBeLessThanOrEqual(1152);
      expect(metrics.minY).toBeGreaterThanOrEqual(48);
      expect(metrics.maxY).toBeLessThanOrEqual(582);
      await context.close();
    });

    test(`${localeCase.locale} keeps navigation, CTAs, selector state, and key interactions localized`, async ({
      browser,
    }) => {
      const { baseUrl, fixtureRoot } = scenario.require();
      const languageLabel = localeCase.reviewedCopy.languageLabel;
      const aiLauncherName = localeCase.reviewedCopy.aiLauncherAskAnything;

      const context = await browser.newContext({ baseURL: baseUrl });
      const page = await context.newPage();
      const observedLocalizedRoutes = new Set<string>();

      for (const route of localeCase.routes) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStableLayout(page);
        await auditRenderedLocaleText(page, fixtureRoot, route.id, localeCase);
        const routeCatalog = await loadCatalog(
          fixtureRoot,
          localeCase.locale,
          route.id,
        );
        const metadata = routeCatalog.metadata as Record<string, unknown>;
        expect(await page.title(), `${route.path} title`).toBe(metadata.title);
        await expect(
          page.locator('meta[name="description"]'),
          `${route.path} description`,
        ).toHaveAttribute("content", metadata.description as string);
        const aiLauncher = page.getByRole("button", {
          name: aiLauncherName,
          exact: true,
        });
        if (localeCase.aiAvailability[route.id]) {
          await expect(
            aiLauncher,
            `${route.path} must expose the enabled localized AI launcher`,
          ).toHaveCount(1);
        } else {
          await expect(
            aiLauncher,
            `${route.path} must not expose the disabled localized AI launcher`,
          ).toHaveCount(0);
        }

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
            localeCase.forbiddenTranslatedSlugPaths.includes(url.pathname),
            `${route.path} linked a translated slug: ${url.pathname}`,
          ).toBe(false);
          for (const otherLocaleCase of productionLocaleCases) {
            if (otherLocaleCase.locale === localeCase.locale) continue;
            expect(
              isPathForLocale(url.pathname, otherLocaleCase.locale),
              `${route.path} leaked a ${otherLocaleCase.locale} route link: ${url.pathname}`,
            ).toBe(false);
          }
          if (localeCase.routePathnames.has(url.pathname)) {
            observedLocalizedRoutes.add(url.pathname);
          }
        }
      }

      await page.goto(localeCase.homePath);
      for (const href of [
        localeCase.lorePath,
        `${localeCase.hodlPath}#wallet`,
        `${localeCase.hodlPath}#buy`,
      ]) {
        expect(
          await page.locator(`a[href="${href}"]`).count(),
          `${localeCase.locale} Home CTA ${href}`,
        ).toBeGreaterThan(0);
      }
      for (const href of [
        localeCase.lorePath,
        localeCase.hodlPath,
        localeCase.buildPath,
        "https://research.kas.pa/",
        "https://kgi.kaspad.net/",
      ]) {
        expect(
          await page.locator(`nav a[href="${href}"]`).count(),
          `${localeCase.locale} navigation ${href}`,
        ).toBeGreaterThan(0);
      }

      const logo = page.locator(`nav a[href="${localeCase.homePath}"]`).first();
      await logo.click({ button: "right" });
      const assetsMenuLink = page.locator(
        `[role="menu"] a[href="${localeCase.assetsPath}"]`,
      );
      await expect(assetsMenuLink).toBeVisible();
      observedLocalizedRoutes.add(localeCase.assetsPath);
      await page.keyboard.press("Escape");

      for (const route of localeCase.routes) {
        expect(observedLocalizedRoutes.has(route.path), route.path).toBe(true);
      }

      const desktopSource = `${localeCase.locale}-gate`;
      await page.goto(
        `${localeCase.lorePath}?source=${desktopSource}&step=4#roadmap`,
      );
      const localizedSelector = getVisibleLanguageSelector(page);
      const localizedTrigger = localizedSelector.getByRole("button", {
        name: languageLabel,
        exact: true,
      });
      await localizedTrigger.focus();
      await expect(localizedTrigger).toBeFocused();
      await localizedTrigger.press("ArrowDown");
      const localizedMenu = localizedSelector.getByRole("menu", {
        name: languageLabel,
      });
      await expect(localizedMenu).toBeVisible();
      await expect(localizedMenu).not.toContainText("EN-XA");
      for (const productionLocaleCase of productionLocaleCases) {
        await expect(
          localizedMenu.getByRole("menuitemradio", {
            name: productionLocaleCase.endonym,
          }),
        ).toHaveCount(1);
      }
      const currentLocale = localizedMenu.getByRole("menuitemradio", {
        name: localeCase.endonym,
      });
      await expect(currentLocale).toHaveAttribute("aria-checked", "true");
      await expect(currentLocale).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(localizedMenu).toHaveCount(0);
      await expect(localizedTrigger).toBeFocused();

      await localizedTrigger.press("Enter");
      const switchToEnglish = localizedSelector.getByRole("menuitemradio", {
        name: "English",
      });
      await expect(currentLocale).toBeFocused();
      await page.keyboard.press("Home");
      await expect(switchToEnglish).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        `${baseUrl}/lore?source=${desktopSource}&step=4#roadmap`,
      );
      await expect(page.locator("html")).toHaveAttribute("lang", defaultLocale);
      const englishSelector = getVisibleLanguageSelector(page);
      const englishTrigger = englishSelector.getByRole("button", {
        name: "Language",
        exact: true,
      });
      await englishTrigger.press("Enter");
      const englishMenu = englishSelector.getByRole("menu", {
        name: "Language",
      });
      await expect(englishMenu).toBeVisible();
      const currentEnglish = englishMenu.getByRole("menuitemradio", {
        name: "English",
      });
      await expect(currentEnglish).toHaveAttribute("aria-checked", "true");
      await expect(currentEnglish).toBeFocused();
      const switchToLocalized = englishMenu.getByRole("menuitemradio", {
        name: localeCase.endonym,
      });
      await switchToLocalized.focus();
      await expect(switchToLocalized).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(
          `${escapeRegExp(localeCase.lorePath)}\\?source=${escapeRegExp(desktopSource)}&step=4#roadmap$`,
          "u",
        ),
      );

      for (const targetLocaleCase of productionLocaleCases) {
        if (targetLocaleCase.locale === localeCase.locale) continue;
        const directSource = `${localeCase.locale}-to-${targetLocaleCase.locale}`;
        await page.goto(
          `${localeCase.lorePath}?source=${directSource}&step=4#roadmap`,
        );
        const { menu: directLocaleMenu } = await openLanguageMenu(
          page,
          localeCase.reviewedCopy.languageLabel,
        );
        const directTarget = directLocaleMenu.getByRole("menuitemradio", {
          name: targetLocaleCase.endonym,
        });
        await directTarget.focus();
        await expect(directTarget).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(
          new RegExp(
            `${escapeRegExp(targetLocaleCase.lorePath)}\\?source=${escapeRegExp(directSource)}&step=4#roadmap$`,
            "u",
          ),
        );
      }

      await page.goto(
        `/${encodePathSegment(localeCase.locale)}/lore?source=encoded-locale#roadmap`,
      );
      const { menu: encodedMenu } = await openLanguageMenu(page, languageLabel);
      await encodedMenu.getByRole("menuitemradio", { name: "English" }).click();
      await expect(page).toHaveURL(/\/lore\?source=encoded-locale#roadmap$/u);

      await page.goto(`${localeCase.homePath}/%256core`);
      const { menu: unknownPathMenu } = await openLanguageMenu(
        page,
        languageLabel,
      );
      await unknownPathMenu
        .getByRole("menuitemradio", { name: "English" })
        .click();
      await expect(page).toHaveURL(/\/%256core$/u);
      await expect(page.locator("html")).toHaveAttribute("lang", defaultLocale);
      await expect(
        page.locator('[data-kaspa-global-not-found="true"]'),
      ).toBeVisible();

      await page.goto("/en-XA/lore");
      await expect(page.locator("html")).toHaveAttribute("lang", defaultLocale);
      const unavailablePseudoSelector = getVisibleLanguageSelector(page);
      const { menu: unavailablePseudoMenu } = await openLanguageMenu(
        page,
        "Language",
      );
      await expect(unavailablePseudoSelector).toBeVisible();
      await expect(unavailablePseudoMenu).not.toContainText("Pseudo");
      await page.keyboard.press("Escape");

      await page.goto(`${localeCase.homePath}/missing`);
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        localeCase.locale,
      );
      await expect(
        getVisibleLanguageSelector(page).getByRole("button", {
          name: languageLabel,
          exact: true,
        }),
      ).toBeVisible();

      await page.goto(`${localeCase.homePath}/missing.txt`);
      await expect(page.locator("html")).toHaveAttribute("lang", defaultLocale);
      await expect(page.locator("[data-language-selector]")).toHaveCount(0);

      await page.goto(`${localeCase.buildPath}#try-live`);
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
        expect(source, name).toContain(`${name}.${localeCase.locale}.html`);
        expect(source, name).toContain(localeCase.localizedReturnQuery);
      }

      await page.goto(`${localeCase.hodlPath}#wallet`);
      const walletFinder = page.locator("[data-wallet-finder-root]");
      await expect(walletFinder).toBeVisible();
      const wizardHeading = walletFinder.locator("h3").first();
      const initialHeading = await wizardHeading.textContent();
      if (!initialHeading) {
        throw new Error(`${localeCase.locale} wallet wizard has no heading`);
      }
      await walletFinder.locator("button.btn-primary").click();
      await expect(wizardHeading).not.toHaveText(initialHeading);

      await context.close();
    });

    test(`${localeCase.locale} keeps the mobile language selector accessible and route-preserving`, async ({
      browser,
    }) => {
      const { baseUrl } = scenario.require();
      const languageLabel = localeCase.reviewedCopy.languageLabel;

      const context = await browser.newContext({
        baseURL: baseUrl,
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      const mobileSource = `${localeCase.locale}-mobile-gate`;
      await page.goto(
        `${localeCase.lorePath}?source=${mobileSource}&step=4#roadmap`,
      );
      const localizedSelector = getVisibleLanguageSelector(page);
      const localizedTrigger = localizedSelector.getByRole("button", {
        name: languageLabel,
        exact: true,
      });
      await localizedTrigger.focus();
      await localizedTrigger.press("Enter");
      const localizedMenu = localizedSelector.getByRole("menu", {
        name: languageLabel,
      });
      await expect(localizedMenu).not.toContainText("EN-XA");
      const currentLocale = localizedMenu.getByRole("menuitemradio", {
        name: localeCase.endonym,
      });
      await expect(currentLocale).toHaveAttribute("aria-checked", "true");
      await expect(currentLocale).toBeFocused();
      const switchToEnglish = localizedMenu.getByRole("menuitemradio", {
        name: "English",
      });
      await page.keyboard.press("Home");
      await expect(switchToEnglish).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        `${baseUrl}/lore?source=${mobileSource}&step=4#roadmap`,
      );
      await expect(page.locator("html")).toHaveAttribute("lang", defaultLocale);

      const englishSelector = getVisibleLanguageSelector(page);
      const englishTrigger = englishSelector.getByRole("button", {
        name: "Language",
        exact: true,
      });
      await englishTrigger.press("Enter");
      const englishMenu = englishSelector.getByRole("menu", {
        name: "Language",
      });
      await expect(englishMenu).toBeVisible();
      const currentEnglish = englishMenu.getByRole("menuitemradio", {
        name: "English",
      });
      await expect(currentEnglish).toHaveAttribute("aria-checked", "true");
      await expect(currentEnglish).toBeFocused();
      const switchToLocalized = englishMenu.getByRole("menuitemradio", {
        name: localeCase.endonym,
      });
      await switchToLocalized.focus();
      await expect(switchToLocalized).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(
          `${escapeRegExp(localeCase.lorePath)}\\?source=${escapeRegExp(mobileSource)}&step=4#roadmap$`,
          "u",
        ),
      );

      await context.close();
    });

    test(`${localeCase.locale} serves and runs every localized standalone artifact deterministically`, async ({
      browser,
    }) => {
      const { baseUrl, request: api } = scenario.require();
      const runtimeOutput = localeCase.reviewedCopy.standaloneRuntimeOutput;
      const backLabel = localeCase.reviewedCopy.standaloneBackLabel;
      const networkLabel = localeCase.reviewedCopy.standaloneNetworkLabel;
      const connectingLabel = localeCase.reviewedCopy.standaloneConnectingLabel;

      for (const name of standaloneExampleNames) {
        const pathname = `${standaloneBasePath}/${name}.${localeCase.locale}.html`;
        const response = await api.get(
          `${pathname}?${localeCase.localizedReturnQuery}`,
        );
        expect(response.status(), pathname).toBe(200);
        expect(response.headers()["x-robots-tag"], pathname).toBe(
          "noindex, nofollow",
        );
        expect(response.headers()["content-type"], pathname).toContain(
          "text/html",
        );
        const html = await response.text();
        expect(html, pathname).toContain(
          `<html lang="${localeCase.locale}" dir="${localeCase.dir}">`,
        );
        expect(html, pathname).toContain(
          '<meta name="robots" content="noindex, nofollow">',
        );
        expect(html, pathname).toContain(
          `from './resources/utils.${localeCase.locale}.js'`,
        );
        expect(html, pathname).not.toContain(
          reviewedDefaultLocaleCopy.standaloneConnectingNetwork,
        );
        expect(html, pathname).not.toContain('<link rel="canonical"');
        expect(html, pathname).not.toContain('hreflang="');
        expect(html, pathname).not.toContain('property="og:');
        expect(html, pathname).not.toContain('name="twitter:');
      }

      const utilsPath = `${standaloneBasePath}/resources/utils.${localeCase.locale}.js`;
      const utilsResponse = await api.get(utilsPath);
      expect(utilsResponse.status()).toBe(200);
      expect(utilsResponse.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      const utils = await utilsResponse.text();
      expect(utils).toContain(backLabel);
      expect(utils).toContain(`${networkLabel}:`);
      expect(utils).toContain(`'${localeCase.buildPath}'`);
      expect(utils).toContain(`'${localeCase.localizedReturnPath}'`);
      expect(utils).toContain(`innerHTML = \` ${connectingLabel}\`;`);

      const context = await browser.newContext({ baseURL: baseUrl });
      const page = await context.newPage();
      const interceptedSdkModules = await installStandaloneExampleMocks(page);
      for (const name of standaloneExampleNames) {
        await page.goto(
          `${standaloneBasePath}/${name}.${localeCase.locale}.html?${localeCase.localizedReturnQuery}`,
          { waitUntil: "domcontentloaded" },
        );
        await expect(page.locator("#back-link"), name).toHaveAttribute(
          "href",
          localeCase.localizedReturnPath,
        );
        await expect(page.locator("#back-link"), name).toContainText(backLabel);
        const localizedRuntimeOutput = page
          .locator("code")
          .filter({ hasText: runtimeOutput[name] })
          .first();
        await expect(
          localizedRuntimeOutput,
          `${name} ${localeCase.locale} runtime output`,
        ).toBeVisible();
        expect(
          interceptedSdkModules.has(name === "utxo-context" ? "core" : "rpc"),
          `${name} must use the deterministic SDK mock`,
        ).toBe(true);
      }

      await page.goto(
        `${standaloneBasePath}/get-server-info.${localeCase.locale}.html?${localeCase.localizedReturnQuery}`,
        { waitUntil: "domcontentloaded" },
      );
      await page.locator("#back-link").click();
      await expect(page).toHaveURL(
        new RegExp(`${escapeRegExp(localeCase.localizedReturnPath)}$`, "u"),
      );
      await context.close();
    });

    test(`${localeCase.locale} has no desktop or mobile overflow and preserves key modal behavior`, async ({
      browser,
    }) => {
      const { baseUrl } = scenario.require();
      const languageLabel = localeCase.reviewedCopy.languageLabel;
      const proofLabel = localeCase.reviewedCopy.proofTrigger;

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

        for (const route of localeCase.routes) {
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          await waitForStableLayout(page);
          await assertNoHorizontalOverflow(
            page,
            viewport.width,
            `${route.path} initial`,
          );

          if (
            route.path === localeCase.homePath &&
            viewport.width >= 1280 &&
            localeCase.dagAnnotationFont
          ) {
            const annotation = page.getByText(
              localeCase.reviewedCopy.homeDagAnnotation,
              { exact: true },
            );
            await expect(annotation).toBeVisible();
            const fontState = await annotation.evaluate(async (element) => {
              await document.fonts.ready;
              const styles = getComputedStyle(element);
              const fontFamily = styles.fontFamily;
              const primaryFamily = fontFamily.split(",", 1)[0];
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              if (!context) throw new Error("2D canvas is unavailable");
              context.font = `${styles.fontWeight} ${styles.fontSize} ${fontFamily}`;
              const metrics = context.measureText(element.textContent ?? "");
              return {
                fontFamily,
                loaded: document.fonts.check(`16px ${primaryFamily}`),
                inkHeight:
                  metrics.actualBoundingBoxAscent +
                  metrics.actualBoundingBoxDescent,
              };
            });
            expect(fontState.fontFamily).toContain(
              localeCase.dagAnnotationFont.family,
            );
            expect(fontState.loaded).toBe(true);
            expect(fontState.inkHeight).toBeGreaterThanOrEqual(
              localeCase.dagAnnotationFont.minimumInkHeight,
            );
          }

          if (route.path === localeCase.homePath && viewport.width < 768) {
            await assertHeadingUsesResponsiveWrapping(
              page.locator("main h1").first(),
              `${viewport.width}px ${localeCase.locale} home hero`,
            );
            if (localeCase.preserveWhitespaceDelimitedWords) {
              await assertWordsStayOnSingleLine(
                page.locator("main h1").first(),
                `${viewport.width}px ${localeCase.locale} home hero`,
              );
            }
            await assertEqualControlRow(
              page.locator("#verify .btn-primary, #verify .btn-ghost"),
              `${viewport.width}px ${localeCase.locale} proof actions`,
            );

            const languageTrigger = getVisibleLanguageSelector(page).getByRole(
              "button",
              { name: languageLabel, exact: true },
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
          await assertLocatorsDoNotOverlap(
            page.locator("footer a"),
            `${viewport.width}px ${route.path} footer links`,
          );

          if (viewport.width < 768) {
            const menu = page.locator(
              'button[aria-controls="mobile-nav-links"]',
            );
            await menu.click();
            await expect(menu).toHaveAttribute("aria-expanded", "true");
            await assertNoHorizontalOverflow(
              page,
              viewport.width,
              `${route.path} mobile menu open`,
            );
            await menu.click();

            const sectionSheetId =
              route.path === localeCase.buildPath
                ? "mobile-section-sheet"
                : route.path === localeCase.hodlPath
                  ? "mobile-section-sheet-hodl"
                  : null;
            if (sectionSheetId) {
              const sectionId =
                route.path === localeCase.buildPath ? "#paths" : "#wallet";
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

          if (route.path === localeCase.homePath) {
            const proofTrigger = page.locator("button.btn-primary");
            await proofTrigger.click();
            const proofDialog = page.getByRole("dialog");
            await expect(proofDialog).toBeVisible();
            await expect(proofDialog).toContainText(proofLabel);
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
  }
});
