import { createNavigation } from "next-intl/navigation";

import type { Locale } from "./locale-registry.ts";
import { localizePathname } from "./pathname.ts";
import { resolveRouteRequest } from "./route-request.ts";
import { routing } from "./routing.ts";

const navigation = createNavigation(routing);

export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
  getPathname,
} = navigation;

export function getLocalizedPathname(
  pathname: string,
  locale: Locale,
): string | null {
  const route = resolveRouteRequest(pathname);
  if (route) {
    return getPathname({ href: route.stablePathname, locale });
  }
  return localizePathname(pathname, locale);
}

export function buildLanguageHref(
  pathname: string,
  locale: Locale,
  search: string,
  hash: string,
): string {
  return `${getLocalizedPathname(pathname, locale) ?? pathname}${search}${hash}`;
}
