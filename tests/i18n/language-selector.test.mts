import assert from "node:assert/strict";
import test from "node:test";

import {
  isLanguageSelectorLocale,
  isLanguageSelectorEnabled,
  LANGUAGE_SELECTOR_OPTIONS,
} from "../../src/app/components/language-selector-model.ts";
import {
  defaultLocale,
  germanLocale,
  pseudoLocale,
  spanishLocale,
} from "../../src/i18n/locale-registry.ts";
import { i18nBuildTarget } from "../../src/i18n/config.ts";
import { localizePathname } from "../../src/i18n/pathname.ts";

test("selector options use registry endonyms and exclude the pseudo locale", () => {
  assert.deepEqual(
    LANGUAGE_SELECTOR_OPTIONS.map(({ code, label }) => ({ code, label })),
    i18nBuildTarget === "production"
      ? [
          { code: defaultLocale, label: "English" },
          { code: spanishLocale, label: "Español" },
        ]
      : [
          { code: defaultLocale, label: "English" },
          { code: spanishLocale, label: "Español" },
          { code: germanLocale, label: "Deutsch" },
        ],
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
