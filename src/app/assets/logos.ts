// Curated, de-duplicated subset of the official "Kaspa Logo Set 2023".
// Source files live in /public/assets/{svg,png}. Outline variants ship as
// SVG only (no raster exists in the source set).

export type AssetTone = "light" | "dark";

export type LogoAsset = {
  id: string;
  name: string;
  /** Backdrop the preview renders on so knockouts/reverses read correctly. */
  tone: AssetTone;
  svg: string;
  png?: string;
};

export type LogoGroup = {
  id: string;
  title: string;
  /** How wide a single preview should sit within its tile. */
  previewClassName: string;
  assets: LogoAsset[];
};

const svg = (name: string) => `/assets/svg/${name}.svg`;
const png = (name: string) => `/assets/png/${name}.png`;

export const logoGroups: readonly LogoGroup[] = [
  {
    id: "lockup",
    title: "Horizontal",
    previewClassName: "w-[200px] sm:w-[230px]",
    assets: [
      {
        id: "lockup-color",
        name: "Full color",
        tone: "light",
        svg: svg("kaspa-lockup-color"),
        png: png("kaspa-lockup-color"),
      },
      {
        id: "lockup-reverse",
        name: "Reverse",
        tone: "dark",
        svg: svg("kaspa-lockup-reverse"),
        png: png("kaspa-lockup-reverse"),
      },
      {
        id: "lockup-black",
        name: "Black",
        tone: "light",
        svg: svg("kaspa-lockup-black"),
        png: png("kaspa-lockup-black"),
      },
      {
        id: "lockup-white",
        name: "White",
        tone: "dark",
        svg: svg("kaspa-lockup-white"),
        png: png("kaspa-lockup-white"),
      },
      {
        id: "lockup-outline",
        name: "Outline",
        tone: "light",
        svg: svg("kaspa-lockup-outline"),
      },
    ],
  },
  {
    id: "stacked",
    title: "Stacked",
    previewClassName: "w-[140px] sm:w-[156px]",
    assets: [
      {
        id: "stacked-color",
        name: "Full color",
        tone: "light",
        svg: svg("kaspa-stacked-color"),
        png: png("kaspa-stacked-color"),
      },
      {
        id: "stacked-reverse",
        name: "Reverse",
        tone: "dark",
        svg: svg("kaspa-stacked-reverse"),
        png: png("kaspa-stacked-reverse"),
      },
      {
        id: "stacked-black",
        name: "Black",
        tone: "light",
        svg: svg("kaspa-stacked-black"),
        png: png("kaspa-stacked-black"),
      },
      {
        id: "stacked-white",
        name: "White",
        tone: "dark",
        svg: svg("kaspa-stacked-white"),
        png: png("kaspa-stacked-white"),
      },
      {
        id: "stacked-outline",
        name: "Outline",
        tone: "light",
        svg: svg("kaspa-stacked-outline"),
      },
    ],
  },
  {
    id: "icon",
    title: "Icon",
    previewClassName: "w-[104px] sm:w-[116px]",
    assets: [
      {
        id: "icon-green",
        name: "Green",
        tone: "light",
        svg: svg("kaspa-icon-green"),
        png: png("kaspa-icon-green"),
      },
      {
        id: "icon-green-dark",
        name: "Green on dark",
        tone: "dark",
        svg: svg("kaspa-icon-green-dark"),
        png: png("kaspa-icon-green-dark"),
      },
      {
        id: "icon-black",
        name: "Black",
        tone: "light",
        svg: svg("kaspa-icon-black"),
        png: png("kaspa-icon-black"),
      },
      {
        id: "icon-white",
        name: "White",
        tone: "dark",
        svg: svg("kaspa-icon-white"),
        png: png("kaspa-icon-white"),
      },
    ],
  },
] as const;
