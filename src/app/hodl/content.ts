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
