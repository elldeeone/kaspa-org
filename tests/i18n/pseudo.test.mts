import assert from "node:assert/strict";
import test from "node:test";

import {
  hasSameIcuStructure,
  pseudoLocalizeCatalog,
  pseudoLocalizeMessage,
} from "../../src/i18n/pseudo.ts";
import { englishMessages } from "../../src/i18n/messages.ts";
import {
  PSEUDO_UNCHANGED_MESSAGE_KEYS,
  generatePseudoCatalog,
  validateGeneratedPseudoCatalog,
} from "../../scripts/i18n/generate-pseudo.mts";

test("pseudo localization changes literal text without corrupting ICU syntax", () => {
  assert.equal(pseudoLocalizeMessage("Hello {name}"), "[!! Ħëëļļöö {name} !!]");
  assert.equal(pseudoLocalizeMessage("{date}"), "[!! {date} !!]");
  assert.equal(pseudoLocalizeMessage("~{date}"), "[!! ~{date} !!]");
  assert.equal(
    pseudoLocalizeMessage(
      "Read <link>{count, plural, one {# node} other {# nodes}}</link>",
    ),
    "[!! Řëëååď <link>{count, plural, one {# ńööďëë} other {# ńööďëëš}}</link> !!]",
  );
});

test("pseudo localization preserves approved proper nouns and code", () => {
  assert.equal(
    pseudoLocalizeMessage(
      "Kaspa KAS Bitcoin GitHub kaspad utxos.gz serialization.go getCoinSupply X",
    ),
    "Kaspa KAS Bitcoin GitHub kaspad utxos.gz serialization.go getCoinSupply X",
  );
  assert.equal(
    pseudoLocalizeMessage("Run <code>npm run build</code> now"),
    "[!! Řüüń <code>npm run build</code> ńööŵ !!]",
  );
});

test("Phase 3 glossary terms expand during full-site pseudo QA", () => {
  const terms = [
    "blockDAG",
    "proof-of-work",
    "UTXO",
    "DAA",
    "BPS",
    "PoW",
    "GHOSTDAG",
    "DAGKNIGHT",
    "HODL",
    "BUIDL",
    "LORE",
    "THINK",
    "DAGVIZ",
    "Crescendo",
  ];
  const result = pseudoLocalizeMessage(terms.join(" "));

  assert.match(result, /^\[!! /u);
  for (const term of terms) assert.equal(result.includes(term), false, term);

  const pseudoTerms = pseudoLocalizeCatalog({
    terms: englishMessages.build.terms,
  }).terms;
  for (const [key, source] of Object.entries(englishMessages.build.terms)) {
    assert.notEqual(pseudoTerms[key as keyof typeof pseudoTerms], source, key);
  }
});

test("ICU interface comparison rejects branch, style, tag, and pound drift", () => {
  const plural = "{count, plural, one {# node} other {# nodes}}";
  const select = "{audience, select, miner {Mine} other {Build}}";

  assert.equal(
    hasSameIcuStructure(plural, pseudoLocalizeMessage(plural)),
    true,
  );
  assert.equal(
    hasSameIcuStructure(plural, "{count, plural, other {# nodes}}"),
    false,
  );
  assert.equal(
    hasSameIcuStructure(
      "{amount, number, ::currency/USD}",
      "{amount, number, ::percent}",
    ),
    false,
  );
  assert.equal(
    hasSameIcuStructure(
      select,
      "{audience, select, holder {Mine} other {Build}}",
    ),
    false,
  );
  assert.equal(
    hasSameIcuStructure("Read <link>this</link>", "Read <strong>this</strong>"),
    false,
  );
  assert.equal(
    hasSameIcuStructure(plural, "{count, plural, one {node} other {# nodes}}"),
    false,
  );
});

test("ICU interface comparison allows sibling reordering but not boundary changes", () => {
  assert.equal(
    hasSameIcuStructure("Hello {first} {last}", "{last}, {first}, hello"),
    true,
  );
  assert.equal(
    hasSameIcuStructure(
      "<strong>{first}</strong> <link>{last}</link>",
      "<link>{last}</link> <strong>{first}</strong>",
    ),
    true,
  );
  assert.equal(
    hasSameIcuStructure(
      "<strong>{first}</strong> {last}",
      "<strong>{first} {last}</strong>",
    ),
    false,
  );
});

test("pseudo catalog generation is deterministic and preserves source interfaces", () => {
  const source = {
    shared: {
      title: "Hello {name}",
      product: "Kaspa",
    },
    home: {
      count: "{count, plural, one {# node} other {# nodes}}",
    },
  } as const;
  const allowlist = new Set(["shared.product"]);

  const first = generatePseudoCatalog(source);
  const second = generatePseudoCatalog(source);
  assert.deepEqual(first, second);
  assert.deepEqual(
    validateGeneratedPseudoCatalog(source, first, allowlist),
    [],
  );
  assert.deepEqual(first, pseudoLocalizeCatalog(source));
});

test("pseudo catalog gate rejects unchanged copy and stale allowlist entries", () => {
  const source = { title: "Hello", product: "Kaspa" } as const;
  const generated = generatePseudoCatalog(source);

  assert.deepEqual(
    validateGeneratedPseudoCatalog(
      source,
      { ...generated, title: "Hello" },
      new Set(["product"]),
    ),
    ["title did not change in the generated pseudo catalog"],
  );
  assert.deepEqual(
    validateGeneratedPseudoCatalog(
      source,
      generated,
      new Set(["title", "product"]),
    ),
    ["title is a stale pseudo unchanged-message allowlist entry"],
  );
});

test("the repository pseudo allowlist is explicit and stable", () => {
  assert.deepEqual(PSEUDO_UNCHANGED_MESSAGE_KEYS, [
    "errors.page.code",
    "home.proof.supply.comparison.unit",
    "shared.ai.providers.chatgpt",
    "shared.ai.providers.claude",
    "shared.ai.providers.perplexity",
    "shared.footer.links.github",
    "shared.footer.links.x",
  ]);
});
