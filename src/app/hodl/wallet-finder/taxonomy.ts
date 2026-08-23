export const WALLET_OS_IDS = [
  "android",
  "ios",
  "windows",
  "mac",
  "linux",
  "hardware",
] as const;

export const WALLET_USER_TYPES = ["beginner", "experienced"] as const;

export const WALLET_CHECK_RATINGS = [
  "good",
  "acceptable",
  "caution",
  "not_applicable",
] as const;

const WALLET_APPLICABLE_RATINGS = ["good", "acceptable", "caution"] as const;

export const WALLET_DISPLAY_RATINGS = [
  "good",
  "acceptable",
  "mixed",
  "caution",
  "not_applicable",
] as const;

export const WALLET_CRITERIA_IDS = [
  "control",
  "validation",
  "transparency",
  "fees",
] as const;

export const WALLET_FEATURE_IDS = [
  "two_fa",
  "hardware_wallet",
  "multisig",
] as const;

export const WALLET_ACTION_IDS = [
  "app_store",
  "google_play",
  "download",
  "open",
  "view_source",
] as const;

export const ACTION_IMPLIED_OS = {
  app_store: "ios",
  google_play: "android",
} as const satisfies Partial<Record<WalletEntryAction, WalletOs>>;

export type WalletOs = (typeof WALLET_OS_IDS)[number];
export type WalletUserType = (typeof WALLET_USER_TYPES)[number];
export type WalletCheckRating = (typeof WALLET_CHECK_RATINGS)[number];
export type WalletDisplayRating = (typeof WALLET_DISPLAY_RATINGS)[number];
export type WalletCriterion = (typeof WALLET_CRITERIA_IDS)[number];
export type WalletFeature = (typeof WALLET_FEATURE_IDS)[number];
export type WalletEntryAction = (typeof WALLET_ACTION_IDS)[number];

export const WALLET_RATINGS_BY_CRITERION = {
  control: ["good", "caution"],
  validation: WALLET_CHECK_RATINGS,
  transparency: WALLET_APPLICABLE_RATINGS,
  fees: WALLET_APPLICABLE_RATINGS,
} as const satisfies Record<WalletCriterion, readonly WalletCheckRating[]>;

export function isPositiveWalletRating(rating: WalletCheckRating): boolean {
  return rating === "good" || rating === "acceptable";
}

export function aggregateWalletRatings(
  ratings: readonly WalletCheckRating[],
  fallback: WalletCheckRating,
): WalletDisplayRating {
  const applicableRatings = new Set(ratings);
  applicableRatings.delete("not_applicable");

  if (applicableRatings.size === 0)
    return ratings.length > 0 ? "not_applicable" : fallback;

  return applicableRatings.size > 1 ? "mixed" : [...applicableRatings][0];
}
