import type { KaspaWallet } from "@/app/hodl/wallet-finder/types";

/*
Add a wallet by adding one complete English object to walletRecords.
See docs/wallet-submissions.md for the full submission template.

Required:
- put the icon under public/hodl/wallets/<wallet-id>/icon.<ext>
- list supported OSs in `platforms`, or use `paths` when components must be
  used together
- choose user as "beginner" or "experienced"
- set wallet-level `features` and `check` defaults; use `platformOverrides` only
  for genuine platform differences (`hardware` represents device firmware when
  rating transparency)
- list every acquisition path in `actions`. An action without a `platforms`
  field applies to every platform the wallet supports; use the field to scope
  store listings (App Store, Google Play) or per-OS downloads.

Maintainers validate rating accuracy before merge.
*/
type WithoutId<Wallet> = Wallet extends unknown ? Omit<Wallet, "id"> : never;
type WalletWithId<Id extends string> = WithoutId<KaspaWallet> & { id: Id };

function defineWallet<const Id extends string>(
  wallet: WalletWithId<Id>,
): WalletWithId<Id> {
  return wallet;
}

const walletRecords = [
  defineWallet({
    id: "kaspa-cli-wallet",
    title: "CLI Wallet",
    icon: "/hodl/wallets/kaspa-cli-wallet/icon.png",
    user: "experienced",
    summary:
      "Command-line wallet tooling for users comfortable managing keys and transactions from a terminal.",
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
  }),
  defineWallet({
    id: "kaspacom-wallet",
    title: "KaspaCom Wallet",
    icon: "/hodl/wallets/kaspacom-wallet/icon.png",
    user: "beginner",
    summary:
      "A browser-based KaspaCom wallet for creating, importing, and using self-custodial Kaspa wallets.",
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
  }),
  defineWallet({
    id: "kaspium",
    title: "Kaspium",
    icon: "/hodl/wallets/kaspium/icon.jpg",
    user: "beginner",
    summary:
      "A self-custodial mobile wallet for sending, receiving, and holding KAS from a phone.",
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
  }),
  defineWallet({
    id: "kng-desktop",
    title: "Kaspa NG",
    icon: "/hodl/wallets/kng-desktop/icon.png",
    user: "beginner",
    summary:
      "A modern Kaspa desktop wallet with a friendly default UI, optional full-node operation, and deep configuration for advanced use.",
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
  }),
  defineWallet({
    id: "kng-web",
    title: "Kaspa NG Web",
    icon: "/hodl/wallets/kng-web/icon.png",
    user: "beginner",
    summary:
      "The browser-based version of Kaspa NG. Friendly by default, no installation needed, with optional advanced configuration.",
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
  }),
];

export type WalletId = (typeof walletRecords)[number]["id"];

export const kaspaWallets: Array<KaspaWallet & { id: WalletId }> = [
  ...walletRecords,
].sort((walletA, walletB) => walletA.title.localeCompare(walletB.title));
