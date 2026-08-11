import type { MetadataRoute } from "next";

import { getRouteDefinition, listDiscoverableRoutes } from "@/i18n/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return listDiscoverableRoutes().map((route) => {
    const { sitemap: sitemapConfig } = getRouteDefinition(route.routeId);
    return {
      url: route.canonicalUrl,
      changeFrequency: sitemapConfig.changeFrequency,
      priority: sitemapConfig.priority,
    };
  });
}
