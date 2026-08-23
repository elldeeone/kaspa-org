import type {
  WalletCheckRating,
  WalletCriterion,
  WalletDisplayRating,
  WalletEntryAction,
  WalletFeature,
  WalletOs,
  WalletUserType,
} from "./taxonomy";

export type {
  WalletCheckRating,
  WalletCriterion,
  WalletDisplayRating,
  WalletEntryAction,
  WalletFeature,
  WalletOs,
  WalletUserType,
};

export type NonEmptyArray<T> = [T, ...T[]];

export type WalletCheck = Record<WalletCriterion, WalletCheckRating>;

export type WalletRatingBreakdownItem = {
  rating: WalletCheckRating;
  platforms: NonEmptyArray<WalletOs>;
};

export type WalletPlatformOverride = {
  features?: WalletFeature[];
  check?: Partial<WalletCheck>;
};

export type WalletUsagePath = {
  platforms: NonEmptyArray<WalletOs>;
};

export type WalletAction = {
  action: WalletEntryAction;
  link: string;
  platforms?: NonEmptyArray<WalletOs>;
};

export type WalletReview = {
  submitter: string;
  submission: string;
};

type WalletDetails = {
  id: string;
  title: string;
  icon: string;
  user: WalletUserType;
  summary: string;
  review?: WalletReview;

  features: WalletFeature[];
  check: WalletCheck;
  platformOverrides?: Partial<Record<WalletOs, WalletPlatformOverride>>;
  actions: NonEmptyArray<WalletAction>;
};

type WalletAvailability =
  | {
      platforms: NonEmptyArray<WalletOs>;
      paths?: never;
    }
  | {
      platforms?: never;
      paths: NonEmptyArray<WalletUsagePath>;
    };

export type KaspaWallet = WalletDetails & WalletAvailability;

export type WalletFilters = {
  os?: WalletOs;
  user?: WalletUserType;
  important: WalletCriterion[];
  features: WalletFeature[];
};
