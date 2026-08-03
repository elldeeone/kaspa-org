import { defaultLocale, resolveLocale, type Locale } from "./config.ts";
import {
  getRouteIdForPathname,
  routeManifest,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";

export const NEXT_INTL_LOCALE_HEADER = "x-next-intl-locale";

export type RouteRequest = {
  routeId: RouteId;
  locale: Locale;
  stablePathname: StablePathname;
  hadLocalePrefix: boolean;
};

function normalizePathname(pathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURI(pathname);
  } catch {
    return null;
  }

  if (/[\\\u0000-\u001f\u007f]/u.test(decodedPathname)) return null;

  const withLeadingSlash = decodedPathname.startsWith("/")
    ? decodedPathname
    : `/${decodedPathname}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/gu, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

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
