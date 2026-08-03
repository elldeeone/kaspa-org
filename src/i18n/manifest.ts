import type { Locale } from "./config.ts";

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

const publicationMatrix = {
  home: { en: true },
  lore: { en: true },
  build: { en: true },
  assets: { en: true },
  hodl: { en: true },
} as const satisfies Record<RouteId, Record<Locale, boolean>>;

export function isRoutePublished(routeId: RouteId, locale: Locale): boolean {
  return publicationMatrix[routeId][locale];
}

export function isPathnamePublished(
  pathname: string,
  locale: Locale,
  resolvePublication: typeof isRoutePublished = isRoutePublished,
): boolean {
  const routeId = getRouteIdForPathname(pathname);
  return routeId ? resolvePublication(routeId, locale) : false;
}
