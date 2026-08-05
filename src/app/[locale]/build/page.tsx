import { NextIntlClientProvider } from "next-intl";

import BuildPage from "@/app/build/BuildPage";
import LocalizedAiLauncherEntry from "@/app/components/LocalizedAiLauncherEntry";
import MarketingPageShell from "@/app/components/MarketingPageShell";
import { getBuildClientMessages } from "@/i18n/messages";
import {
  createLocalizedPageAdapter,
  type LocalizedPageProps,
} from "@/i18n/page-route";
import { isAiAvailable } from "@/i18n/site";

const routeId = "build";
const pageRoute = createLocalizedPageAdapter(routeId);

export const dynamicParams = false;

export function generateStaticParams() {
  return pageRoute.generateStaticParams();
}

export function generateMetadata(props: LocalizedPageProps) {
  return pageRoute.generateMetadata(props);
}

export default async function BuildRoute({ params }: LocalizedPageProps) {
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
        messages={getBuildClientMessages(locale)}
      >
        <BuildPage aiAvailable={aiAvailable} />
      </NextIntlClientProvider>
    </MarketingPageShell>
  );
}
