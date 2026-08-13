import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertClientMessagePolicyCoverage,
  auditClientPayloadArtifacts,
  type ClientMessagePolicy,
} from "../../scripts/i18n/client-payload-policy.mts";
import {
  createRoutePolicies,
  readServerOnlyCatalogFingerprints,
  validatePrerenderedPageRouteSet,
} from "../../scripts/i18n/validate-client-payload.mts";
import { isLocaleEnabled } from "../../src/i18n/config.ts";
import {
  chineseMessages,
  getBuildClientMessages,
  getHodlClientMessages,
  getHomeProofClientMessages,
  getSharedClientMessages,
} from "../../src/i18n/messages.ts";
import {
  chineseLocale,
  frenchLocale,
  germanLocale,
  indonesianLocale,
  russianLocale,
  spanishLocale,
} from "../../src/i18n/locale-registry.ts";
import { routeIds } from "../../src/i18n/manifest.ts";

const emptyPolicy = {
  allowedPaths: [],
  requiredNamespaces: [],
} as const;

const manifest = [
  "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};",
  `globalThis.__RSC_MANIFEST["/[locale]/page"] = ${JSON.stringify({
    clientModules: {
      "[project]/node_modules/next-intl/dist/esm/production/shared/NextIntlClientProvider.js":
        {
          id: 77,
        },
    },
  })};`,
].join("\n");

type FixturePayload = {
  locale: unknown;
  messages: unknown;
};

function createFlightFixture(payloads: readonly FixturePayload[]): string {
  return [
    'a:I[77,[],"default"]',
    ...payloads.map(
      (payload, index) =>
        `${(index + 11).toString(36)}:["$","$La",null,${JSON.stringify(payload)}]`,
    ),
  ].join("\n");
}

async function auditPayloadFixture(
  payloads: readonly FixturePayload[],
  policy: ClientMessagePolicy,
  expectedLocale = "en",
): Promise<string[]> {
  return auditClientPayloadArtifacts({
    routePath: "/fixture",
    manifestSource: manifest,
    artifacts: [
      {
        kind: "rsc",
        path: "fixture.rsc",
        source: createFlightFixture(payloads),
        providerRequired: true,
      },
    ],
    policy,
    expectedLocale,
  });
}

test("client payload audit finds the provider through the Next manifest", async () => {
  assert.deepEqual(
    await auditPayloadFixture([{ locale: "en", messages: null }], emptyPolicy),
    [],
  );
  await assert.rejects(
    () =>
      auditClientPayloadArtifacts({
        routePath: "/fixture",
        manifestSource:
          'globalThis.__RSC_MANIFEST["/page"] = {"clientModules":{}};',
        artifacts: [
          {
            kind: "rsc",
            path: "fixture.rsc",
            source: createFlightFixture([{ locale: "en", messages: null }]),
            providerRequired: true,
          },
        ],
        policy: emptyPolicy,
        expectedLocale: "en",
      }),
    /NextIntlClientProvider module/u,
  );
});

test("client payload audit accepts direct and referenced Flight props", async () => {
  const flight = [
    'a:I[77,[],"default"]',
    'b:["$","$La",null,{"locale":"en","messages":null}]',
    'c:{"locale":"en","messages":{"shared":{"navigation":{"home":"Home"}}}}',
    'd:["$","$La",null,"$c"]',
  ].join("\n");

  assert.deepEqual(
    await auditClientPayloadArtifacts({
      routePath: "/fixture",
      manifestSource: manifest,
      artifacts: [
        {
          kind: "rsc",
          path: "fixture.rsc",
          source: flight,
          providerRequired: true,
        },
      ],
      policy: {
        allowedPaths: ["shared.navigation"],
        requiredNamespaces: ["shared"],
        requiredPaths: ["shared.navigation"],
      },
      expectedLocale: "en",
    }),
    [],
  );
});

test("client payload audit reads embedded Flight chunks from HTML", async () => {
  const first = 'a:I[77,[],"default"]\n';
  const second = 'b:["$","$La",null,{"locale":"en-XA","messages":null}]\n';
  const html = `<script>self.__next_f.push([1,${JSON.stringify(first)}])</script><script>self.__next_f.push([1,${JSON.stringify(second)}])</script>`;

  assert.deepEqual(
    await auditClientPayloadArtifacts({
      routePath: "/fixture",
      manifestSource: manifest,
      artifacts: [
        {
          kind: "html",
          path: "fixture.html",
          source: html,
          providerRequired: true,
        },
      ],
      policy: emptyPolicy,
      expectedLocale: "en-XA",
    }),
    [],
  );
});

