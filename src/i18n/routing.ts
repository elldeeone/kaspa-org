import { defineRouting } from "next-intl/routing";

import { defaultLocale, localeCodes } from "./config.ts";
import { stablePathnameMap } from "./manifest.ts";

export const routing = defineRouting({
  locales: localeCodes,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
  pathnames: stablePathnameMap,
});
