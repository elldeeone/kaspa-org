import type { WalletFilters, WalletOs } from "./types";

export const initialFilters: WalletFilters = { important: [], features: [] };

export const OS_GUIDANCE_GROUPS = [
  {
    id: "mobile",
    os: ["android", "ios"],
    pros: [
      "walletFinder.guidance.mobile.pros.portable",
      "walletFinder.guidance.mobile.pros.qr",
    ],
    cons: [
      "walletFinder.guidance.mobile.cons.marketplaces",
      "walletFinder.guidance.mobile.cons.deviceLoss",
    ],
  },
  {
    id: "desktop",
    os: ["linux", "mac", "windows"],
    pros: [
      "walletFinder.guidance.desktop.pros.control",
      "walletFinder.guidance.desktop.pros.advanced",
    ],
    cons: [
      "walletFinder.guidance.desktop.cons.qr",
      "walletFinder.guidance.desktop.cons.malware",
    ],
  },
  {
    id: "hardware",
    os: ["hardware"],
    pros: [
      "walletFinder.guidance.hardware.pros.secure",
      "walletFinder.guidance.hardware.pros.longTerm",
    ],
    cons: [
      "walletFinder.guidance.hardware.cons.mobile",
      "walletFinder.guidance.hardware.cons.deviceLoss",
    ],
  },
] as const satisfies ReadonlyArray<{
  id: "mobile" | "desktop" | "hardware";
  os: readonly WalletOs[];
  pros: readonly string[];
  cons: readonly string[];
}>;

export const WIZARD_STEP_IDS = [
  "os",
  "experience",
  "criteria",
  "features",
] as const;
