import { isKaspaAiEnabled } from "../aiFeature";
import AiLauncherEntry from "../components/AiLauncherEntry";
import MarketingPageShell from "../components/MarketingPageShell";
import LoreArticle from "./LoreArticle";
import { getContributors } from "./contributors";

export default async function LorePage(): Promise<React.JSX.Element> {
  const { shown, total } = await getContributors();

  return (
    <MarketingPageShell
      afterFooter={isKaspaAiEnabled ? <AiLauncherEntry /> : null}
    >
      <LoreArticle contributors={shown} totalContributors={total} />
    </MarketingPageShell>
  );
}
