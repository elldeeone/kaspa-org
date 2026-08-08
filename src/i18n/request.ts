import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "./config.ts";
import { defaultLocale } from "./locale-registry.ts";
import { loadMessages } from "./messages.ts";

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
