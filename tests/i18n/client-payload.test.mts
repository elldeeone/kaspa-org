import assert from "node:assert/strict";
import test from "node:test";

import {
  assertClientMessagePolicyCoverage,
  decodeEmbeddedFlight,
  extractNextIntlProviderPayloads,
  readNextIntlProviderModuleId,
  validateClientMessagePayloads,
} from "../../scripts/i18n/client-payload-policy.mts";
import { getHomeProofClientMessages } from "../../src/i18n/messages.ts";

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
