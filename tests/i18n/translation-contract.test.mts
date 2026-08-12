import assert from "node:assert/strict";
import test from "node:test";

import type { MessageCatalog } from "../../scripts/i18n/catalog-contract.mts";
import {
  isUnchangedMessageAllowed,
  validateTranslationCatalogContract,
} from "../../scripts/i18n/translation-contract.mts";
import {
  englishMessages,
  germanMessages,
  spanishMessages,
} from "../../src/i18n/messages.ts";

const translatedCatalogs = {
  es: spanishMessages,
  de: germanMessages,
} as const;

test("complete translated catalogs satisfy the shared translation contract", () => {
  for (const [locale, translatedMessages] of Object.entries(
    translatedCatalogs,
  )) {
    for (const namespace of Object.keys(englishMessages) as Array<
      keyof typeof englishMessages
    >) {
      assert.deepEqual(
        validateTranslationCatalogContract(
          locale,
          namespace,
          englishMessages[namespace] as MessageCatalog,
          translatedMessages[namespace] as MessageCatalog,
        ),
        [],
        `${locale}:${namespace}`,
      );
    }
  }
});

test("the shared contract protects future locales without a custom policy", () => {
  assert.deepEqual(
    validateTranslationCatalogContract(
      "fr",
      "example",
      {
        unchanged: "Translate this sentence",
        protected: "Build with OP_CAT",
      },
      {
        unchanged: "Translate this sentence",
        protected: "Construire ici",
      },
    ),
    [
      "example.unchanged is unchanged from English without an explicit fr policy exception",
      "example.protected removes protected term OP_CAT from translated copy",
    ],
  );
});

test("protected terms require exact visible tokens and casing", () => {
  assert.deepEqual(
    validateTranslationCatalogContract(
      "de",
      "example",
      {
        ticker: "Buy KAS",
        language: "Build with Rust",
        brandCase: "Use Kaspa",
        brandBoundary: "Use Kaspa",
      },
      {
        ticker: "Kaspa kaufen",
        language: "Mit rusty-kaspa entwickeln",
        brandCase: "kaspa verwenden",
        brandBoundary: "Kaspad verwenden",
      },
    ),
    [
      "example.ticker removes protected term KAS from translated copy",
      "example.language removes protected term Rust from translated copy",
      "example.brandCase removes protected term Kaspa from translated copy",
      "example.brandBoundary removes protected term Kaspa from translated copy",
    ],
  );

  assert.deepEqual(
    validateTranslationCatalogContract(
      "de",
      "example",
      { brand: "Kaspa", community: "cypherpunks" },
      { brand: "Kaspas", community: "Cypherpunks" },
    ),
    [],
  );
});

test("locale policy adds only language-specific terminology and loanwords", () => {
  assert.equal(isUnchangedMessageAllowed("de", "Wallet"), true);
  assert.equal(isUnchangedMessageAllowed("fr", "Wallet"), false);
  assert.equal(isUnchangedMessageAllowed("fr", "GitHub"), true);
  assert.equal(isUnchangedMessageAllowed("fr", "{date, date, medium}"), true);

  assert.deepEqual(
    validateTranslationCatalogContract(
      "es",
      "example",
      { terminology: "Publish on mainnet" },
      { terminology: "Publicar en mainnet" },
    ),
    [
      "example.terminology retains prohibited English terminology; use red principal",
    ],
  );
});
