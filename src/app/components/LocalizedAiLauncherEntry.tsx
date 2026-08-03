import "server-only";

import { NextIntlClientProvider } from "next-intl";

import type { Locale } from "@/i18n/config";
import { getAiClientMessages } from "@/i18n/messages";

import AiLauncherEntry from "./AiLauncherEntry";

export default function LocalizedAiLauncherEntry({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={getAiClientMessages(locale)}
    >
      <AiLauncherEntry />
    </NextIntlClientProvider>
  );
}
