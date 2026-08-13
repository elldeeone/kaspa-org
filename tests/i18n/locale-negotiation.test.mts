import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCALE_COOKIE_NAME,
  sanitizeAcceptLanguage,
  sanitizeLocaleCookie,
  serializeLocalePreferenceCookie,
} from "../../src/i18n/locale-negotiation.ts";
import {
  defaultLocale,
  pseudoLocale,
  type Locale,
} from "../../src/i18n/locale-registry.ts";

const detectableLocales = [
  defaultLocale,
  "es",
  "de",
  "fr",
  "zh-CN",
  "ru",
  "id-ID",
  "pt-BR",
  "ja",
  "ko",
] as const satisfies readonly Locale[];

test("locale negotiation keeps ordinary and Simplified Chinese preferences", () => {
  assert.equal(
    sanitizeAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8", detectableLocales),
    "fr-FR,fr;q=0.9,en;q=0.8",
  );
  assert.equal(
    sanitizeAcceptLanguage("zh-SG,zh;q=0.9,en;q=0.8", detectableLocales),
    "zh-SG,zh;q=0.9,en;q=0.8",
  );
});

test("locale negotiation does not map Traditional Chinese to Simplified Chinese", () => {
  assert.equal(
    sanitizeAcceptLanguage("zh-TW,zh;q=0.9,en;q=0.8", detectableLocales),
    "en;q=0.8",
  );
  assert.equal(
    sanitizeAcceptLanguage("zh-Hant-HK,zh;q=0.9,ja;q=0.8", detectableLocales),
    "ja;q=0.8",
  );
  assert.equal(
    sanitizeAcceptLanguage(
      "zh-TW,zh;q=0.9,zh-CN;q=0.7,en;q=0.6",
      detectableLocales,
    ),
    "zh-CN;q=0.7,en;q=0.6",
  );
});

test("test-only locale preferences cannot enter automatic negotiation", () => {
  assert.equal(
    sanitizeAcceptLanguage(`${pseudoLocale},en;q=0.9`, detectableLocales),
    "en;q=0.9",
  );
  assert.equal(sanitizeAcceptLanguage(pseudoLocale, detectableLocales), null);
  assert.equal(
    sanitizeLocaleCookie(
      `session=abc; ${LOCALE_COOKIE_NAME}=${pseudoLocale}; theme=dark`,
      detectableLocales,
    ),
    "session=abc; theme=dark",
  );
  assert.equal(
    sanitizeLocaleCookie(
      `session=abc; ${LOCALE_COOKIE_NAME}=fr; theme=dark`,
      detectableLocales,
    ),
    `session=abc; ${LOCALE_COOKIE_NAME}=fr; theme=dark`,
  );
});

test("manual language choices use the next-intl session preference cookie", () => {
  assert.equal(LOCALE_COOKIE_NAME, "NEXT_LOCALE");
  assert.equal(
    serializeLocalePreferenceCookie("fr"),
    "NEXT_LOCALE=fr; Path=/; SameSite=Lax",
  );
  assert.equal(
    serializeLocalePreferenceCookie(defaultLocale),
    "NEXT_LOCALE=en; Path=/; SameSite=Lax",
  );
});
