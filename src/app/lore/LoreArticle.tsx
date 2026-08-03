import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

import type { Contributor } from "./contributors";
import { LoreClosingSection } from "./sections/LoreClosingSection";
import { LoreFoundationsSection } from "./sections/LoreFoundationsSection";
import { LoreRoadmapSection } from "./sections/LoreRoadmapSection";

type LoreArticleProps = {
  contributors: Contributor[];
  locale: Locale;
  totalContributors: number;
};

export default async function LoreArticle({
  contributors,
  locale,
  totalContributors,
}: LoreArticleProps): Promise<React.JSX.Element> {
  const t = await getTranslations({ locale, namespace: "lore.article" });

  return (
    <article className="mx-auto max-w-[700px] px-6 pt-28 pb-24 lg:pt-36">
      <h1 className="text-primary text-center text-[30px] leading-[1.2] font-normal tracking-[-0.02em] md:text-[34px]">
        {t("heading")}
      </h1>

      <LoreFoundationsSection
        contributors={contributors}
        locale={locale}
        totalContributors={totalContributors}
      />
      <LoreRoadmapSection locale={locale} />
      <LoreClosingSection locale={locale} />
    </article>
  );
}
