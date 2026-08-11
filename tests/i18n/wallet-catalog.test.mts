import assert from "node:assert/strict";
import test from "node:test";

import spanishWalletSummaries from "../../messages/es/wallets.json" with { type: "json" };
import { validateSpanishCatalogContract } from "../../scripts/i18n/spanish-contract.mts";
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
import { englishMessages, spanishMessages } from "../../src/i18n/messages.ts";
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
});

test("Spanish wallet summaries satisfy the site translation contract", () => {
  const englishWalletSummaries = Object.fromEntries(
    kaspaWallets.map((wallet) => [wallet.id, wallet.summary]),
  );

  assert.deepEqual(
    validateSpanishCatalogContract(
      "wallets",
      englishWalletSummaries,
      spanishWalletSummaries,
    ),
    [],
  );
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
