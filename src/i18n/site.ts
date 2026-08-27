import type { Metadata } from "next";

import {
  defaultLocale,
  getLocaleDefinition,
  supportedLocaleCodes,
  type Locale,
  type LocaleDefinition,
} from "./locale-registry.ts";
import {
  routeIds,
  routeManifest,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";
import {
  getMessages,
  getRouteMessages,
  type MessageNamespace,
} from "./messages.ts";
import { createOpenGraphImageDescriptor } from "./opengraph-contract.ts";
import { localizePathname } from "./pathname.ts";
export const siteUrl = "https://kaspa.org";

export type RouteContext = {
  routeId: RouteId;
  pathname: StablePathname;
  locale: Locale;
  localeDefinition: LocaleDefinition;
  namespaces: readonly MessageNamespace[];
  canonicalPathname: string;
  canonicalUrl: string;
  languageAlternatives: Readonly<Record<string, string>>;
};

export function getRouteDefinition(routeId: RouteId) {
  return routeManifest[routeId];
}

export function resolveLocalizedRoute(
  routeId: RouteId,
  locale: Locale,
): RouteContext {
  const definition = getRouteDefinition(routeId);
  const canonicalPathname = localizePathname(definition.pathname, locale);
  if (!canonicalPathname) {
    throw new Error(`Unable to localize ${definition.pathname} for ${locale}`);
  }
  const languageAlternatives = Object.fromEntries(
    supportedLocaleCodes.map((publishedLocale) => {
      const localeDefinition = getLocaleDefinition(publishedLocale);
      return [
        localeDefinition.hrefLang,
        `${siteUrl}${localizePathname(definition.pathname, publishedLocale)}`,
      ];
    }),
  );

  return {
    routeId,
    pathname: definition.pathname,
    locale,
    localeDefinition: getLocaleDefinition(locale),
    namespaces: definition.namespaces,
    canonicalPathname,
    canonicalUrl: `${siteUrl}${canonicalPathname === "/" ? "" : canonicalPathname}`,
    languageAlternatives,
  };
}

export function listLocalizedRoutes(): readonly RouteContext[] {
  return routeIds.flatMap((routeId) =>
    supportedLocaleCodes.map((locale) =>
      resolveLocalizedRoute(routeId, locale),
    ),
  );
}

export function createRouteMetadata(
  routeId: RouteId,
  locale: Locale,
): Metadata {
  const route = resolveLocalizedRoute(routeId, locale);

  const routeMessages = getRouteMessages(locale, routeId);
  const metadata = routeMessages.metadata;
  const languages =
    supportedLocaleCodes.length > 1
      ? {
          ...route.languageAlternatives,
          "x-default": resolveLocalizedRoute(routeId, defaultLocale)
            .canonicalUrl,
        }
      : undefined;
  const image = createOpenGraphImageDescriptor(routeId, locale);

  return {
    metadataBase: new URL(siteUrl),
    title: metadata.title,
    description: metadata.description,
    applicationName: "Kaspa",
    alternates: {
      canonical: route.canonicalPathname,
      languages,
    },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      type: "website",
      url: route.canonicalPathname,
      siteName: "Kaspa",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: routeId === "home" ? [image] : [image.url],
    },
  };
}

const organizationId = `${siteUrl}#organization`;
const websiteId = `${siteUrl}#website`;

export function createStructuredData(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Kaspa",
        url: siteUrl,
        logo: `${siteUrl}/kaspa-logo.svg`,
        description:
          getMessages(locale).shared.structuredData.organizationDescription,
        sameAs: [
          "https://github.com/kaspanet/rusty-kaspa/",
          "https://t.me/kasparnd",
        ],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Kaspa",
        url: siteUrl,
        alternateName: ["kaspa.org"],
        publisher: { "@id": organizationId },
      },
    ],
  } as const;
}
