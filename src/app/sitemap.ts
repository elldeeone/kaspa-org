import type { MetadataRoute } from "next";

import { getRouteDefinition, listLocalizedRoutes } from "@/i18n/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return listLocalizedRoutes().map((route) => {
    const { sitemap: sitemapConfig } = getRouteDefinition(route.routeId);
    return {
      url: route.canonicalUrl,
      changeFrequency: sitemapConfig.changeFrequency,
      priority: sitemapConfig.priority,
    };
  });
}
