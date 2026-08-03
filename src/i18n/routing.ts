import { defineRouting } from "next-intl/routing";

import { defaultLocale, localeCodes } from "./config.ts";

export const routing = defineRouting({
  locales: localeCodes,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
  pathnames: {
    "/": "/",
    "/lore": "/lore",
    "/build": "/build",
    "/assets": "/assets",
    "/hodl": "/hodl",
  },
});
