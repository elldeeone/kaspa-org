"use client";

import { forwardRef, type ComponentProps } from "react";
import { useLocale } from "next-intl";

import { isLocale } from "./config";
import { Link as LocalizedLink } from "./navigation";
import { isPathnamePublished } from "./publication";

type LocalizedLinkProps = ComponentProps<typeof LocalizedLink>;

function getHrefPathname(href: LocalizedLinkProps["href"]): string {
  if (typeof href === "string") return href.split(/[?#]/u, 1)[0];
  return href.pathname;
}

export function useIsPathnamePublished(pathname: string): boolean {
  const requestedLocale = useLocale();
  return (
    isLocale(requestedLocale) && isPathnamePublished(pathname, requestedLocale)
  );
}

export const Link = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
  function PublicationAwareLink({ href, ...props }, ref) {
    const published = useIsPathnamePublished(getHrefPathname(href));
    if (!published) return null;

    return <LocalizedLink {...props} ref={ref} href={href} />;
  },
);
