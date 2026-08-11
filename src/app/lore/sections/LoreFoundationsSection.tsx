import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/locale-registry";

import { ContributorStrip } from "../ContributorStrip";
import { LoreLink } from "../LoreLink";
import type { Contributor } from "../contributors";

type LoreFoundationsSectionProps = {
  contributors: Contributor[];
  locale: Locale;
  totalContributors: number;
};

export async function LoreFoundationsSection({
  contributors,
  locale,
  totalContributors,
}: LoreFoundationsSectionProps): Promise<React.JSX.Element> {
  const t = await getTranslations({ locale, namespace: "lore.article" });

  return (
    <>
      <h2 className="text-primary mt-10 text-center text-[17px] font-bold">
        {t("shift.heading")}
      </h2>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("shift.body", {
          paper: (chunks) => (
            <LoreLink href="https://eprint.iacr.org/2018/104.pdf">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>

      <h2 className="text-primary mt-10 text-center text-[17px] font-bold">
        {t("history.heading")}
      </h2>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("history.research", {
          ghost: (chunks) => (
            <LoreLink href="https://ethereum.org/en/whitepaper/#modified-ghost-implementation">
              {chunks}
            </LoreLink>
          ),
          scaling: (chunks) => (
            <LoreLink href="https://youtu.be/8IlZ80mPWfE?si=metsyYxZ8pnBgRMf&t=1583">
              {chunks}
            </LoreLink>
          ),
          coindesk: (chunks) => (
            <LoreLink href="https://www.coindesk.com/markets/2017/10/25/spectre-creators-seek-vc-backing-for-blockchain-free-cryptocurrency">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("history.launch", {
          launchPlan: (chunks) => (
            <LoreLink href="https://hashdag.medium.com/kaspa-launch-plan-responding-to-reality-6b4bec449037">
              {chunks}
            </LoreLink>
          ),
          genesisProof: (chunks) => (
            <LoreLink href="https://github.com/kaspagang/kaspad-py-explorer/blob/main/src/genesis_proof.ipynb">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>

      <h2 className="text-primary mt-10 text-center text-[17px] font-bold">
        {t("northStar.heading")}
      </h2>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t("northStar.intro")}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("northStar.urgency", {
          uniqueness: (chunks) => (
            <LoreLink href="https://x.com/michaelsuttonil/status/1973887808776675365">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t("northStar.consensus")}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("northStar.eventFeed", {
          post: (chunks) => (
            <LoreLink href="https://hashdag.medium.com/in-which-it-was-never-my-choice-to-hold-the-fire-we-found-937314149402">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t("northStar.resilience")}
      </p>

      <hr className="border-subtle my-10 border-t" />

      <h2 className="text-primary text-center text-[17px] font-bold">
        {t("shipped.heading")}
      </h2>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("shipped.rewrite", {
          code: (chunks) => <em>{chunks}</em>,
          github: (chunks) => (
            <LoreLink href="https://github.com/kaspanet/rusty-kaspa">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("shipped.crescendo", {
          reference: (chunks) => (
            <LoreLink href="https://medium.com/@michaelsuttonil/unveiling-the-crescendo-hard-fork-roadmap-10bps-and-more-6072329e177f">
              {chunks}
            </LoreLink>
          ),
          release: (chunks) => (
            <LoreLink href="https://github.com/kaspanet/rusty-kaspa/releases/tag/v1.0.0">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>

      <ContributorStrip
        contributors={contributors}
        locale={locale}
        totalContributors={totalContributors}
      />
    </>
  );
}
