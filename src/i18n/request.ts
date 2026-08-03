import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale } from "./config.ts";
import { loadMessages } from "./site.ts";

export default getRequestConfig(
  async ({ locale: explicitLocale, requestLocale }) => {
    const requestedLocale = explicitLocale ?? (await requestLocale);
    const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

    return {
      locale,
      messages: await loadMessages(locale),
      timeZone: "UTC",
    };
  },
);
