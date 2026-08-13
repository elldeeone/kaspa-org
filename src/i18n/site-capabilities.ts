import { isAiDeploymentEnabled } from "./config.ts";
import type { Locale } from "./locale-registry.ts";
import type { RouteId } from "./manifest.ts";

export type SiteSurfaceId = RouteId | "not-found";

const aiLocaleContracts: Record<SiteSurfaceId, Record<Locale, boolean>> = {
  home: {
    en: true,
    "en-XA": false,
    es: false,
    de: false,
    fr: false,
    "zh-CN": false,
    ru: false,
    "id-ID": false,
  },
  lore: {
    en: true,
    "en-XA": false,
    es: false,
    de: false,
    fr: false,
    "zh-CN": false,
    ru: false,
    "id-ID": false,
  },
  build: {
    en: true,
    "en-XA": false,
    es: false,
    de: false,
    fr: false,
    "zh-CN": false,
    ru: false,
    "id-ID": false,
  },
  assets: {
    en: false,
    "en-XA": false,
    es: false,
    de: false,
    fr: false,
    "zh-CN": false,
    ru: false,
    "id-ID": false,
  },
  hodl: {
    en: true,
    "en-XA": false,
    es: false,
    de: false,
    fr: false,
    "zh-CN": false,
    ru: false,
    "id-ID": false,
  },
  "not-found": {
    en: true,
    "en-XA": false,
    es: false,
    de: false,
    fr: false,
    "zh-CN": false,
    ru: false,
    "id-ID": false,
  },
};

export function isAiAvailable(
  surfaceId: SiteSurfaceId,
  locale: Locale,
): boolean {
  return isAiDeploymentEnabled && aiLocaleContracts[surfaceId][locale];
}

export function hasAiLocaleDecision(
  surfaceId: SiteSurfaceId,
  locale: Locale,
): boolean {
  return typeof aiLocaleContracts[surfaceId][locale] === "boolean";
}

export function getAiLocaleDecision(
  surfaceId: SiteSurfaceId,
  locale: Locale,
): boolean {
  return aiLocaleContracts[surfaceId][locale];
}
