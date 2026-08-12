import {
  chineseLocale,
  russianLocale,
  type Locale,
} from "./locale-registry.ts";

export type DagAnnotationFontContract = {
  readonly family: "Caveat" | "Ma Shan Zheng" | "Rock Salt";
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

export function getDagAnnotationFontContract(
  locale: Locale,
): DagAnnotationFontContract {
  if (locale === chineseLocale) return simplifiedChineseFontContract;
  if (locale === russianLocale) return russianFontContract;
  return rockSaltFontContract;
}
