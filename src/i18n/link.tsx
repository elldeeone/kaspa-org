"use client";

import { forwardRef, type ComponentProps } from "react";
import { useLocale } from "next-intl";

import { isLocale } from "./config";
import { getRouteIdForPathname } from "./manifest";
import { Link as LocalizedLink } from "./navigation";

type LocalizedLinkProps = ComponentProps<typeof LocalizedLink>;

function getHrefPathname(href: LocalizedLinkProps["href"]): string {
  if (typeof href === "string") return href.split(/[?#]/u, 1)[0];
  return href.pathname;
}

export function useIsKnownPathname(pathname: string): boolean {
  const requestedLocale = useLocale();
  return isLocale(requestedLocale) && getRouteIdForPathname(pathname) !== null;
}

export const Link = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
  function RouteAwareLink({ href, ...props }, ref) {
    const known = useIsKnownPathname(getHrefPathname(href));
    if (!known) return null;

    return <LocalizedLink {...props} ref={ref} href={href} />;
  },
);
