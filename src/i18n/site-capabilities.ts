import { isAiDeploymentEnabled } from "./config.ts";
import type { Locale } from "./locale-registry.ts";
import type { RouteId } from "./manifest.ts";

export type SiteSurfaceId = RouteId | "not-found";

const aiLocaleContracts: Record<SiteSurfaceId, Record<Locale, boolean>> = {
  home: { en: true, "en-XA": false, es: false, de: false },
  lore: { en: true, "en-XA": false, es: false, de: false },
  build: { en: true, "en-XA": false, es: false, de: false },
  assets: { en: false, "en-XA": false, es: false, de: false },
  hodl: { en: true, "en-XA": false, es: false, de: false },
  "not-found": { en: true, "en-XA": false, es: false, de: false },
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