test("client payload audit combines required and optional build artifacts", async () => {
  const rootFlight = [
    'a:I[77,[],"default"]',
    'b:["$","$La",null,{"locale":"en","messages":null}]',
  ].join("\n");
  const html = `<script>self.__next_f.push([1,${JSON.stringify(rootFlight)}])</script>`;

  assert.deepEqual(
    await auditClientPayloadArtifacts({
      routePath: "/fixture",
      manifestSource: manifest,
      artifacts: [
        {
          kind: "html",
          path: "fixture.html",
          source: html,
          providerRequired: true,
        },
        {
          kind: "rsc",
          path: "fixture.rsc",
          source: createFlightFixture([
            {
              locale: "en",
              messages: { shared: { navigation: { home: "Home" } } },
            },
          ]),
          providerRequired: false,
        },
        {
          kind: "rsc",
          path: "fixture.segments/header.rsc",
          source: 'c:["$","header",null,{}]',
          providerRequired: false,
        },
      ],
      policy: {
        allowedPaths: ["shared.navigation"],
        requiredNamespaces: ["shared"],
        requiredPaths: ["shared.navigation"],
      },
      expectedLocale: "en",
    }),
    [],
  );
});

test("client payload audit parses each artifact before reading the next", async () => {
  const events: string[] = [];

  async function* artifacts() {
    events.push("read fixture.rsc");
    yield {
      kind: "rsc" as const,
      path: "fixture.rsc",
      source: ['a:I[77,[],"default"]', 'b:["$","$La",null,{}]'].join("\n"),
      providerRequired: true,
    };
    events.push("read later.rsc");
    throw new Error("later artifact read failed");
  }

  await assert.rejects(
    () =>
      auditClientPayloadArtifacts({
        routePath: "/fixture",
        manifestSource: manifest,
        artifacts: artifacts(),
        policy: emptyPolicy,
        expectedLocale: "en",
      }),
    /provider props do not contain messages/u,
  );
  assert.deepEqual(events, ["read fixture.rsc"]);
});

test("client payload audit preserves artifact and route error context", async () => {
  assert.deepEqual(
    await auditClientPayloadArtifacts({
      routePath: "/fixture",
      manifestSource: manifest,
      artifacts: [
        {
          kind: "rsc",
          path: "fixture.rsc",
          source: 'b:["$","div",null,{}]',
          providerRequired: true,
        },
      ],
      policy: emptyPolicy,
      expectedLocale: "en",
    }),
    [
      "fixture.rsc: no NextIntlClientProvider payload found",
      "/fixture: root NextIntlClientProvider must serialize messages=null",
    ],
  );

  assert.deepEqual(
    await auditPayloadFixture(
      [{ locale: "es", messages: null }],
      emptyPolicy,
      "en",
    ),
    ['/fixture: provider locale "es" does not match en'],
  );
});

test("payload policy requires a null root and permits only route-owned paths", async () => {
  assert.deepEqual(
    await auditPayloadFixture(
      [
        { locale: "en", messages: null },
        {
          locale: "en",
          messages: {
            shared: { navigation: { home: "Home" } },
            home: { proof: { trigger: "Verify" } },
          },
        },
      ],
      {
        allowedPaths: ["shared.navigation", "home.proof"],
        requiredNamespaces: ["shared", "home"],
        requiredPaths: ["home.proof"],
      },
    ),
    [],
  );

  assert.deepEqual(
    await auditPayloadFixture(
      [
        {
          locale: "en",
          messages: {
            shared: { navigation: { home: "Home" } },
            home: { metadata: { title: "Server only" } },
          },
        },
      ],
      {
        allowedPaths: ["shared.navigation", "home.proof"],
        requiredNamespaces: ["shared", "home"],
        requiredPaths: ["home.proof"],
      },
    ),
    [
      "/fixture: root NextIntlClientProvider must serialize messages=null",
      "/fixture: client message path home.metadata.title is not allowed",
      "/fixture: required client message path home.proof is missing",
    ],
  );
});

test("payload policy coverage rejects an omitted canonical route", () => {
  assert.throws(
    () =>
      assertClientMessagePolicyCoverage(["home", "lore"], {
        home: emptyPolicy,
      }),
    /missing canonical routes: lore/u,
  );
});

