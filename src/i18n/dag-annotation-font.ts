import {
  chineseLocale,
  japaneseLocale,
  koreanLocale,
  russianLocale,
  type Locale,
} from "./locale-registry.ts";

export type DagAnnotationFontContract = {
  readonly family:
    | "Caveat"
    | "Ma Shan Zheng"
    | "Nanum Pen Script"
    | "Rock Salt"
    | "Yomogi";
  readonly filename: string | null;
  readonly fontSize: string;
};

const rockSaltFontContract = Object.freeze({
  family: "Rock Salt",
  filename: null,
  fontSize: "clamp(10px, 1.05vw, 19px)",
}) satisfies DagAnnotationFontContract;

const simplifiedChineseFontContract = Object.freeze({
  family: "Ma Shan Zheng",
  filename: "MaShanZheng-Regular.ttf",
  fontSize: "clamp(13px, 1.4vw, 25px)",
}) satisfies DagAnnotationFontContract;

const russianFontContract = Object.freeze({
  family: "Caveat",
  filename: null,
  fontSize: "clamp(15px, 1.45vw, 26px)",
}) satisfies DagAnnotationFontContract;

const japaneseFontContract = Object.freeze({
  family: "Yomogi",
  filename: "Yomogi-Regular.ttf",
  fontSize: "clamp(13px, 1.35vw, 24px)",
}) satisfies DagAnnotationFontContract;

const koreanFontContract = Object.freeze({
  family: "Nanum Pen Script",
  filename: "NanumPenScript-Regular.ttf",
  fontSize: "clamp(15px, 1.55vw, 28px)",
}) satisfies DagAnnotationFontContract;

export function getDagAnnotationFontContract(
  locale: Locale,
): DagAnnotationFontContract {
  if (locale === chineseLocale) return simplifiedChineseFontContract;
  if (locale === japaneseLocale) return japaneseFontContract;
  if (locale === russianLocale) return russianFontContract;
  if (locale === koreanLocale) return koreanFontContract;
  return rockSaltFontContract;
}
