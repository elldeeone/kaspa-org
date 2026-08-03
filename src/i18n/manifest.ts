import { isPseudoLocaleEnabled, type Locale } from "./config.ts";

export const RESERVED_NOT_FOUND_PATHNAME =
  "/__kaspa_i18n_unpublished__/not/found";
export const ROUTE_MISS_HEADER = "x-kaspa-i18n-route-miss";

export const routeIds = ["home", "lore", "build", "assets", "hodl"] as const;
export type RouteId = (typeof routeIds)[number];

export const routeManifest = {
  home: { id: "home", pathname: "/" },
  lore: { id: "lore", pathname: "/lore" },
  build: { id: "build", pathname: "/build" },
  assets: { id: "assets", pathname: "/assets" },
  hodl: { id: "hodl", pathname: "/hodl" },
} as const satisfies Record<
  RouteId,
  { id: RouteId; pathname: `/${string}` | "/" }
>;

export const stablePathnames = routeIds.map(
  (routeId) => routeManifest[routeId].pathname,
);
export type StablePathname = (typeof routeManifest)[RouteId]["pathname"];

export function getRouteIdForPathname(pathname: string): RouteId | null {
  return (
    routeIds.find((routeId) => routeManifest[routeId].pathname === pathname) ??
    null
  );
}

export type RoutePublication = "public" | "preview";

const publicationMatrix = {
  home: {
    en: "public",
    "en-XA": isPseudoLocaleEnabled ? "preview" : false,
  },
  lore: {
    en: "public",
    "en-XA": isPseudoLocaleEnabled ? "preview" : false,
  },
  build: {
    en: "public",
    "en-XA": isPseudoLocaleEnabled ? "preview" : false,
  },
  assets: {
    en: "public",
    "en-XA": isPseudoLocaleEnabled ? "preview" : false,
  },
  hodl: {
    en: "public",
    "en-XA": isPseudoLocaleEnabled ? "preview" : false,
  },
} as const satisfies Record<RouteId, Record<Locale, RoutePublication | false>>;

export function getRoutePublication(
  routeId: RouteId,
  locale: Locale,
): RoutePublication | null {
  return publicationMatrix[routeId][locale] || null;
}

export function isRoutePublished(routeId: RouteId, locale: Locale): boolean {
  return getRoutePublication(routeId, locale) !== null;
}

export function isRouteDiscoverable(routeId: RouteId, locale: Locale): boolean {
  return getRoutePublication(routeId, locale) === "public";
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
