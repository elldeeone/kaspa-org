import type { KaspaWalletRecord } from "@/app/hodl/wallet-finder/types";
import type { AppMessages } from "@/i18n/messages";

/*
Add a wallet by adding one object to walletRecords and its English summary to
messages/en/hodl.json under walletFinder.wallets.<wallet-id>.summary.
See docs/wallet-submissions.md for the full submission template.

Required:
- put the icon under public/hodl/wallets/<wallet-id>/icon.<ext>
- list every supported OS in `platforms`
- choose user as "beginner" or "experienced"
- set wallet-level `features` and `check` to the values that apply to every
  platform; use `platformOverrides` only when one platform genuinely differs
- list every acquisition path in `actions`. An action without a `platforms`
  field applies to every platform the wallet supports; use the field to scope
  store listings (App Store, Google Play) or per-OS downloads.

Maintainers validate rating accuracy before merge.
*/
type WalletCatalogId = Extract<
  keyof AppMessages["hodl"]["walletFinder"]["wallets"],
  string
>;

type CatalogBackedWalletRecord = Omit<KaspaWalletRecord, "id"> & {
  id: WalletCatalogId;
};

const walletRecords: CatalogBackedWalletRecord[] = [
  {
    id: "kaspa-cli-wallet",
    title: "CLI Wallet",
    icon: "/hodl/wallets/kaspa-cli-wallet/icon.png",
    user: "experienced",
    platforms: ["windows", "mac", "linux"],
    features: ["multisig"],
    check: {
      control: "good",
      validation: "acceptable",
      transparency: "good",
      fees: "good",
    },
    actions: [
      {
        action: "view_source",
        link: "https://github.com/kaspanet/rusty-kaspa/tree/master/wallet",
      },
    ],
  },
  {
    id: "kaspacom-wallet",
    title: "KaspaCom Wallet",
    icon: "/hodl/wallets/kaspacom-wallet/icon.png",
    user: "beginner",
    platforms: ["windows", "mac", "linux", "ios", "android"],
    features: [],
    check: {
      control: "good",
      validation: "caution",
      transparency: "acceptable",
      fees: "good",
    },
    actions: [
      {
        action: "open",
        link: "https://wallet.kaspa.com/",
      },
      {
        action: "view_source",
        link: "https://github.com/KASPACOM/kaspacom-web-wallet",
      },
    ],
  },
  {
    id: "kaspium",
    title: "Kaspium",
    icon: "/hodl/wallets/kaspium/icon.jpg",
    user: "beginner",
    platforms: ["ios", "android"],
    features: [],
    check: {
      control: "good",
      validation: "acceptable",
      transparency: "good",
      fees: "good",
    },
    actions: [
      {
        action: "app_store",
        link: "https://apps.apple.com/us/app/kaspium/id1671845538",
        platforms: ["ios"],
      },
      {
        action: "google_play",
        link: "https://play.google.com/store/apps/details?id=io.kaspium.kaspiumwallet",
        platforms: ["android"],
      },
      {
        action: "view_source",
        link: "https://github.com/azbuky/kaspium_wallet",
      },
    ],
  },
  {
    id: "kng-desktop",
    title: "Kaspa NG",
    icon: "/hodl/wallets/kng-desktop/icon.png",
    user: "beginner",
    platforms: ["windows", "mac", "linux"],
    features: [],
    check: {
      control: "good",
      validation: "good",
      transparency: "good",
      fees: "good",
    },
    actions: [
      {
        action: "download",
        link: "https://github.com/aspectron/kaspa-ng/releases/",
      },
      {
        action: "view_source",
        link: "https://github.com/aspectron/kaspa-ng/",
      },
    ],
  },
  {
    id: "kng-web",
    title: "Kaspa NG Web",
    icon: "/hodl/wallets/kng-web/icon.png",
    user: "beginner",
    platforms: ["windows", "mac", "linux", "ios", "android"],
    features: [],
    check: {
      control: "good",
      validation: "acceptable",
      transparency: "good",
      fees: "good",
    },
    actions: [
      {
        action: "open",
        link: "https://kaspa-ng.org/",
      },
      {
        action: "view_source",
        link: "https://github.com/aspectron/kaspa-ng/",
      },
    ],
  },
];

export const kaspaWalletRecords = [...walletRecords].sort((walletA, walletB) =>
  walletA.title.localeCompare(walletB.title),
);
