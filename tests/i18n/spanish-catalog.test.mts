import assert from "node:assert/strict";
import test from "node:test";

import type { MessageCatalog } from "../../scripts/i18n/catalog-contract.mts";
import {
  SPANISH_UNCHANGED_MESSAGE_KEYS,
  validateSpanishCatalogContract,
} from "../../scripts/i18n/spanish-contract.mts";
import { englishMessages, spanishMessages } from "../../src/i18n/messages.ts";

test("the complete Spanish catalog satisfies glossary and translation contracts", () => {
  assert.ok(SPANISH_UNCHANGED_MESSAGE_KEYS.length > 0);
  for (const namespace of Object.keys(englishMessages) as Array<
    keyof typeof englishMessages
  >) {
    assert.deepEqual(
      validateSpanishCatalogContract(
        namespace,
        englishMessages[namespace] as MessageCatalog,
        spanishMessages[namespace] as MessageCatalog,
      ),
      [],
      namespace,
    );
  }
});

test("the Spanish contract rejects untranslated and glossary-breaking copy", () => {
  assert.deepEqual(
    validateSpanishCatalogContract(
      "example",
      {
        unchanged: "Translate this sentence",
        terminology: "Publish on mainnet",
        protected: "Build with OP_CAT",
      },
      {
        unchanged: "Translate this sentence",
        terminology: "Publicar en mainnet",
        protected: "Desarrollar aquí",
      },
    ),
    [
      "example.unchanged is unchanged from English without an explicit allowlist entry",
      "example.terminology retains prohibited English terminology; use red principal",
      "example.protected removes protected term OP_CAT from translated copy",
    ],
  );
});
