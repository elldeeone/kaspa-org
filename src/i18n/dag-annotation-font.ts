import {
  chineseLocale,
  russianLocale,
  type Locale,
} from "./locale-registry.ts";

export type DagAnnotationFontContract = {
  readonly family: "Caveat" | "Ma Shan Zheng" | "Rock Salt";
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

export function getDagAnnotationFontContract(
  locale: Locale,
): DagAnnotationFontContract {
  if (locale === chineseLocale) return simplifiedChineseFontContract;
  if (locale === russianLocale) return russianFontContract;
  return rockSaltFontContract;
}
