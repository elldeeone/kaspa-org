import { getRequestConfig } from "next-intl/server";

import { defaultLocale, resolveLocale } from "./config.ts";
import { loadMessages } from "./site.ts";

export default getRequestConfig(
  async ({ locale: explicitLocale, requestLocale }) => {
    const requestedLocale = explicitLocale ?? (await requestLocale);
    const locale = resolveLocale(requestedLocale) ?? defaultLocale;

    return {
      locale,
      messages: await loadMessages(locale),
      timeZone: "UTC",
    };
  },
);
