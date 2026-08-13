import assert from "node:assert/strict";
import test from "node:test";

import {
  isLanguageSelectorLocale,
  isLanguageSelectorEnabled,
  LANGUAGE_SELECTOR_OPTIONS,
} from "../../src/app/components/language-selector-model.ts";
import {
  brazilianPortugueseLocale,
  chineseLocale,
  defaultLocale,
  frenchLocale,
  germanLocale,
  indonesianLocale,
  japaneseLocale,
  getLocaleDefinition,
  pseudoLocale,
  russianLocale,
  spanishLocale,
} from "../../src/i18n/locale-registry.ts";
import { listSelectableLocales } from "../../src/i18n/config.ts";
import { localizePathname } from "../../src/i18n/pathname.ts";

test("selector options use registry endonyms and exclude the pseudo locale", () => {
  assert.deepEqual(
    LANGUAGE_SELECTOR_OPTIONS.map(({ code, label }) => ({ code, label })),
    listSelectableLocales().map((code) => ({
      code,
      label: getLocaleDefinition(code).label,
    })),
  );
  assert.equal(
    LANGUAGE_SELECTOR_OPTIONS.map(({ code }) => String(code)).includes(
      pseudoLocale,
    ),
    false,
  );
  assert.equal(isLanguageSelectorLocale(defaultLocale), true);
  assert.equal(isLanguageSelectorLocale(spanishLocale), true);
  assert.equal(isLanguageSelectorLocale(germanLocale), true);
  assert.equal(isLanguageSelectorLocale(frenchLocale), true);
  assert.equal(isLanguageSelectorLocale(chineseLocale), true);
  assert.equal(isLanguageSelectorLocale(russianLocale), true);
  assert.equal(isLanguageSelectorLocale(indonesianLocale), true);
  assert.equal(isLanguageSelectorLocale(brazilianPortugueseLocale), true);
  assert.equal(
    LANGUAGE_SELECTOR_OPTIONS.some(
      ({ code }) => code === brazilianPortugueseLocale,
    ),
    listSelectableLocales().includes(brazilianPortugueseLocale),
  );
  assert.equal(
    isLanguageSelectorLocale(japaneseLocale),
    listSelectableLocales().includes(japaneseLocale),
  );
  assert.equal(
    LANGUAGE_SELECTOR_OPTIONS.some(({ code }) => code === chineseLocale),
    listSelectableLocales().includes(chineseLocale),
  );
  assert.equal(
    LANGUAGE_SELECTOR_OPTIONS.some(({ code }) => code === indonesianLocale),
    listSelectableLocales().includes(indonesianLocale),
  );
  assert.equal(isLanguageSelectorLocale("en-XA"), false);
});

test("the selector is enabled only for the complete published locale set", () => {
  assert.equal(isLanguageSelectorEnabled, true);
});

test("locale path fallback preserves slugs and encoded path segments", () => {
  if (!isLanguageSelectorLocale(defaultLocale)) {
    throw new Error("The default locale must be selectable");
  }

  assert.equal(localizePathname("/lore", spanishLocale), "/es/lore");
  assert.equal(localizePathname("/lore", germanLocale), "/de/lore");
  assert.equal(localizePathname("/lore", frenchLocale), "/fr/lore");
  if (isLanguageSelectorLocale(chineseLocale)) {
    assert.equal(localizePathname("/lore", chineseLocale), "/zh-CN/lore");
  }
  if (isLanguageSelectorLocale(russianLocale)) {
    assert.equal(localizePathname("/lore", russianLocale), "/ru/lore");
  }
  if (isLanguageSelectorLocale(indonesianLocale)) {
    assert.equal(localizePathname("/lore", indonesianLocale), "/id-ID/lore");
  }
  if (isLanguageSelectorLocale(brazilianPortugueseLocale)) {
    assert.equal(
      localizePathname("/lore", brazilianPortugueseLocale),
      "/pt-BR/lore",
    );
  }
  if (isLanguageSelectorLocale(japaneseLocale)) {
    assert.equal(localizePathname("/lore", japaneseLocale), "/ja/lore");
  }
  assert.equal(localizePathname("/lore", "en"), "/lore");
  assert.equal(localizePathname("/", spanishLocale), "/es");
  assert.equal(
    localizePathname("/es/missing.txt", spanishLocale),
    "/es/missing.txt",
  );
  assert.equal(localizePathname("/es/lore", defaultLocale), "/lore");
  assert.equal(localizePathname("/%65%73/lore", defaultLocale), "/lore");
  assert.equal(localizePathname("/%65%73/lore", spanishLocale), "/es/lore");
  assert.equal(localizePathname("/es/%256core", defaultLocale), "/%256core");
  assert.equal(localizePathname("/es/%256core", spanishLocale), "/es/%256core");
  assert.equal(
    localizePathname(`/${pseudoLocale}/build`, spanishLocale),
    "/es/build",
  );
});
