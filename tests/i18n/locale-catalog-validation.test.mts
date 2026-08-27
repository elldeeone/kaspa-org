import assert from "node:assert/strict";
import test from "node:test";

import type { MessageCatalog } from "../../scripts/i18n/catalog-contract.mts";
import {
  createLocaleCatalogValidator,
  isUnchangedMessageAllowed,
} from "../../scripts/i18n/locale-catalog-validation.mts";
import { englishMessages, spanishMessages } from "../../src/i18n/messages.ts";

function validateTranslatedCatalog(
  locale: string,
  namespace: string,
  source: MessageCatalog,
  target: MessageCatalog,
): string[] {
  return createLocaleCatalogValidator(source).validateTranslation(
    locale,
    namespace,
    target,
  );
}

test("the shared contract protects future locales without a custom policy", () => {
  assert.deepEqual(
    validateTranslatedCatalog(
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
    validateTranslatedCatalog(
      "ru",
      "example",
      { hidden: "Visible source" },
      { hidden: "Видимый\u200B перевод" },
    ),
    ["example.hidden contains prohibited zero-width character U+200B"],
  );
});

test("language-shaping joiners remain valid translated text", () => {
  for (const [locale, translated] of [
    ["fa", "می‌رود"],
    ["hi", "क्‍ष"],
  ] as const) {
    assert.deepEqual(
      validateTranslatedCatalog(
        locale,
        "example",
        { text: "Visible source" },
        { text: translated },
      ),
      [],
      locale,
    );
  }
});

test("emoji ZWJ sequences remain valid translated text", () => {
  for (const translated of ["👩‍💻", "❤️‍🔥", "🧑🏽‍💻"]) {
    assert.deepEqual(
      validateTranslatedCatalog(
        "ja",
        "example",
        { text: "Visible source" },
        { text: translated },
      ),
      [],
      translated,
    );
  }
});

test("joiners cannot make untranslated Latin copy appear translated", () => {
  for (const [character, codePoint] of [
    ["\u200C", "200C"],
    ["\u200D", "200D"],
  ] as const) {
    assert.deepEqual(
      validateTranslatedCatalog(
        "fr",
        "example",
        { text: "Translate this sentence" },
        { text: `Translate${character} this sentence` },
      ),
      [`example.text contains prohibited zero-width character U+${codePoint}`],
      codePoint,
    );
  }
});

test("protected terms require exact visible tokens and casing", () => {
  assert.deepEqual(
    validateTranslatedCatalog(
      "de",
      "example",
      {
        ticker: "Buy KAS",
        language: "Build with Rust",
        brandCase: "Use Kaspa",
        brandBoundary: "Use Kaspa",
        latinBoundary: "Use Kaspa",
      },
      {
        ticker: "Kaspa kaufen",
        language: "Mit rusty-kaspa entwickeln",
        brandCase: "kaspa verwenden",
        brandBoundary: "Kaspad verwenden",
        latinBoundary: "Kaspaé verwenden",
      },
    ),
    [
      "example.ticker removes protected term KAS from translated copy",
      "example.language removes protected term Rust from translated copy",
      "example.brandCase removes protected term Kaspa from translated copy",
      "example.brandBoundary removes protected term Kaspa from translated copy",
      "example.latinBoundary removes protected term Kaspa from translated copy",
    ],
  );

  assert.deepEqual(
    validateTranslatedCatalog(
      "ru",
      "example",
      { release: "waiting for crescendo..." },
      { release: "ожидание крещендо..." },
    ),
    ["example.release removes protected term Crescendo from translated copy"],
  );
});

test("protected terms remain enforced inside ICU branches", () => {
  assert.deepEqual(
    validateTranslatedCatalog(
      "es",
      "example",
      {
        count:
          "{count, plural, one {One KAS transaction} other {# KAS transactions}}",
      },
      {
        count: "{count, plural, one {Una transacción} other {# transacciones}}",
      },
    ),
    ["example.count removes protected term KAS from translated copy"],
  );
});

test("protected terms support no-space boundaries for every locale", () => {
  for (const [locale, translated] of [
    ["zh-CN", "使用Kaspa网络"],
    ["zh-TW", "使用Kaspa網路"],
    ["ja", "Kaspaを使用する"],
    ["ko", "Kaspa를 사용하세요"],
    ["th", "ใช้Kaspaเครือข่าย"],
  ] as const) {
    assert.deepEqual(
      validateTranslatedCatalog(
        locale,
        "example",
        { text: "Use the Kaspa network" },
        { text: translated },
      ),
      [],
      locale,
    );
  }
});

test("quoted ICU literals still require translation", () => {
  assert.deepEqual(
    validateTranslatedCatalog(
      "fr",
      "example",
      { text: "'{Translate me}'" },
      { text: "'{Translate me}'" },
    ),
    [
      "example.text is unchanged from English without an explicit fr policy exception",
    ],
  );
});

test("locale policy adds only language-specific terminology and loanwords", () => {
  assert.equal(
    isUnchangedMessageAllowed(
      "es",
      "hodl.walletFinder.ratings.notApplicableCompact",
      "N/A",
    ),
    true,
  );
  assert.equal(
    isUnchangedMessageAllowed("es", "example.accidental", "N/A"),
    false,
  );
  assert.equal(
    isUnchangedMessageAllowed(
      "fr",
      "hodl.walletFinder.ratings.notApplicableCompact",
      "N/A",
    ),
    false,
  );
  assert.equal(
    isUnchangedMessageAllowed("fr", "example.github", "GitHub"),
    false,
  );
  assert.equal(
    isUnchangedMessageAllowed("fr", "example.date", "{date, date, medium}"),
    true,
  );

  assert.deepEqual(
    validateTranslatedCatalog(
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

test("locale unchanged-message exceptions remain key-specific and detect staleness", () => {
  const source = {
    ...englishMessages.hodl,
    accidental: "N/A",
  } satisfies MessageCatalog;
  const target = {
    ...spanishMessages.hodl,
    accidental: "N/A",
    walletFinder: {
      ...spanishMessages.hodl.walletFinder,
      ratings: {
        ...spanishMessages.hodl.walletFinder.ratings,
        notApplicableCompact: "No aplica",
      },
    },
  } satisfies MessageCatalog;

  assert.deepEqual(validateTranslatedCatalog("es", "hodl", source, target), [
    "hodl.accidental is unchanged from English without an explicit es policy exception",
    "hodl.walletFinder.ratings.notApplicableCompact has a stale unchanged-message policy exception",
  ]);
});
