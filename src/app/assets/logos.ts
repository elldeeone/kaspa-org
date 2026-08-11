// Curated, de-duplicated subset of the official "Kaspa Logo Set 2023".
// Source files live in /public/assets/{svg,png}. Outline variants ship as
// SVG only (no raster exists in the source set).

export type AssetTone = "light" | "dark";

export type LogoGroupId = "lockup" | "stacked" | "icon";

export type LogoMessageKey =
  | "lockupColor"
  | "lockupReverse"
  | "lockupBlack"
  | "lockupWhite"
  | "lockupOutline"
  | "stackedColor"
  | "stackedReverse"
  | "stackedBlack"
  | "stackedWhite"
  | "stackedOutline"
  | "iconGreen"
  | "iconGreenDark"
  | "iconBlack"
  | "iconWhite";

export type LogoAsset = {
  id: string;
  messageKey: LogoMessageKey;
  /** Backdrop the preview renders on so knockouts/reverses read correctly. */
  tone: AssetTone;
  svg: string;
  png?: string;
};

export type LogoGroup = {
  id: LogoGroupId;
  /** How wide a single preview should sit within its tile. */
  previewClassName: string;
  assets: LogoAsset[];
};

const svg = (name: string) => `/assets/svg/${name}.svg`;
const png = (name: string) => `/assets/png/${name}.png`;

export const logoGroups: readonly LogoGroup[] = [
  {
    id: "lockup",
    previewClassName: "w-[200px] sm:w-[230px]",
    assets: [
      {
        id: "lockup-color",
        messageKey: "lockupColor",
        tone: "light",
        svg: svg("kaspa-lockup-color"),
        png: png("kaspa-lockup-color"),
      },
      {
        id: "lockup-reverse",
        messageKey: "lockupReverse",
        tone: "dark",
        svg: svg("kaspa-lockup-reverse"),
        png: png("kaspa-lockup-reverse"),
      },
      {
        id: "lockup-black",
        messageKey: "lockupBlack",
        tone: "light",
        svg: svg("kaspa-lockup-black"),
        png: png("kaspa-lockup-black"),
      },
      {
        id: "lockup-white",
        messageKey: "lockupWhite",
        tone: "dark",
        svg: svg("kaspa-lockup-white"),
        png: png("kaspa-lockup-white"),
      },
      {
        id: "lockup-outline",
        messageKey: "lockupOutline",
        tone: "light",
        svg: svg("kaspa-lockup-outline"),
      },
    ],
  },
  {
    id: "stacked",
    previewClassName: "w-[140px] sm:w-[156px]",
    assets: [
      {
        id: "stacked-color",
        messageKey: "stackedColor",
        tone: "light",
        svg: svg("kaspa-stacked-color"),
        png: png("kaspa-stacked-color"),
      },
      {
        id: "stacked-reverse",
        messageKey: "stackedReverse",
        tone: "dark",
        svg: svg("kaspa-stacked-reverse"),
        png: png("kaspa-stacked-reverse"),
      },
      {
        id: "stacked-black",
        messageKey: "stackedBlack",
        tone: "light",
        svg: svg("kaspa-stacked-black"),
        png: png("kaspa-stacked-black"),
      },
      {
        id: "stacked-white",
        messageKey: "stackedWhite",
        tone: "dark",
        svg: svg("kaspa-stacked-white"),
        png: png("kaspa-stacked-white"),
      },
      {
        id: "stacked-outline",
        messageKey: "stackedOutline",
        tone: "light",
        svg: svg("kaspa-stacked-outline"),
      },
    ],
  },
  {
    id: "icon",
    previewClassName: "w-[104px] sm:w-[116px]",
    assets: [
      {
        id: "icon-green",
        messageKey: "iconGreen",
        tone: "light",
        svg: svg("kaspa-icon-green"),
        png: png("kaspa-icon-green"),
      },
      {
        id: "icon-green-dark",
        messageKey: "iconGreenDark",
        tone: "dark",
        svg: svg("kaspa-icon-green-dark"),
        png: png("kaspa-icon-green-dark"),
      },
      {
        id: "icon-black",
        messageKey: "iconBlack",
        tone: "light",
        svg: svg("kaspa-icon-black"),
        png: png("kaspa-icon-black"),
      },
      {
        id: "icon-white",
        messageKey: "iconWhite",
        tone: "dark",
        svg: svg("kaspa-icon-white"),
        png: png("kaspa-icon-white"),
      },
    ],
  },
] as const;
