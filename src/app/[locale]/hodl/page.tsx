import { NextIntlClientProvider } from "next-intl";

import HodlPage from "@/app/hodl/HodlPage";
import LocalizedAiLauncherEntry from "@/app/components/LocalizedAiLauncherEntry";
import MarketingPageShell from "@/app/components/MarketingPageShell";
import { getHodlClientMessages } from "@/i18n/messages";
import {
  createLocalizedPageAdapter,
  type LocalizedPageProps,
} from "@/i18n/page-route";
import { isAiAvailable } from "@/i18n/site-capabilities";

const routeId = "hodl";
const pageRoute = createLocalizedPageAdapter(routeId);

export const dynamicParams = false;

export function generateStaticParams() {
  return pageRoute.generateStaticParams();
}

export function generateMetadata(props: LocalizedPageProps) {
  return pageRoute.generateMetadata(props);
}

export default async function HodlRoute({ params }: LocalizedPageProps) {
  const { locale } = await pageRoute.resolve(params);
  const aiAvailable = isAiAvailable(routeId, locale);
  return (
    <MarketingPageShell
      afterFooter={
        aiAvailable ? <LocalizedAiLauncherEntry locale={locale} /> : null
      }
    >
      <NextIntlClientProvider
        locale={locale}
        messages={getHodlClientMessages(locale)}
      >
        <HodlPage aiAvailable={aiAvailable} />
      </NextIntlClientProvider>
    </MarketingPageShell>
  );
}
