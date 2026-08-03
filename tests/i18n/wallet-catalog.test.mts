import assert from "node:assert/strict";
import test from "node:test";

import {
  getRatingExplanationKey,
  ratingExplanations,
} from "../../src/app/hodl/wallet-finder/walletMetadata.ts";
import {
  WALLET_CHECK_RATINGS,
  WALLET_CRITERIA_IDS,
} from "../../src/app/hodl/wallet-finder/taxonomy.ts";
import type { WalletCheckRating } from "../../src/app/hodl/wallet-finder/types.ts";
import { kaspaWalletRecords } from "../../src/data/wallets.ts";
import { englishMessages } from "../../src/i18n/messages.ts";

test("the English wallet catalog covers every wallet record exactly", () => {
  assert.deepEqual(
    Object.keys(englishMessages.hodl.walletFinder.wallets).sort(),
    kaspaWalletRecords.map((wallet) => wallet.id).sort(),
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
