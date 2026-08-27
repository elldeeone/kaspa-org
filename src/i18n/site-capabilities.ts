import { isAiDeploymentEnabled } from "./config.ts";
import type { Locale } from "./locale-registry.ts";
import type { RouteId } from "./manifest.ts";

export type SiteSurfaceId = RouteId | "not-found";

const aiLocaleContracts: Record<SiteSurfaceId, Record<Locale, boolean>> = {
  home: { en: true, es: false },
  lore: { en: true, es: false },
  build: { en: true, es: false },
  assets: { en: false, es: false },
  hodl: { en: true, es: false },
  "not-found": { en: true, es: false },
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
