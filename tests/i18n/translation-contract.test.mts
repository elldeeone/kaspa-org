import assert from "node:assert/strict";
import test from "node:test";

import type { MessageCatalog } from "../../scripts/i18n/catalog-contract.mts";
import {
  isUnchangedMessageAllowed,
  validateTranslationCatalogContract,
} from "../../scripts/i18n/translation-contract.mts";
import {
  brazilianPortugueseMessages,
  chineseMessages,
  englishMessages,
  frenchMessages,
  germanMessages,
  indonesianMessages,
  japaneseMessages,
  koreanMessages,
  russianMessages,
  spanishMessages,
} from "../../src/i18n/messages.ts";

const translatedCatalogs = {
  es: spanishMessages,
  de: germanMessages,
  fr: frenchMessages,
  "zh-CN": chineseMessages,
  ru: russianMessages,
  "id-ID": indonesianMessages,
  "pt-BR": brazilianPortugueseMessages,
  ja: japaneseMessages,
  ko: koreanMessages,
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

test("the shared contract rejects invisible zero-width characters generically", () => {
  assert.deepEqual(
    validateTranslationCatalogContract(
      "ru",
      "example",
      { hidden: "Visible source" },
      { hidden: "Видимый\u200B перевод" },
    ),
    ["example.hidden contains prohibited zero-width character U+200B"],
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
      "ru",
      "example",
      { release: "waiting for crescendo..." },
      { release: "ожидание крещендо..." },
    ),
    ["example.release removes protected term Crescendo from translated copy"],
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

test("Japanese protected terms allow particles but reject Latin token extension", () => {
  assert.deepEqual(
    validateTranslationCatalogContract(
      "ja",
      "example",
      {
        brand: "Use Kaspa",
        data: "Check UTXO",
        culture: "Built by cypherpunks",
      },
      {
        brand: "Kaspaは利用できます",
        data: "UTXOコミットメントを確認",
        culture: "サイファーパンクによる開発",
      },
    ),
    [],
  );
  assert.deepEqual(
    validateTranslationCatalogContract(
      "ja",
      "example",
      { brand: "Use Kaspa" },
      { brand: "Kaspadを利用" },
    ),
    ["example.brand removes protected term Kaspa from translated copy"],
  );
});

test("locale policy adds only language-specific terminology and loanwords", () => {
  assert.equal(isUnchangedMessageAllowed("de", "Wallet"), true);
  assert.equal(isUnchangedMessageAllowed("fr", "Wallet"), false);
  assert.equal(isUnchangedMessageAllowed("fr", "GitHub"), true);
  assert.equal(isUnchangedMessageAllowed("fr", "Menu"), true);
  assert.equal(isUnchangedMessageAllowed("fr", "Acceptable"), true);
  assert.equal(isUnchangedMessageAllowed("fr", "{date, date, medium}"), true);
  assert.equal(isUnchangedMessageAllowed("id-ID", "upstream"), true);
  assert.equal(isUnchangedMessageAllowed("pt-BR", "Desktop"), true);

  assert.deepEqual(
    validateTranslationCatalogContract(
      "ja",
      "example",
      { terminology: "Publish on mainnet" },
      { terminology: "mainnetに公開" },
    ),
    [
      "example.terminology retains prohibited English terminology; use メインネット",
    ],
  );
  assert.deepEqual(
    validateTranslationCatalogContract(
      "ja",
      "example",
      { heading: "First line\nSecond line" },
      { heading: "最初の行（\n次の行" },
    ),
    [
      "example.heading ends a manual line with prohibited Japanese opening punctuation",
    ],
  );
  assert.deepEqual(
    validateTranslationCatalogContract(
      "ja",
      "example",
      { heading: "First line\nSecond line" },
      { heading: "最初の行\n、次の行" },
    ),
    [
      "example.heading starts a manual line with prohibited Japanese closing punctuation",
    ],
  );

  assert.equal(isUnchangedMessageAllowed("ko", "{telegram} R&D"), true);

  assert.deepEqual(
    validateTranslationCatalogContract(
      "ko",
      "example",
      {
        naturalParticle: "Build on Kaspa",
        changedIdentifier: "Use Kaspa",
        kaspaPlural: "Use Kaspa",
        bitcoinPlural: "Use Bitcoin",
        ethereumPlural: "Use Ethereum",
        cypherpunkPlural: "Meet a cypherpunk",
      },
      {
        naturalParticle: "Kaspa에서 개발하기",
        changedIdentifier: "Kaspad 사용",
        kaspaPlural: "Kaspas 사용",
        bitcoinPlural: "Bitcoins 사용",
        ethereumPlural: "Ethereums 사용",
        cypherpunkPlural: "cypherpunks 만나기",
      },
    ),
    [
      "example.changedIdentifier removes protected term Kaspa from translated copy",
      "example.kaspaPlural removes protected term Kaspa from translated copy",
      "example.bitcoinPlural removes protected term Bitcoin from translated copy",
      "example.ethereumPlural removes protected term Ethereum from translated copy",
      "example.cypherpunkPlural removes protected term cypherpunk from translated copy",
    ],
  );

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
  assert.deepEqual(
    validateTranslationCatalogContract(
      "fr",
      "example",
      { terminology: "Read block data" },
      { terminology: "Lire les données du block" },
    ),
    ["example.terminology retains prohibited English terminology; use bloc"],
  );
  assert.deepEqual(
    validateTranslationCatalogContract(
      "fr",
      "example",
      { terminology: "Read blocks" },
      { terminology: "Lire les blocks" },
    ),
    ["example.terminology retains prohibited English terminology; use bloc"],
  );
});
