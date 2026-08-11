const ROUTE_FILE_PATTERN = /(?:^|\/)(?:page|route)\.[cm]?[jt]sx?$/u;
const ROUTE_GROUP_PATTERN = /^\([^)]*\)$/u;
const INTERCEPTING_ROUTE_PATTERN = /^\(\.{1,3}\)/u;
const OPTIONAL_CATCH_ALL_PATTERN = /^\[\[\.\.\.([^\]]+)\]\]$/u;
const CATCH_ALL_PATTERN = /^\[\.\.\.([^\]]+)\]$/u;
const DYNAMIC_PATTERN = /^\[([^\]]+)\]$/u;

export type AppRouteAnalysis = {
  relativeFile: string;
  representativePathname: string;
  pathnamePattern: RegExp;
  hasDynamicSegment: boolean;
  hasUnsupportedSegment: boolean;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeRelativeFile(relativeFile: string) {
  return relativeFile.replaceAll("\\", "/").replace(/^\.\//u, "");
}

export function isAppRouteFile(relativeFile: string): boolean {
  return ROUTE_FILE_PATTERN.test(normalizeRelativeFile(relativeFile));
}

export function analyzeAppRouteFile(
  relativeFile: string,
  defaultLocale: string,
): AppRouteAnalysis {
  const normalizedFile = normalizeRelativeFile(relativeFile);
  if (!isAppRouteFile(normalizedFile)) {
    throw new Error(`not an App Router page or route file: ${relativeFile}`);
  }

  const directorySegments = normalizedFile.split("/").slice(0, -1);
  const urlSegments = directorySegments.filter(
    (segment) => !ROUTE_GROUP_PATTERN.test(segment) && !segment.startsWith("@"),
  );
  const patternParts: string[] = [];
  const representativeParts: string[] = [];
  let hasDynamicSegment = false;
  let hasUnsupportedSegment = false;

  for (const segment of urlSegments) {
    if (INTERCEPTING_ROUTE_PATTERN.test(segment)) {
      hasUnsupportedSegment = true;
      continue;
    }

    const optionalCatchAll = segment.match(OPTIONAL_CATCH_ALL_PATTERN);
    if (optionalCatchAll) {
      hasDynamicSegment = true;
      patternParts.push("(?:/.*)?");
      representativeParts.push("example", "child");
      continue;
    }

    const catchAll = segment.match(CATCH_ALL_PATTERN);
    if (catchAll) {
      hasDynamicSegment = true;
      patternParts.push("/.+");
      representativeParts.push("example", "child");
      continue;
    }

    const dynamic = segment.match(DYNAMIC_PATTERN);
    if (dynamic) {
      hasDynamicSegment = true;
      patternParts.push("/[^/]+");
      representativeParts.push(
        dynamic[1] === "locale" ? defaultLocale : "example",
      );
      continue;
    }

    if (segment.includes("[") || segment.includes("]")) {
      hasUnsupportedSegment = true;
    }
    patternParts.push(`/${escapeRegExp(segment)}`);
    representativeParts.push(segment);
  }

  const patternSource = patternParts.join("") || "/";
  const representativePathname = `/${representativeParts.join("/")}`;
  return {
    relativeFile: normalizedFile,
    representativePathname,
    pathnamePattern: new RegExp(`^${patternSource}/?$`, "u"),
    hasDynamicSegment,
    hasUnsupportedSegment,
  };
}
