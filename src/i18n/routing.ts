import { defineRouting } from "next-intl/routing";

import { localeCodes } from "./config.ts";
import { LOCALE_COOKIE_NAME } from "./locale-negotiation.ts";
import { defaultLocale } from "./locale-registry.ts";
import { stablePathnameMap } from "./manifest.ts";

export const routing = defineRouting({
  locales: localeCodes,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
    sameSite: "lax",
  },
  alternateLinks: false,
  pathnames: stablePathnameMap,
});
