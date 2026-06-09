import type { ComponentType } from "react";

import type { PageSectionLink } from "../components/page-sections/types";
import {
  AddressBookIcon,
  BiometricIcon,
  CopyIcon,
  PaperPlaneIcon,
  QrCodeIcon,
  ShieldKeyIcon,
  VaultIcon,
} from "./icons";
export { exchanges } from "./exchanges";

export const ACCENT = "var(--accent)";
export const accentAlpha = (pct: number) =>
  `color-mix(in srgb, var(--accent) ${pct * 100}%, transparent)`;
export const KASPIUM_SCREENSHOT_SRC = "/hodl/kaspium-wallet.webp";
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/kaspium/id1671845538";
export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=io.kaspium.kaspiumwallet";

export type UseSectionId = "start" | "wallet" | "buy" | "transfer" | "help";

type IconComponent = ComponentType;

export type WalletFeature = {
  icon: IconComponent;
  label: string;
  desc: string;
};

export type TransferStep = {
  step: string;
  title: string;
  desc: string;
  icon: IconComponent;
};

export const sectionLinks: PageSectionLink<UseSectionId>[] = [
  {
    id: "wallet",
    label: "1. Get a wallet",
    compactLabel: "Wallet",
    href: "#wallet",
    description: "Set up a wallet to hold your KAS.",
  },
  {
    id: "buy",
    label: "2. Buy KAS",
    compactLabel: "Buy",
    href: "#buy",
    description: "Find KAS on major exchanges.",
  },
  {
    id: "transfer",
    label: "3. Move to wallet",
    compactLabel: "Transfer",
    href: "#transfer",
    description: "Send KAS from the exchange to your wallet.",
  },
  {
    id: "help",
    label: "Help",
    compactLabel: "Help",
    href: "#help",
    description: "Community help and explorer tools.",
  },
];

export const mobileSectionLinks: PageSectionLink<UseSectionId>[] = sectionLinks;

export const walletFeatures: WalletFeature[] = [
  {
    icon: ShieldKeyIcon,
    label: "You control it",
    desc: "Your wallet, your recovery phrase. No one else has access.",
  },
  {
    icon: QrCodeIcon,
    label: "QR payments",
    desc: "Receive or send from your phone in a few taps.",
  },
  {
    icon: BiometricIcon,
    label: "Biometric unlock",
    desc: "Open the app quickly without giving up security.",
  },
  {
    icon: AddressBookIcon,
    label: "Address book",
    desc: "Save addresses you use often.",
  },
];

export const transferSteps: TransferStep[] = [
  {
    step: "01",
    title: "Get your receive address",
    desc: "Open your Kaspium app, tap 'Receive', and copy your unique address.",
    icon: CopyIcon,
  },
  {
    step: "02",
    title: "Send a test transaction",
    desc: "Withdraw a tiny fraction of KAS from the exchange to verify the route is correct.",
    icon: PaperPlaneIcon,
  },
  {
    step: "03",
    title: "Transfer the balance",
    desc: "Once the test transaction arrives safely in your wallet, withdraw the remaining balance.",
    icon: VaultIcon,
  },
];

export const helpPrompts = [
  "How do I back up my wallet?",
  "Where can I buy KAS?",
  "How do I buy KAS for the first time?",
  "Should I leave my KAS on the exchange?",
  "How do I send KAS from an exchange to my wallet?",
  "What fees should I expect when buying or moving KAS?",
  "What is a recovery phrase?",
  "What's the difference between a wallet and an exchange?",
  "How do I receive KAS from someone else?",
  "Can I have more than one Kaspa wallet?",
  "What is Kaspa's max supply?",
];
