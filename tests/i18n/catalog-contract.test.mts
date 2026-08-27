import assert from "node:assert/strict";
import test from "node:test";

import {
  validateCatalogSource,
  type MessageCatalog,
} from "../../scripts/i18n/catalog-contract.mts";
import {
  createLocaleCatalogValidator,
  flattenCatalog,
} from "../../scripts/i18n/locale-catalog-validation.mts";

function compareCatalogStructure(
  source: MessageCatalog,
  target: MessageCatalog,
): string[] {
  return createLocaleCatalogValidator(source).compareStructure(target);
}

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

test("catalog validation accepts a non-empty nested ICU catalog", () => {
  const result = validateCatalogSource(
    JSON.stringify({
      greeting: "Hello {name}",
      nested: {
        count: "{count, plural, one {# node} other {# nodes}}",
      },
    }),
    "messages/en/example.json",
  );

  assert.deepEqual(result.errors, []);
  assert.ok(result.catalog);
  assert.deepEqual(
    createLocaleCatalogValidator(result.catalog).sourceDiagnostics,
    [],
  );
  assert.deepEqual(
    [...flattenCatalog(result.catalog).keys()],
    ["greeting", "nested.count"],
  );
});

test("catalog validation rejects malformed structure and duplicate keys", async (t) => {
  const cases = [
    {
      name: "duplicate key",
      source: '{"section":{"title":"One","title":"Two"}}',
      issue: "duplicate JSON key section.title",
    },
    { name: "empty root", source: "{}", issue: "catalog must not be empty" },
    {
      name: "string root",
      source: '"Hello"',
      issue: "catalog root must be an object",
    },
    {
      name: "empty key",
      source: '{"":"value"}',
      issue: "keys must not be empty",
    },
    {
      name: "dotted key",
      source: '{"bad.key":"value"}',
      issue: "keys must not contain dots",
    },
    {
      name: "empty object",
      source: '{"section":{}}',
      issue: "section must not be empty",
    },
    {
      name: "non-string leaf",
      source: '{"count":2}',
      issue: "count must be a string or object",
    },
    {
      name: "empty message",
      source: '{"title":"  "}',
      issue: "title must not be empty",
    },
  ] as const;

  for (const fixture of cases) {
    await t.test(fixture.name, () => {
      const result = validateCatalogSource(fixture.source, "fixture.json");
      assert.ok(
        result.errors.some((error) => error.includes(fixture.issue)),
        `${fixture.name}: ${result.errors.join("\n")}`,
      );
    });
  }
});

test("locale catalog analysis rejects invalid ICU syntax", () => {
  const result = validateCatalogSource(
    '{"title":"Hello {name"}',
    "fixture.json",
  );
  assert.deepEqual(result.errors, []);
  assert.ok(result.catalog);
  assert.match(
    createLocaleCatalogValidator(result.catalog).sourceDiagnostics[0] ?? "",
    /title has invalid ICU syntax/u,
  );
});

test("catalog comparison enforces exact keys and ICU interfaces", async (t) => {
  const source = {
    greeting: "Hello {name}",
    rich: "Read <link>{count, plural, one {# page} other {# pages}}</link>",
  };

  assert.deepEqual(
    compareCatalogStructure(source, {
      rich: "Lire <link>{count, plural, one {# page} other {# pages}}</link>",
      greeting: "Bonjour {name}",
    }),
    [],
  );

  const cases = [
    {
      name: "missing key",
      target: { greeting: "Bonjour {name}" },
      issue: "missing key rich",
    },
    {
      name: "extra key",
      target: { ...source, extra: "Extra" },
      issue: "extra key extra",
    },
    {
      name: "renamed argument",
      target: { ...source, greeting: "Bonjour {person}" },
      issue: "greeting has a different ICU interface",
    },
    {
      name: "renamed tag",
      target: {
        ...source,
        rich: "Lire <anchor>{count, plural, one {# page} other {# pages}}</anchor>",
      },
      issue: "rich has a different ICU interface",
    },
    {
      name: "missing plural branch",
      target: {
        ...source,
        rich: "Lire <link>{count, plural, other {# pages}}</link>",
      },
      issue: "rich has a different ICU interface",
    },
  ] as const;

  for (const fixture of cases) {
    await t.test(fixture.name, () => {
      const errors = compareCatalogStructure(source, fixture.target);
      assert.ok(
        errors.some((error) => error.includes(fixture.issue)),
        `${fixture.name}: ${errors.join("\n")}`,
      );
    });
  }
});

