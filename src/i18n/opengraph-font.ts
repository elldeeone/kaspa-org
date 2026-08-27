import {
  chineseLocale,
  japaneseLocale,
  type Locale,
} from "./locale-registry.ts";

export type OpenGraphFontAsset = {
  readonly filename: string;
  readonly weight: 400 | 700;
};

export type OpenGraphFontContract = {
  readonly family: string;
  readonly assets: readonly OpenGraphFontAsset[];
  readonly coveredCharacters?: string;
};

const geistFontContract = Object.freeze({
  family: "Geist",
  assets: Object.freeze([
    Object.freeze({ filename: "Geist-Regular.ttf", weight: 400 }),
    Object.freeze({ filename: "Geist-Bold.ttf", weight: 700 }),
  ]),
}) satisfies OpenGraphFontContract;

const simplifiedChineseFontContract = Object.freeze({
  family: "Noto Sans SC",
  coveredCharacters: "实时去中心化无需等待的 bitcoin 工作量证明。",
  assets: Object.freeze([
    Object.freeze({ filename: "NotoSansSC-Regular.ttf", weight: 400 }),
    Object.freeze({ filename: "NotoSansSC-Bold.ttf", weight: 700 }),
  ]),
}) satisfies OpenGraphFontContract;

const japaneseFontContract = Object.freeze({
  family: "Noto Sans JP",
  coveredCharacters:
    "リアルタイムの分散化bitcoinのプルーフ・オブ・ワークを、待ち時間なしで。",
  assets: Object.freeze([
    Object.freeze({ filename: "NotoSansJP-Regular.ttf", weight: 400 }),
    Object.freeze({ filename: "NotoSansJP-Bold.ttf", weight: 700 }),
  ]),
}) satisfies OpenGraphFontContract;

export function getOpenGraphFontContract(
  locale: Locale,
): OpenGraphFontContract {
  if (locale === chineseLocale) return simplifiedChineseFontContract;
  if (locale === japaneseLocale) return japaneseFontContract;
  return geistFontContract;
}
