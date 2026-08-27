export const RESERVED_NOT_FOUND_PATHNAME =
  "/__kaspa_i18n_not_found__/not/found";
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

// Internal links that must remain valid for every registered locale. UI
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