test("locale-aware catalog comparison accepts locale plural categories", () => {
  const source = {
    count:
      "{count, plural, =0 {No pages} one {<strong>#</strong> page} other {<strong>#</strong> pages}}",
  };
  const russian = {
    count:
      "{count, plural, =0 {Нет страниц} one {<strong>#</strong> страница} few {<strong>#</strong> страницы} many {<strong>#</strong> страниц} other {<strong>#</strong> страницы}}",
  };

  assert.deepEqual(
    validateTranslatedCatalog("ru", "example", source, russian),
    [],
  );
  assert.match(
    compareCatalogStructure(source, russian)[0] ?? "",
    /count has a different ICU interface/u,
  );
});

test("locale-aware plural comparison preserves the message interface", async (t) => {
  const source = {
    count:
      "{count, plural, =0 {No pages} one {<strong>#</strong> page} other {<strong>#</strong> pages}}",
  };
  const fixtures = [
    {
      name: "missing shared locale category",
      message:
        "{count, plural, =0 {Нет страниц} few {<strong>#</strong> страницы} many {<strong>#</strong> страниц} other {<strong>#</strong> страницы}}",
    },
    {
      name: "unsupported locale category",
      message:
        "{count, plural, =0 {Нет страниц} one {<strong>#</strong> страница} two {<strong>#</strong> страницы} other {<strong>#</strong> страниц}}",
    },
    {
      name: "missing exact-number branch",
      message:
        "{count, plural, one {<strong>#</strong> страница} few {<strong>#</strong> страницы} many {<strong>#</strong> страниц} other {<strong>#</strong> страницы}}",
    },
    {
      name: "changed nested tag topology",
      message:
        "{count, plural, =0 {Нет страниц} one {<strong>#</strong> страница} few {# страницы} many {<strong>#</strong> страниц} other {<strong>#</strong> страницы}}",
    },
  ] as const;

  for (const fixture of fixtures) {
    await t.test(fixture.name, () => {
      assert.match(
        validateTranslatedCatalog("ru", "example", source, {
          count: fixture.message,
        })[0] ?? "",
        /count has a different ICU interface/u,
      );
    });
  }
});

test("locale-aware plural comparison permits locales without a one category", () => {
  assert.deepEqual(
    validateTranslatedCatalog(
      "ja",
      "example",
      { count: "{count, plural, one {# page} other {# pages}}" },
      { count: "{count, plural, other {#ページ}}" },
    ),
    [],
  );
});

test("ICU comparison distinguishes format styles, plural kinds, offsets, and pound usage", () => {
  const pairs = [
    ["{value, number}", "{value, number, percent}"],
    [
      "{count, plural, offset:1 one {one} other {other}}",
      "{count, plural, one {one} other {other}}",
    ],
    [
      "{count, plural, one {# item} other {# items}}",
      "{count, selectordinal, one {#st} other {#th}}",
    ],
    [
      "{count, plural, one {one item} other {# items}}",
      "{count, plural, one {# item} other {# items}}",
    ],
  ] as const;

  for (const [source, target] of pairs) {
    assert.match(
      compareCatalogStructure({ message: source }, { message: target })[0] ??
        "",
      /message has a different ICU interface/u,
      `${source} versus ${target}`,
    );
  }
});

test("ICU comparison allows sibling reordering but preserves tag boundaries", () => {
  assert.deepEqual(
    compareCatalogStructure(
      { message: "Hello {first} {last}" },
      { message: "{last}, {first}, hello" },
    ),
    [],
  );
  assert.deepEqual(
    compareCatalogStructure(
      { message: "<strong>{first}</strong> <link>{last}</link>" },
      { message: "<link>{last}</link> <strong>{first}</strong>" },
    ),
    [],
  );
  assert.match(
    compareCatalogStructure(
      { message: "<strong>{first}</strong> {last}" },
      { message: "<strong>{first} {last}</strong>" },
    )[0] ?? "",
    /message has a different ICU interface/u,
  );
});

test(
  "locale-aware ICU comparison rejects repeated mismatches without permutation blowup",
  { timeout: 1_000 },
  () => {
    const repeated = Array.from({ length: 14 }, () => "{value}").join(" ");
    assert.match(
      validateTranslatedCatalog(
        "es",
        "example",
        { message: `${repeated} {different}` },
        { message: `${repeated} {value}` },
      )[0] ?? "",
      /message has a different ICU interface/u,
    );
  },
);
