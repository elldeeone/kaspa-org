import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertClientMessagePolicyCoverage,
  decodeEmbeddedFlight,
  extractNextIntlProviderPayloads,
  readNextIntlProviderModuleId,
  validateClientMessagePayloads,
} from "../../scripts/i18n/client-payload-policy.mts";
import {
  createRoutePolicies,
  readServerOnlyCatalogFingerprints,
  validatePrerenderedPageRouteSet,
} from "../../scripts/i18n/validate-client-payload.mts";
import {
  getBuildClientMessages,
  getHodlClientMessages,
  getHomeProofClientMessages,
  getSharedClientMessages,
} from "../../src/i18n/messages.ts";
import { spanishLocale } from "../../src/i18n/config.ts";
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

test("client manifest lookup finds the NextIntl provider module", () => {
  assert.equal(readNextIntlProviderModuleId(manifest), "77");
  assert.throws(
    () =>
      readNextIntlProviderModuleId(
        'globalThis.__RSC_MANIFEST["/page"] = {"clientModules":{}};',
      ),
    /NextIntlClientProvider module/u,
  );
});

test("Flight extraction reads null, direct, and referenced provider messages", () => {
  const flight = [
    'a:I[77,[],"default"]',
    'b:["$","$La",null,{"locale":"en","messages":null}]',
    'c:{"locale":"en","messages":{"shared":{"navigation":{"home":"Home"}}}}',
    'd:["$","$La",null,"$c"]',
  ].join("\n");

  assert.deepEqual(extractNextIntlProviderPayloads(manifest, flight), [
    { locale: "en", messages: null },
    {
      locale: "en",
      messages: { shared: { navigation: { home: "Home" } } },
    },
  ]);
});

test("HTML extraction decodes embedded Flight chunks", () => {
  const first = 'a:I[77,[],"default"]\n';
  const second = 'b:["$","$La",null,{"locale":"en-XA","messages":null}]\n';
  const html = `<script>self.__next_f.push([1,${JSON.stringify(first)}])</script><script>self.__next_f.push([1,${JSON.stringify(second)}])</script>`;

  assert.equal(decodeEmbeddedFlight(html), `${first}${second}`);
  assert.deepEqual(
    extractNextIntlProviderPayloads(manifest, decodeEmbeddedFlight(html)),
    [{ locale: "en-XA", messages: null }],
  );
});

test("payload policy requires a null root and permits only route-owned paths", () => {
  assert.deepEqual(
    validateClientMessagePayloads(
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
    validateClientMessagePayloads(
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
      "root NextIntlClientProvider must serialize messages=null",
      "client message path home.metadata.title is not allowed",
      "required client message path home.proof is missing",
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

test("canonical route policies keep server routes lean and client routes exact", () => {
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
    validateClientMessagePayloads(
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
    validateClientMessagePayloads(
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

test("Production includes selector messages for public Spanish", () => {
  const navigation = getSharedClientMessages("en").shared.navigation;
  assert.ok("language" in navigation);
  assert.deepEqual(navigation.language, { label: "Language" });
});

test("route policies reject metadata, Open Graph copy, and unrelated catalogs", () => {
  const policy = createRoutePolicies().build;
  assert.deepEqual(
    validateClientMessagePayloads(
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
      "client message path build.metadata.title is not allowed",
      "client message path build.openGraph.imageAlt is not allowed",
      "client message path lore.article.heading is not allowed",
      "required client message namespace shared is missing",
      "required client message path shared.footer is missing",
      "required client message path shared.logoMenu is missing",
      "required client message path shared.navigation is missing",
      "required client message path shared.theme is missing",
      "required client message path build.access is missing",
      "required client message path build.developments is missing",
      "required client message path build.help is missing",
      "required client message path build.navigation is missing",
      "required client message path build.paths is missing",
      "required client message path build.runNode is missing",
      "required client message path build.start is missing",
      "required client message path build.terms is missing",
      "required client message path build.tooling is missing",
      "required client message path build.tryLive is missing",
      "required client message path shared.pageSections is missing",
    ],
  );
});

test("Spanish client payloads contain only route-owned messages", () => {
  const policies = createRoutePolicies();
  const shared = getSharedClientMessages(spanishLocale);
  assert.ok("language" in shared.shared.navigation);
  assert.deepEqual(shared.shared.navigation.language, {
    label: "Idioma",
  });
  assert.deepEqual(
    validateClientMessagePayloads(
      [
        { locale: spanishLocale, messages: null },
        { locale: spanishLocale, messages: shared },
        {
          locale: spanishLocale,
          messages: getBuildClientMessages(spanishLocale),
        },
      ],
      policies.build,
    ),
    [],
  );
  assert.deepEqual(
    validateClientMessagePayloads(
      [
        { locale: spanishLocale, messages: null },
        { locale: spanishLocale, messages: shared },
        {
          locale: spanishLocale,
          messages: getHodlClientMessages(spanishLocale),
        },
      ],
      policies.hodl,
    ),
    [],
  );
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
  for (const expected of [
    "LORE | Kaspa",
    "Kaspa Logos & Assets | Kaspa",
    "Kaspa Developer Docs, SDKs, APIs, and Node Access | Kaspa",
    "Buy KAS, Set Up a Wallet, and Self-Custody | Kaspa",
    "Kaspa — Real-time Decentralization",
    "Documentación, SDKs, APIs y acceso a nodos para desarrolladores | Kaspa",
    "Comprar KAS, configurar una billetera y usar la autocustodia | Kaspa",
    "Kaspa — Descentralización en tiempo real",
  ]) {
    assert.ok(fingerprints.includes(expected), expected);
  }
});

test("server-only fingerprints ignore unconfigured partial locale work", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "kaspa-i18n-payload-"));
  try {
    await cp(join(process.cwd(), "messages"), join(fixture, "messages"), {
      recursive: true,
    });
    await mkdir(join(fixture, "messages/fr"), { recursive: true });
    await writeFile(
      join(fixture, "messages/fr/shared.json"),
      JSON.stringify({ navigation: { language: { label: "Langue" } } }),
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

test("payload policy fails closed for malformed provider props", () => {
  assert.throws(
    () =>
      extractNextIntlProviderPayloads(
        manifest,
        ['a:I[77,[],"default"]', 'b:["$","$La",null,{}]'].join("\n"),
      ),
    /provider props do not contain messages/u,
  );
  assert.throws(
    () =>
      extractNextIntlProviderPayloads(
        manifest,
        ['a:I[77,[],"default"]', 'b:["$","div",null,{}]'].join("\n"),
      ),
    /imports NextIntlClientProvider but contains no provider element/u,
  );

  assert.deepEqual(
    validateClientMessagePayloads(
      [{ locale: "en", messages: ["unexpected"] }],
      { allowedPaths: [], requiredNamespaces: [] },
    ),
    [
      "root NextIntlClientProvider must serialize messages=null",
      "NextIntlClientProvider messages must be null or a plain object",
    ],
  );
});

test("lazy Home proof responses contain only the proof catalog", () => {
  assert.deepEqual(
    validateClientMessagePayloads(
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
