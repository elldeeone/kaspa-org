import {
  chineseLocale,
  japaneseLocale,
  russianLocale,
  type Locale,
} from "./locale-registry.ts";

export type DagAnnotationFontContract = {
  readonly family: "Caveat" | "Ma Shan Zheng" | "Rock Salt" | "Yomogi";
  readonly coveredCharacters?: string;
  readonly fontSize: string;
};

const rockSaltFontContract = Object.freeze({
  family: "Rock Salt",
  fontSize: "clamp(10px, 1.05vw, 19px)",
}) satisfies DagAnnotationFontContract;

const simplifiedChineseFontContract = Object.freeze({
  family: "Ma Shan Zheng",
  coveredCharacters: "实时 pow",
  fontSize: "clamp(13px, 1.4vw, 25px)",
}) satisfies DagAnnotationFontContract;

const russianFontContract = Object.freeze({
  family: "Caveat",
  fontSize: "clamp(12px, 1.2vw, 21px)",
}) satisfies DagAnnotationFontContract;

const japaneseFontContract = Object.freeze({
  family: "Yomogi",
  coveredCharacters: "リアルタイムの pow",
  fontSize: "clamp(13px, 1.35vw, 24px)",
}) satisfies DagAnnotationFontContract;

export function getDagAnnotationFontContract(
  locale: Locale,
): DagAnnotationFontContract {
  if (locale === chineseLocale) return simplifiedChineseFontContract;
  if (locale === japaneseLocale) return japaneseFontContract;
  if (locale === russianLocale) return russianFontContract;
  return rockSaltFontContract;
}