test("canonical route policies keep server routes lean and client routes exact", async () => {
  const policies = createRoutePolicies();
  assert.deepEqual(Object.keys(policies), routeIds);

  assert.deepEqual(getBuildClientMessages("en").build.terms, {
    daa: "DAA",
    dag: "DAG",
    node: "Node",
    publicNodeNetwork: "Public Node Network",
    utxo: "UTXO",
  });

  for (const routeId of ["home", "lore", "assets"] as const) {
    assert.deepEqual(policies[routeId], {
      allowedPaths: [
        "shared.footer",
        "shared.logoMenu",
        "shared.navigation",
        "shared.theme",
      ],
      requiredNamespaces: ["shared"],
      requiredPaths: [
        "shared.footer",
        "shared.logoMenu",
        "shared.navigation",
        "shared.theme",
      ],
    });
  }

  assert.deepEqual(
    await auditPayloadFixture(
      [
        { locale: "en", messages: null },
        { locale: "en", messages: getSharedClientMessages("en") },
        { locale: "en", messages: getBuildClientMessages("en") },
      ],
      policies.build,
    ),
    [],
  );
  assert.deepEqual(
    await auditPayloadFixture(
      [
        { locale: "en", messages: null },
        { locale: "en", messages: getSharedClientMessages("en") },
        { locale: "en", messages: getHodlClientMessages("en") },
      ],
      policies.hodl,
    ),
    [],
  );
});

test("Production includes selector messages for public locales", () => {
  const navigation = getSharedClientMessages("en").shared.navigation;
  assert.ok("language" in navigation);
  assert.deepEqual(navigation.language, { label: "Language" });
});

test("route policies reject metadata, Open Graph copy, and unrelated catalogs", async () => {
  const policy = createRoutePolicies().build;
  assert.deepEqual(
    await auditPayloadFixture(
      [
        { locale: "en", messages: null },
        {
          locale: "en",
          messages: {
            build: {
              metadata: { title: "Server metadata" },
              openGraph: { imageAlt: "Server image alt" },
            },
            lore: { article: { heading: "Unrelated route" } },
          },
        },
      ],
      policy,
    ),
    [
      "/fixture: client message path build.metadata.title is not allowed",
      "/fixture: client message path build.openGraph.imageAlt is not allowed",
      "/fixture: client message path lore.article.heading is not allowed",
      "/fixture: required client message namespace shared is missing",
      "/fixture: required client message path shared.footer is missing",
      "/fixture: required client message path shared.logoMenu is missing",
      "/fixture: required client message path shared.navigation is missing",
      "/fixture: required client message path shared.theme is missing",
      "/fixture: required client message path build.access is missing",
      "/fixture: required client message path build.developments is missing",
      "/fixture: required client message path build.help is missing",
      "/fixture: required client message path build.navigation is missing",
      "/fixture: required client message path build.paths is missing",
      "/fixture: required client message path build.runNode is missing",
      "/fixture: required client message path build.start is missing",
      "/fixture: required client message path build.terms is missing",
      "/fixture: required client message path build.tooling is missing",
      "/fixture: required client message path build.tryLive is missing",
      "/fixture: required client message path shared.pageSections is missing",
    ],
  );
});

test("translated client payloads contain only route-owned messages", async () => {
  const policies = createRoutePolicies();
  for (const { locale, languageLabel } of [
    { locale: spanishLocale, languageLabel: "Idioma" },
    { locale: germanLocale, languageLabel: "Sprache" },
    { locale: frenchLocale, languageLabel: "Langue" },
    { locale: chineseLocale, languageLabel: "语言" },
    { locale: russianLocale, languageLabel: "Язык" },
    { locale: indonesianLocale, languageLabel: "Bahasa" },
  ].filter(({ locale }) => isLocaleEnabled(locale))) {
    const shared = getSharedClientMessages(locale);
    assert.ok("language" in shared.shared.navigation);
    assert.deepEqual(shared.shared.navigation.language, {
      label: languageLabel,
    });
    assert.deepEqual(
      await auditPayloadFixture(
        [
          { locale, messages: null },
          { locale, messages: shared },
          { locale, messages: getBuildClientMessages(locale) },
        ],
        policies.build,
        locale,
      ),
      [],
    );
    assert.deepEqual(
      await auditPayloadFixture(
        [
          { locale, messages: null },
          { locale, messages: shared },
          { locale, messages: getHodlClientMessages(locale) },
        ],
        policies.hodl,
        locale,
      ),
      [],
    );
  }
});

test("prerender validation requires the exact localized page set", () => {
  const expected = ["/en", "/en/lore"];
  assert.deepEqual(
    validatePrerenderedPageRouteSet(
      ["/en", "/en/lore", "/en-XA/opengraph-image", "/sitemap.xml"],
      expected,
    ),
    [],
  );
  assert.deepEqual(
    validatePrerenderedPageRouteSet(
      ["/en", "/en-XA/historia", "/en-XA/opengraph-image"],
      expected,
    ),
    [
      "/en/lore: published route is not prerendered",
      "/en-XA/historia: unexpected localized page is prerendered",
    ],
  );
});

