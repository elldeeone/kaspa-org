import {
  aggregateWalletRatings,
  isPositiveWalletRating,
  WALLET_CRITERIA_IDS,
} from "./taxonomy.ts";
import type {
  KaspaWallet,
  NonEmptyArray,
  WalletAction,
  WalletCheck,
  WalletCheckRating,
  WalletCriterion,
  WalletDisplayRating,
  WalletFeature,
  WalletFilters,
  WalletOs,
  WalletRatingBreakdownItem,
  WalletUsagePath,
} from "./types";

export type WalletPresentation = {
  ratings: Record<WalletCriterion, WalletDisplayRating>;
  breakdowns: Record<WalletCriterion, WalletRatingBreakdownItem[]>;
};

export type WalletMatch = {
  wallet: KaspaWallet;
  paths: WalletUsagePath[];
  platforms: WalletOs[];
  features: WalletFeature[];
  actions: WalletAction[];
  presentation: WalletPresentation;
};

export type WalletFinderModel = {
  matches: WalletMatch[];
  totalWallets: number;
  isCriterionDisabled: (criterion: WalletCriterion) => boolean;
  isFeatureDisabled: (feature: WalletFeature) => boolean;
};

function effectiveCheck(wallet: KaspaWallet, platform: WalletOs): WalletCheck {
  const override = wallet.platformOverrides?.[platform]?.check;
  return override ? { ...wallet.check, ...override } : wallet.check;
}

function effectiveFeatures(wallet: KaspaWallet, platform: WalletOs) {
  return wallet.platformOverrides?.[platform]?.features ?? wallet.features;
}

function walletPaths(wallet: KaspaWallet): WalletUsagePath[] {
  return (
    wallet.paths ??
    wallet.platforms?.map((platform) => ({ platforms: [platform] })) ??
    []
  );
}

function uniquePlatforms(paths: readonly WalletUsagePath[]) {
  return Array.from(new Set(paths.flatMap((path) => path.platforms)));
}

function assessWallet(wallet: KaspaWallet, platforms: readonly WalletOs[]) {
  const criterionRatings = Object.fromEntries(
    WALLET_CRITERIA_IDS.map((criterion) => [
      criterion,
      platforms.map((platform) => effectiveCheck(wallet, platform)[criterion]),
    ]),
  ) as Record<WalletCriterion, WalletCheckRating[]>;

  const ratings = Object.fromEntries(
    WALLET_CRITERIA_IDS.map((criterion) => [
      criterion,
      aggregateWalletRatings(
        criterionRatings[criterion],
        wallet.check[criterion],
      ),
    ]),
  ) as WalletPresentation["ratings"];

  const breakdowns = Object.fromEntries(
    WALLET_CRITERIA_IDS.map((criterion) => {
      const grouped = new Map<WalletCheckRating, WalletOs[]>();
      for (const platform of platforms) {
        const rating = effectiveCheck(wallet, platform)[criterion];
        const group = grouped.get(rating);
        if (group) group.push(platform);
        else grouped.set(rating, [platform]);
      }

      return [
        criterion,
        grouped.size < 2
          ? []
          : Array.from(grouped, ([rating, group]) => ({
              rating,
              platforms: group as NonEmptyArray<WalletOs>,
            })),
      ];
    }),
  ) as WalletPresentation["breakdowns"];

  return {
    presentation: { ratings, breakdowns },
    supports: (criteria: readonly WalletCriterion[]) =>
      criteria.every((criterion) => {
        const applicable = criterionRatings[criterion].filter(
          (rating) => rating !== "not_applicable",
        );
        return (
          applicable.length > 0 && applicable.every(isPositiveWalletRating)
        );
      }),
  };
}

function pathSupportsFeatures(
  wallet: KaspaWallet,
  path: WalletUsagePath,
  features: readonly WalletFeature[],
) {
  return features.every((feature) =>
    path.platforms.some((platform) =>
      effectiveFeatures(wallet, platform).includes(feature),
    ),
  );
}

function getMatches(wallets: KaspaWallet[], filters: WalletFilters) {
  return wallets
    .flatMap<WalletMatch>((wallet) => {
      if (filters.user === "beginner" && wallet.user !== "beginner") return [];

      const paths = walletPaths(wallet).filter(
        (path) =>
          (!filters.os || path.platforms.includes(filters.os)) &&
          (!filters.important.length ||
            assessWallet(wallet, path.platforms).supports(filters.important)) &&
          (!filters.features.length ||
            pathSupportsFeatures(wallet, path, filters.features)),
      );
      if (!paths.length) return [];

      const platforms = uniquePlatforms(paths);
      const features = Array.from(
        new Set(
          platforms.flatMap((platform) => effectiveFeatures(wallet, platform)),
        ),
      );
      const actions = wallet.actions.filter(
        (action) =>
          !action.platforms ||
          action.platforms.some((platform) => platforms.includes(platform)),
      );

      return [
        {
          wallet,
          paths,
          platforms,
          features,
          actions,
          presentation: assessWallet(wallet, platforms).presentation,
        },
      ];
    })
    .sort((a, b) => a.wallet.title.localeCompare(b.wallet.title));
}

function hasMatchesWithFilter(
  wallets: KaspaWallet[],
  filters: WalletFilters,
  patch: Partial<WalletFilters>,
) {
  return getMatches(wallets, { ...filters, ...patch }).length > 0;
}

export function createWalletFinderModel(
  wallets: KaspaWallet[],
  filters: WalletFilters,
): WalletFinderModel {
  return {
    matches: getMatches(wallets, filters),
    totalWallets: wallets.length,
    isCriterionDisabled: (criterion) =>
      !filters.important.includes(criterion) &&
      !hasMatchesWithFilter(wallets, filters, {
        important: [...filters.important, criterion],
      }),
    isFeatureDisabled: (feature) =>
      !filters.features.includes(feature) &&
      !hasMatchesWithFilter(wallets, filters, {
        features: [...filters.features, feature],
      }),
  };
}
