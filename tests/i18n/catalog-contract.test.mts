import assert from "node:assert/strict";
import test from "node:test";

import {
  compareCatalogs,
  flattenCatalog,
  getIcuInterfaceSignature,
  validateCatalogSource,
} from "../../scripts/i18n/catalog-contract.mts";

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
    {
      name: "invalid ICU",
      source: '{"title":"Hello {name"}',
      issue: "title has invalid ICU syntax",
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

test("catalog comparison enforces exact keys and ICU interfaces", async (t) => {
  const source = {
    greeting: "Hello {name}",
    rich: "Read <link>{count, plural, one {# page} other {# pages}}</link>",
  };

  assert.deepEqual(
    compareCatalogs(source, {
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
      const errors = compareCatalogs(source, fixture.target);
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
    compareCatalogs(source, russian, { targetLocale: "ru" }),
    [],
  );
  assert.match(
    compareCatalogs(source, russian)[0] ?? "",
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
        compareCatalogs(
          source,
          { count: fixture.message },
          {
            targetLocale: "ru",
          },
        )[0] ?? "",
        /count has a different ICU interface/u,
      );
    });
  }
});

test("catalog validation rejects a plural without an other branch", () => {
  const result = validateCatalogSource(
    JSON.stringify({ count: "{count, plural, one {# page}}" }),
    "messages/ru/example.json",
  );

  assert.ok(
    result.errors.some((error) => error.includes("has invalid ICU syntax")),
    result.errors.join("\n"),
  );
});

test("locale-aware plural comparison permits locales without a one category", () => {
  assert.deepEqual(
    compareCatalogs(
      { count: "{count, plural, one {# page} other {# pages}}" },
      { count: "{count, plural, other {#ページ}}" },
      { targetLocale: "ja" },
    ),
    [],
  );
});

test("ICU signatures distinguish format styles, plural kinds, offsets, and pound usage", () => {
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
    assert.notEqual(
      getIcuInterfaceSignature(source),
      getIcuInterfaceSignature(target),
      `${source} versus ${target}`,
    );
  }
});

test("ICU signatures allow sibling reordering but preserve tag boundaries", () => {
  assert.equal(
    getIcuInterfaceSignature("Hello {first} {last}"),
    getIcuInterfaceSignature("{last}, {first}, hello"),
  );
  assert.equal(
    getIcuInterfaceSignature("<strong>{first}</strong> <link>{last}</link>"),
    getIcuInterfaceSignature("<link>{last}</link> <strong>{first}</strong>"),
  );
  assert.notEqual(
    getIcuInterfaceSignature("<strong>{first}</strong> {last}"),
    getIcuInterfaceSignature("<strong>{first} {last}</strong>"),
  );
});
