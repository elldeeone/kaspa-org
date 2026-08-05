import {
  defaultLocale,
  isLocaleEnabled,
  isLocaleProductionReady,
  type Locale,
} from "./config.ts";

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

export type LocalizedDestination = {
  pathname: StablePathname;
  hash?: string;
};

// Internal links that must remain valid for every production locale. UI
// surfaces consume this inventory directly so their hrefs cannot drift from
// the fixed route manifest or adopt translated slugs independently.
export const localizedDestinationInventory = {
  navigationHome: { pathname: routeManifest.home.pathname },
  navigationLore: { pathname: routeManifest.lore.pathname },
  navigationHodl: { pathname: routeManifest.hodl.pathname },
  navigationBuild: { pathname: routeManifest.build.pathname },
  logoAssets: { pathname: routeManifest.assets.pathname },
  homeGetStarted: { pathname: routeManifest.lore.pathname },
  homeGetWallet: { pathname: routeManifest.hodl.pathname, hash: "wallet" },
  homeBuyKaspa: { pathname: routeManifest.hodl.pathname, hash: "buy" },
  notFoundHome: { pathname: routeManifest.home.pathname },
} as const satisfies Record<string, LocalizedDestination>;

export function getRouteIdForPathname(pathname: string): RouteId | null {
  return (
    routeIds.find((routeId) => routeManifest[routeId].pathname === pathname) ??
    null
  );
}

export type RoutePublication = "public" | "preview";

// Default-locale routes can still be exercised individually by the publication
// proxy fixture. Every non-default locale is derived from one lifecycle state,
// so it can only publish the complete fixed-route set or none of it.
const defaultLocaleRoutePublication = {
  home: "public",
  lore: "public",
  build: "public",
  assets: "public",
  hodl: "public",
} as const satisfies Record<RouteId, RoutePublication | false>;

export function getRoutePublication(
  routeId: RouteId,
  locale: Locale,
): RoutePublication | null {
  if (locale === defaultLocale) {
    return defaultLocaleRoutePublication[routeId] || null;
  }
  if (!isLocaleEnabled(locale)) return null;
  return isLocaleProductionReady(locale) ? "public" : "preview";
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
