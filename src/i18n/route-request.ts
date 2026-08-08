import { resolveLocale } from "./config.ts";
import { defaultLocale, type Locale } from "./locale-registry.ts";
import {
  getRouteIdForPathname,
  routeManifest,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";
import { normalizePathname } from "./pathname.ts";

export const NEXT_INTL_LOCALE_HEADER = "x-next-intl-locale";

export type RouteRequest = {
  routeId: RouteId;
  locale: Locale;
  stablePathname: StablePathname;
  hadLocalePrefix: boolean;
};

export function resolveRouteRequest(pathname: string): RouteRequest | null {
  const normalized = normalizePathname(pathname);
  if (!normalized) return null;

  const segments = normalized.split("/").filter(Boolean);
  const candidateLocale = resolveLocale(segments[0]);
  const hadLocalePrefix = candidateLocale !== null;
  const locale = candidateLocale ?? defaultLocale;
  const routePathname = hadLocalePrefix
    ? segments.length === 1
      ? "/"
      : `/${segments.slice(1).join("/")}`
    : normalized;
  const routeId = getRouteIdForPathname(routePathname);

  return routeId
    ? {
        routeId,
        locale,
        stablePathname: routeManifest[routeId].pathname,
        hadLocalePrefix,
      }
    : null;
}
