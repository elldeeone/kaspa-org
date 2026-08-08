import Image from "next/image";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/locale-registry";

import type { Contributor } from "./contributors";

type ContributorStripProps = {
  contributors: Contributor[];
  locale: Locale;
  totalContributors: number;
};

export async function ContributorStrip({
  contributors,
  locale,
  totalContributors,
}: ContributorStripProps): Promise<React.JSX.Element | null> {
  if (contributors.length === 0) {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "lore.contributors" });
  const remainingContributors = totalContributors - contributors.length;

  return (
    <div className="mt-6">
      <a
        href="https://github.com/kaspanet/rusty-kaspa/graphs/contributors"
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex flex-wrap items-center gap-0"
      >
        <span className="sr-only">{t("viewOnGitHub")}</span>
        {contributors.map((contributor) => (
          <Image
            key={contributor.login}
            src={contributor.avatar_url}
            alt=""
            width={36}
            height={36}
            className="-ml-1.5 rounded-full border-2 border-[var(--bg-primary)] transition-transform group-hover:scale-105 first:ml-0"
          />
        ))}
        {remainingContributors > 0 ? (
          <span className="ml-2 text-[13px] font-medium text-[#1f5b91] underline underline-offset-2">
            {t("more", { count: remainingContributors })}
          </span>
        ) : null}
      </a>
    </div>
  );
}
