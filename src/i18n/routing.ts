import { defineRouting } from "next-intl/routing";

import { localeCodes } from "./config.ts";
import { defaultLocale } from "./locale-registry.ts";
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