test("server-only fingerprints cover metadata and Open Graph catalogs", async () => {
  const fingerprints = await readServerOnlyCatalogFingerprints();
  const expectedFingerprints = [
    "LORE | Kaspa",
    "Kaspa Logos & Assets | Kaspa",
    "Kaspa Developer Docs, SDKs, APIs, and Node Access | Kaspa",
    "Buy KAS, Set Up a Wallet, and Self-Custody | Kaspa",
    "Kaspa — Real-time Decentralization",
    "Documentación, SDKs, APIs y acceso a nodos para desarrolladores | Kaspa",
    "Comprar KAS, configurar una billetera y usar la autocustodia | Kaspa",
    "Kaspa — Descentralización en tiempo real",
    "Kaspa-Entwicklerdokumentation, SDKs, APIs und Node-Zugriff | Kaspa",
    "KAS kaufen, Wallet einrichten und selbst verwahren | Kaspa",
    "Kaspa – Echtzeit-Dezentralisierung",
    ...(isLocaleEnabled(frenchLocale)
      ? [
          "Documentation, SDK, API et accès aux nœuds pour les développeurs Kaspa | Kaspa",
          "Acheter des KAS, configurer un portefeuille et passer à l’autocustodie | Kaspa",
          "Kaspa — La décentralisation en temps réel",
        ]
      : []),
    ...(isLocaleEnabled(chineseLocale)
      ? [
          chineseMessages.build.metadata.title,
          chineseMessages.hodl.metadata.title,
          chineseMessages.home.openGraph.imageAlt,
        ]
      : []),
  ];
  for (const expected of expectedFingerprints) {
    assert.ok(fingerprints.includes(expected), expected);
  }
});

test("server-only fingerprints ignore unconfigured partial locale work", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "kaspa-i18n-payload-"));
  try {
    await cp(join(process.cwd(), "messages"), join(fixture, "messages"), {
      recursive: true,
    });
    await mkdir(join(fixture, "messages/it"), { recursive: true });
    await writeFile(
      join(fixture, "messages/it/shared.json"),
      JSON.stringify({ navigation: { language: { label: "Lingua" } } }),
    );

    const fingerprints = await readServerOnlyCatalogFingerprints(fixture);
    assert.ok(fingerprints.includes("Kaspa — Real-time Decentralization"));
    assert.ok(
      fingerprints.includes("Kaspa — Descentralización en tiempo real"),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("payload policy fails closed for malformed provider props", async () => {
  await assert.rejects(
    () =>
      auditClientPayloadArtifacts({
        routePath: "/fixture",
        manifestSource: manifest,
        artifacts: [
          {
            kind: "rsc",
            path: "fixture.rsc",
            source: ['a:I[77,[],"default"]', 'b:["$","$La",null,{}]'].join(
              "\n",
            ),
            providerRequired: true,
          },
        ],
        policy: emptyPolicy,
        expectedLocale: "en",
      }),
    /provider props do not contain messages/u,
  );
  await assert.rejects(
    () =>
      auditClientPayloadArtifacts({
        routePath: "/fixture",
        manifestSource: manifest,
        artifacts: [
          {
            kind: "rsc",
            path: "fixture.rsc",
            source: ['a:I[77,[],"default"]', 'b:["$","div",null,{}]'].join(
              "\n",
            ),
            providerRequired: true,
          },
        ],
        policy: emptyPolicy,
        expectedLocale: "en",
      }),
    /imports NextIntlClientProvider but contains no provider element/u,
  );

  assert.deepEqual(
    await auditPayloadFixture([{ locale: "en", messages: ["unexpected"] }], {
      allowedPaths: [],
      requiredNamespaces: [],
    }),
    [
      "/fixture: root NextIntlClientProvider must serialize messages=null",
      "/fixture: NextIntlClientProvider messages must be null or a plain object",
    ],
  );
});

test("lazy Home proof responses contain only the proof catalog", async () => {
  assert.deepEqual(
    await auditPayloadFixture(
      [
        { locale: "en", messages: null },
        { locale: "en", messages: getHomeProofClientMessages("en") },
      ],
      {
        allowedPaths: ["home.proof"],
        requiredNamespaces: ["home"],
        requiredPaths: ["home.proof"],
      },
    ),
    [],
  );
});
