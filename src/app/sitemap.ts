import type { MetadataRoute } from "next";

import { getRouteDefinition, listPublishedRoutes } from "@/i18n/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return listPublishedRoutes().map((route) => {
    const { sitemap: sitemapConfig } = getRouteDefinition(route.routeId);
    return {
      url: route.canonicalUrl,
      changeFrequency: sitemapConfig.changeFrequency,
      priority: sitemapConfig.priority,
    };
  });
}
