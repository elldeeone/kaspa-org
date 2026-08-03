import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLanguageHref,
  createLanguageSelectorOptions,
  isLanguageSelectorLocale,
  shouldShowLanguageSelector,
} from "../../src/app/components/languageSelector.ts";
import {
  defaultLocale,
  pseudoLocale,
  spanishLocale,
  supportedLocaleCodes,
} from "../../src/i18n/config.ts";

test("selector options use registry endonyms and exclude the pseudo locale", () => {
  const options = createLanguageSelectorOptions(supportedLocaleCodes);
  assert.deepEqual(
    options.map(({ code, label }) => ({ code, label })),
    [
      { code: defaultLocale, label: "English" },
      { code: spanishLocale, label: "Español" },
    ],
  );
  assert.equal(
    options.map(({ code }) => String(code)).includes(pseudoLocale),
    false,
  );
  assert.equal(isLanguageSelectorLocale(defaultLocale), true);
  assert.equal(isLanguageSelectorLocale(spanishLocale), true);
  assert.equal(isLanguageSelectorLocale("en-XA"), false);
});

test("the selector renders only for multiple complete registry options", () => {
  const options = createLanguageSelectorOptions(supportedLocaleCodes);
  assert.equal(
    shouldShowLanguageSelector(options, () => true),
    true,
  );
  assert.equal(
    shouldShowLanguageSelector(options.slice(0, 1), () => true),
    false,
  );
  assert.equal(
    shouldShowLanguageSelector(options, (locale) => locale === defaultLocale),
    false,
  );
});

test("language links preserve fixed slugs, query strings, and hashes", () => {
  if (!isLanguageSelectorLocale(defaultLocale)) {
    throw new Error("The default locale must be selectable");
  }

  assert.equal(
    buildLanguageHref("/lore", spanishLocale, "?source=nav&step=4", "#roadmap"),
    "/es/lore?source=nav&step=4#roadmap",
  );
  assert.equal(
    buildLanguageHref("/lore", "en", "?source=nav&step=4", "#roadmap"),
    "/lore?source=nav&step=4#roadmap",
  );
  assert.equal(
    buildLanguageHref("/", spanishLocale, "?proof=1", "#verify"),
    "/es?proof=1#verify",
  );
  assert.equal(
    buildLanguageHref(
      "/es/missing.txt",
      spanishLocale,
      "?source=nav",
      "#details",
    ),
    "/es/missing.txt?source=nav#details",
  );
  assert.equal(
    buildLanguageHref("/es/lore", defaultLocale, "", "#roadmap"),
    "/lore#roadmap",
  );
  assert.equal(
    buildLanguageHref(`/${pseudoLocale}/build`, spanishLocale, "?tab=rpc", ""),
    "/es/build?tab=rpc",
  );
});
