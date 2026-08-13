import { koreanLocale, type Locale } from "./locale-registry.ts";

export type BodyFontContract = {
  readonly family: "Geist" | "Noto Sans KR";
  readonly filename: string | null;
};

const geistBodyFontContract = Object.freeze({
  family: "Geist",
  filename: null,
}) satisfies BodyFontContract;

const koreanBodyFontContract = Object.freeze({
  family: "Noto Sans KR",
  filename: "NotoSansKR-Body.ttf",
}) satisfies BodyFontContract;

export function getBodyFontContract(locale: Locale): BodyFontContract {
  return locale === koreanLocale
    ? koreanBodyFontContract
    : geistBodyFontContract;
}
