import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/locale-registry";

import { LoreLink } from "../LoreLink";

export async function LoreRoadmapSection({
  locale,
}: {
  locale: Locale;
}): Promise<React.JSX.Element> {
  const t = await getTranslations({
    locale,
    namespace: "lore.article.roadmap",
  });

  return (
    <>
      <hr className="my-6 border-t border-[var(--border-subtle)]" />

      <h3 className="text-primary text-[15px] font-bold">
        {t("toccata.heading")}
      </h3>
      <p className="text-secondary mt-2 text-[15px] leading-[1.72]">
        {t("toccata.overview")}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t.rich("toccata.implementation", {
          silverscript: (chunks) => (
            <LoreLink href="https://github.com/kaspanet/silverscript/">
              {chunks}
            </LoreLink>
          ),
          tn12: (chunks) => (
            <LoreLink href="https://medium.com/@michaelsuttonil/kaspa-covenants-toccata-hard-fork-outlook-a4d81a40900c">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>

      <hr className="my-6 border-t border-[var(--border-subtle)]" />

      <h3 className="text-primary text-[15px] font-bold">
        {t("dagKnight.heading")}
      </h3>
      <p className="text-secondary mt-2 text-[15px] leading-[1.72]">
        {t.rich("dagKnight.overview", {
          paper: (chunks) => (
            <LoreLink href="https://eprint.iacr.org/2022/1494.pdf">
              {chunks}
            </LoreLink>
          ),
        })}
      </p>

      <hr className="my-6 border-t border-[var(--border-subtle)]" />

      <h3 className="text-primary text-[15px] font-bold">
        {t("hardfork2027.heading")}
      </h3>
      <p className="text-secondary mt-2 text-[15px] leading-[1.72]">
        {t("hardfork2027.performance")}
      </p>
      <p className="text-secondary mt-3 text-[15px] leading-[1.72]">
        {t("hardfork2027.resilience")}
      </p>
    </>
  );
}
