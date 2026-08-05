import {
  defaultLocale,
  getLocaleDefinition,
  resolveSupportedLocale,
  type Locale,
} from "./config.ts";
import type { StablePathname } from "./manifest.ts";

function normalizePathnameShape(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/gu, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function decodeSafePathname(pathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURI(pathname);
  } catch {
    return null;
  }

  return /[\\\u0000-\u001f\u007f]/u.test(decodedPathname)
    ? null
    : decodedPathname;
}

export function normalizePathname(pathname: string): string | null {
  const decodedPathname = decodeSafePathname(pathname);
  return decodedPathname === null
    ? null
    : normalizePathnameShape(decodedPathname);
}

export function localizePathname(
  pathname: StablePathname,
  locale: Locale,
): string;
export function localizePathname(
  pathname: string,
  locale: Locale,
): string | null;
export function localizePathname(
  pathname: string,
  locale: Locale,
): string | null {
  if (decodeSafePathname(pathname) === null) return null;
  const normalizedPathname = normalizePathnameShape(pathname);

  const localeSegmentEnd = normalizedPathname.indexOf("/", 1);
  const encodedLocaleSegment = normalizedPathname.slice(
    1,
    localeSegmentEnd === -1 ? undefined : localeSegmentEnd,
  );
  let localeSegment: string;
  try {
    localeSegment = decodeURIComponent(encodedLocaleSegment);
  } catch {
    return null;
  }
  const hasLocalePrefix = resolveSupportedLocale(localeSegment) !== null;
  const unprefixedPathname = hasLocalePrefix
    ? localeSegmentEnd === -1
      ? "/"
      : normalizedPathname.slice(localeSegmentEnd)
    : normalizedPathname;

  if (locale === defaultLocale) return unprefixedPathname;

  const localeCode = getLocaleDefinition(locale).code;
  return unprefixedPathname === "/"
    ? `/${localeCode}`
    : `/${localeCode}${unprefixedPathname}`;
}
