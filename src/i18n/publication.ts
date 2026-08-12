import type { Locale } from "./locale-registry.ts";
import { getRouteIdForPathname, routeIds, type RouteId } from "./manifest.ts";
import { i18nPublicationProfile } from "./publication-profile.ts";
import type { RoutePublication } from "./publication-profile-contract.ts";

export function getRoutePublication(
  routeId: RouteId,
  locale: Locale,
): RoutePublication | null {
  return i18nPublicationProfile.routePublications[routeId][locale];
}

export function isRoutePublished(routeId: RouteId, locale: Locale): boolean {
  return getRoutePublication(routeId, locale) !== null;
}

export function isRouteDiscoverable(routeId: RouteId, locale: Locale): boolean {
  return getRoutePublication(routeId, locale) === "public";
}

export function getNonHtmlRobotsHeader(
  routeId: RouteId,
  locale: Locale,
  resource: "data" | "image",
): string | null {
  if (getRoutePublication(routeId, locale) !== "preview") return null;
  return resource === "image"
    ? "noindex, nofollow, noimageindex"
    : "noindex, nofollow";
}

export function isLocaleRouteSetComplete(locale: Locale): boolean {
  return routeIds.every((routeId) => isRoutePublished(routeId, locale));
}

export function isPathnamePublished(
  pathname: string,
  locale: Locale,
  resolvePublication: typeof isRoutePublished = isRoutePublished,
): boolean {
  const routeId = getRouteIdForPathname(pathname);
  return routeId ? resolvePublication(routeId, locale) : false;
}
