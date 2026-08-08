import type { Locale } from "@/i18n/locale-registry";

import LocalizedAiLauncherEntry from "../components/LocalizedAiLauncherEntry";
import MarketingPageShell from "../components/MarketingPageShell";
import LoreArticle from "./LoreArticle";
import { getContributors } from "./contributors";

export default async function LorePage({
  aiAvailable,
  locale,
}: {
  aiAvailable: boolean;
  locale: Locale;
}): Promise<React.JSX.Element> {
  const { shown, total } = await getContributors();

  return (
    <MarketingPageShell
      afterFooter={
        aiAvailable ? <LocalizedAiLauncherEntry locale={locale} /> : null
      }
    >
      <LoreArticle
        contributors={shown}
        locale={locale}
        totalContributors={total}
      />
    </MarketingPageShell>
  );
}
