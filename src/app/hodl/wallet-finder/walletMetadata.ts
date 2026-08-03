import type { WalletCheckRating, WalletCriterion } from "./types";
import { WALLET_CRITERIA_IDS, WALLET_FEATURE_IDS } from "./taxonomy.ts";

export const walletCriteria = WALLET_CRITERIA_IDS.map((id) => ({ id }));

export const ratingExplanations = {
  control: {
    good: "walletFinder.ratings.explanations.control.good",
    caution: "walletFinder.ratings.explanations.control.caution",
  },
  validation: {
    good: "walletFinder.ratings.explanations.validation.good",
    acceptable: "walletFinder.ratings.explanations.validation.acceptable",
    caution: "walletFinder.ratings.explanations.validation.caution",
    not_applicable:
      "walletFinder.ratings.explanations.validation.not_applicable",
  },
  transparency: {
    good: "walletFinder.ratings.explanations.transparency.good",
    acceptable: "walletFinder.ratings.explanations.transparency.acceptable",
    caution: "walletFinder.ratings.explanations.transparency.caution",
  },
  fees: {
    good: "walletFinder.ratings.explanations.fees.good",
    acceptable: "walletFinder.ratings.explanations.fees.acceptable",
    caution: "walletFinder.ratings.explanations.fees.caution",
  },
} as const satisfies Record<
  WalletCriterion,
  Partial<Record<WalletCheckRating, string>>
>;

export type RatingExplanationKey = {
  [Criterion in keyof typeof ratingExplanations]: (typeof ratingExplanations)[Criterion][keyof (typeof ratingExplanations)[Criterion]];
}[keyof typeof ratingExplanations];

export function getRatingExplanationKey(
  criterion: WalletCriterion,
  rating: WalletCheckRating,
): RatingExplanationKey | undefined {
  const explanations = ratingExplanations[criterion] as Partial<
    Record<WalletCheckRating, RatingExplanationKey>
  >;
  return explanations[rating];
}

export const walletFeatures = WALLET_FEATURE_IDS.map((id) => ({
  id,
  experiencedOnly: id === "multisig",
}));
