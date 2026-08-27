import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { isLocale } from "./config.ts";
import { supportedLocaleCodes, type Locale } from "./locale-registry.ts";
import type { RouteId } from "./manifest.ts";
import {
  createRouteMetadata,
  resolveLocalizedRoute,
  type RouteContext,
} from "./site.ts";

export type LocalizedPageProps = {
  params: Promise<{ locale: string }>;
};

export type LocalizedPageAdapter = {
  generateStaticParams: () => { locale: Locale }[];
  generateMetadata: (props: LocalizedPageProps) => Promise<Metadata>;
  resolve: (params: LocalizedPageProps["params"]) => Promise<RouteContext>;
};

export function createLocalizedPageAdapter(
  routeId: RouteId,
  activateLocale: (locale: Locale) => void = setRequestLocale,
): LocalizedPageAdapter {
  async function resolve(
    params: LocalizedPageProps["params"],
  ): Promise<RouteContext> {
    const { locale } = await params;
    if (!isLocale(locale)) {
      throw new Error(
        `Unexpected locale static parameter for ${routeId}: ${locale}`,
      );
    }

    const route = resolveLocalizedRoute(routeId, locale);
    activateLocale(route.locale);
    return route;
  }

  return {
    generateStaticParams() {
      return supportedLocaleCodes.map((locale) => ({ locale }));
    },
    async generateMetadata(props) {
      const route = await resolve(props.params);
      return createRouteMetadata(routeId, route.locale);
    },
    resolve,
  };
}
