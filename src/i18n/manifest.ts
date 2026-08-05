import {
  i18nBuildTarget,
  i18nFixturePublicationPolicy,
  isLocaleEnabledForTarget,
  isLocaleProductionReady,
  type I18nBuildTarget,
  type Locale,
} from "./config.ts";
import {
  getFixtureRoutePublicationOverride,
  type I18nFixturePublicationPolicy,
  type RoutePublication,
} from "./publication-policy.ts";

export const RESERVED_NOT_FOUND_PATHNAME =
  "/__kaspa_i18n_unpublished__/not/found";
export const ROUTE_MISS_HEADER = "x-kaspa-i18n-route-miss";

export type RouteDefinition<Id extends string = string> = {
  id: Id;
  pathname: `/${string}` | "/";
  namespaces: readonly ["shared", Id];
  sitemap: {
    changeFrequency: "weekly" | "monthly";
    priority: number;
  };
};

function defineRouteManifest<
  const Manifest extends {
    [Id in keyof Manifest]: RouteDefinition<Extract<Id, string>>;
  },
>(manifest: Manifest): Manifest {
  return manifest;
}

export const routeManifest = defineRouteManifest({
  home: {
    id: "home",
    pathname: "/",
    namespaces: ["shared", "home"],
    sitemap: { changeFrequency: "weekly", priority: 1 },
  },
  lore: {
    id: "lore",
    pathname: "/lore",
    namespaces: ["shared", "lore"],
    sitemap: { changeFrequency: "monthly", priority: 0.8 },
  },
  build: {
    id: "build",
    pathname: "/build",
    namespaces: ["shared", "build"],
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
  assets: {
    id: "assets",
    pathname: "/assets",
    namespaces: ["shared", "assets"],
    sitemap: { changeFrequency: "monthly", priority: 0.7 },
  },
  hodl: {
    id: "hodl",
    pathname: "/hodl",
    namespaces: ["shared", "hodl"],
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
});

export type RouteId = Extract<keyof typeof routeManifest, string>;
export const routeIds = Object.freeze(Object.keys(routeManifest) as RouteId[]);

export const stablePathnames = routeIds.map(
  (routeId) => routeManifest[routeId].pathname,
);
export type StablePathname = (typeof routeManifest)[RouteId]["pathname"];
export const stablePathnameMap = Object.fromEntries(
  stablePathnames.map((pathname) => [pathname, pathname]),
) as Readonly<Record<StablePathname, StablePathname>>;

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

export type { RoutePublication } from "./publication-policy.ts";

export type PublicationPolicy = {
  getRoutePublication: (
    routeId: RouteId,
    locale: Locale,
  ) => RoutePublication | null;
};

export function createPublicationPolicy(
  buildTarget: I18nBuildTarget,
  fixturePolicy: I18nFixturePublicationPolicy | null = null,
): PublicationPolicy {
  return {
    getRoutePublication(routeId, locale) {
      if (!isLocaleEnabledForTarget(locale, buildTarget, fixturePolicy)) {
        return null;
      }
      const override = getFixtureRoutePublicationOverride(
        fixturePolicy,
        locale,
        routeId,
      );
      if (override !== undefined) return override;
      return isLocaleProductionReady(locale, fixturePolicy)
        ? "public"
        : "preview";
    },
  };
}

export const publicationPolicy = createPublicationPolicy(
  i18nBuildTarget,
  i18nFixturePublicationPolicy,
);

export function getRoutePublication(
  routeId: RouteId,
  locale: Locale,
): RoutePublication | null {
  return publicationPolicy.getRoutePublication(routeId, locale);
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
