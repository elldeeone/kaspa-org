import {
  defaultLocale,
  getLocaleDefinition,
  resolveSupportedLocale,
  type Locale,
} from "./locale-registry.ts";

function normalizePathnameShape(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/gu, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

export type SafePathname = {
  decoded: string;
  encoded: string;
};

export function analyzeSafePathname(pathname: string): SafePathname | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURI(pathname);
  } catch {
    return null;
  }

  if (/[\\\u0000-\u001f\u007f]/u.test(decodedPathname)) return null;
  return {
    decoded: normalizePathnameShape(decodedPathname),
    encoded: normalizePathnameShape(pathname),
  };
}

export function normalizePathname(pathname: string): string | null {
  return analyzeSafePathname(pathname)?.decoded ?? null;
}

export function localizePathname(
  pathname: string,
  locale: Locale,
): string | null {
  const safePathname = analyzeSafePathname(pathname);
  if (!safePathname) return null;

  const localeSegmentEnd = safePathname.encoded.indexOf("/", 1);
  const encodedLocaleSegment = safePathname.encoded.slice(
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
      : safePathname.encoded.slice(localeSegmentEnd)
    : safePathname.encoded;

  if (locale === defaultLocale) return unprefixedPathname;
  const localeCode = getLocaleDefinition(locale).code;
  return unprefixedPathname === "/"
    ? `/${localeCode}`
    : `/${localeCode}${unprefixedPathname}`;
}
