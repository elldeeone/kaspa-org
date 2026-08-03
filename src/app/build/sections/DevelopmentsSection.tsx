import { useTranslations } from "next-intl";

import ExternalLink from "../../components/ExternalLink";
import SectionHeading from "../../components/SectionHeading";
import { BUILD_TERMS, KASPA_ACCENT, useDevelopmentCards } from "../content";
import { ArrowUpRightIcon } from "../icons";
import { MetaPill } from "../ui";

export default function DevelopmentsSection() {
  const t = useTranslations("build.developments");
  const developmentCards = useDevelopmentCards();

  return (
    <section
      id="developments"
      className="scroll-mt-32 px-6 py-16 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div className="h-fit lg:sticky lg:top-32">
          <SectionHeading
            label={t("heading.label")}
            title={t("heading.title")}
            description={t("heading.description", { sdk: BUILD_TERMS.sdk })}
          />
        </div>

        <div className="relative mt-10 pl-6 md:pl-10 lg:mt-0">
          <div className="absolute top-2 bottom-2 left-[4px] w-0.5 bg-[var(--border-subtle)] md:left-[6px]" />
          <div className="space-y-4">
            {developmentCards.map((item) => {
              const isChannel = item.id === "channel";
              return (
                <div key={item.title} className="relative">
                  <span
                    className={`absolute top-1/2 left-[-26px] h-3.5 w-3.5 -translate-y-1/2 rounded-full border md:left-[-40px] ${
                      isChannel ? "kaspa-dot-pulse" : ""
                    }`}
                    style={{
                      background: isChannel
                        ? `rgba(${KASPA_ACCENT}, 0.92)`
                        : "var(--surface)",
                      borderColor: isChannel
                        ? `rgba(${KASPA_ACCENT}, 0.9)`
                        : "var(--border-subtle)",
                    }}
                  />
                  <ExternalLink
                    href={item.href}
                    className="group border-subtle block rounded-[26px] border p-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] md:p-6"
                    style={{
                      background: "var(--bg)",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <MetaPill accent={isChannel}>{item.label}</MetaPill>
                      {isChannel ? (
                        <MetaPill accent>{t("liveDiscussion")}</MetaPill>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <h3 className="text-[22px] font-medium tracking-[-0.02em]">
                        {item.title}
                      </h3>
                      <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                        <ArrowUpRightIcon size={12} />
                      </span>
                    </div>
                    <p className="text-tertiary mt-3 max-w-2xl text-[15px] leading-[1.72]">
                      {item.desc}
                    </p>
                  </ExternalLink>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
