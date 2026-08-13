import assert from "node:assert/strict";
import test from "node:test";

import spanishWalletSummaries from "../../messages/es/wallets.json" with { type: "json" };
import germanWalletSummaries from "../../messages/de/wallets.json" with { type: "json" };
import frenchWalletSummaries from "../../messages/fr/wallets.json" with { type: "json" };
import chineseWalletSummaries from "../../messages/zh-CN/wallets.json" with { type: "json" };
import russianWalletSummaries from "../../messages/ru/wallets.json" with { type: "json" };
import indonesianWalletSummaries from "../../messages/id-ID/wallets.json" with { type: "json" };
import brazilianPortugueseWalletSummaries from "../../messages/pt-BR/wallets.json" with { type: "json" };
import japaneseWalletSummaries from "../../messages/ja/wallets.json" with { type: "json" };
import { validateTranslationCatalogContract } from "../../scripts/i18n/translation-contract.mts";
import {
  getRatingExplanationKey,
  ratingExplanations,
} from "../../src/app/hodl/wallet-finder/walletMetadata.ts";
import {
  WALLET_CHECK_RATINGS,
  WALLET_CRITERIA_IDS,
} from "../../src/app/hodl/wallet-finder/taxonomy.ts";
import type { WalletCheckRating } from "../../src/app/hodl/wallet-finder/types.ts";
import { kaspaWallets } from "../../src/data/wallets.ts";
import { supportedLocaleCodes } from "../../src/i18n/locale-registry.ts";
import {
  brazilianPortugueseMessages,
  chineseMessages,
  englishMessages,
  frenchMessages,
  germanMessages,
  indonesianMessages,
  japaneseMessages,
  russianMessages,
  spanishMessages,
} from "../../src/i18n/messages.ts";
import { getLocalizedWallets } from "../../src/i18n/wallets.ts";

test("every supported locale returns the complete canonical wallet set", () => {
  const canonicalIds = kaspaWallets.map((wallet) => wallet.id).sort();

  for (const locale of supportedLocaleCodes) {
    const localizedWallets = getLocalizedWallets(locale);
    assert.deepEqual(
      localizedWallets.map((wallet) => wallet.id).sort(),
      canonicalIds,
      locale,
    );
    assert.ok(
      localizedWallets.every((wallet) => wallet.summary.trim().length > 0),
      locale,
    );
  }
});

test("English records are canonical and pseudo summaries derive from them", () => {
  assert.deepEqual(getLocalizedWallets("en"), kaspaWallets);

  const pseudoWallets = getLocalizedWallets("en-XA");
  for (const [index, wallet] of pseudoWallets.entries()) {
    assert.notEqual(wallet.summary, kaspaWallets[index].summary);
    assert.match(wallet.summary, /^\[!! /u);
  }
});

test("route catalogs do not own wallet records", () => {
  assert.equal("wallets" in englishMessages.hodl.walletFinder, false);
  assert.equal("wallets" in spanishMessages.hodl.walletFinder, false);
  assert.equal("wallets" in germanMessages.hodl.walletFinder, false);
  assert.equal("wallets" in frenchMessages.hodl.walletFinder, false);
  assert.equal("wallets" in chineseMessages.hodl.walletFinder, false);
  assert.equal("wallets" in russianMessages.hodl.walletFinder, false);
  assert.equal("wallets" in indonesianMessages.hodl.walletFinder, false);
  assert.equal(
    "wallets" in brazilianPortugueseMessages.hodl.walletFinder,
    false,
  );
  assert.equal("wallets" in japaneseMessages.hodl.walletFinder, false);
});

test("translated wallet summaries satisfy the shared translation contract", () => {
  const englishWalletSummaries = Object.fromEntries(
    kaspaWallets.map((wallet) => [wallet.id, wallet.summary]),
  );

  for (const [locale, summaries] of Object.entries({
    es: spanishWalletSummaries,
    de: germanWalletSummaries,
    fr: frenchWalletSummaries,
    "zh-CN": chineseWalletSummaries,
    ru: russianWalletSummaries,
    "id-ID": indonesianWalletSummaries,
    "pt-BR": brazilianPortugueseWalletSummaries,
    ja: japaneseWalletSummaries,
  })) {
    assert.deepEqual(
      Object.keys(summaries).sort(),
      Object.keys(englishWalletSummaries).sort(),
    );
    assert.deepEqual(
      validateTranslationCatalogContract(
        locale,
        "wallets",
        englishWalletSummaries,
        summaries,
      ),
      [],
      locale,
    );
  }
});

test("every validator-approved rating resolves through the explanation map", () => {
  const explanationCatalog =
    englishMessages.hodl.walletFinder.ratings.explanations;

  for (const criterion of WALLET_CRITERIA_IDS) {
    const approvedRatings = ratingExplanations[criterion] as Partial<
      Record<WalletCheckRating, string>
    >;

    for (const rating of WALLET_CHECK_RATINGS) {
      const key = getRatingExplanationKey(criterion, rating);
      assert.equal(key, approvedRatings[rating]);

      if (key) {
        const catalogKey = key.split(".").at(-1) as WalletCheckRating;
        const criterionCatalog = explanationCatalog[criterion] as Partial<
          Record<WalletCheckRating, string>
        >;
        assert.equal(typeof criterionCatalog[catalogKey], "string");
      }
    }
  }
});
