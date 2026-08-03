import { useTranslations } from "next-intl";

import ExternalLink from "../../components/ExternalLink";
import SectionHeading from "../../components/SectionHeading";
import { BUILD_TERMS, useToolingCards } from "../content";
import { ArrowUpRightIcon } from "../icons";
import { MetaPill } from "../ui";

export default function ToolingSection() {
  const t = useTranslations("build.tooling");
  const { communityTools, emergingTools, toolingCards } = useToolingCards();

  return (
    <section
      id="tooling"
      className="scroll-mt-32 px-6 py-16 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-24"
    >
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div className="h-fit lg:sticky lg:top-32">
          <SectionHeading
            label={t("heading.label")}
            title={t("heading.title")}
            description={t("heading.description")}
          />
        </div>

        <div className="mt-10 space-y-5 lg:mt-0">
          <div
            className="border-subtle overflow-hidden rounded-[28px] border"
            style={{ background: "var(--bg)" }}
          >
            {toolingCards.map((tool, index) => (
              <ExternalLink
                key={tool.title}
                href={tool.href}
                className={`group block px-5 py-5 transition-colors hover:bg-[var(--btn-ghost-hover-bg)] md:px-6 ${
                  index < toolingCards.length - 1 || emergingTools.length > 0
                    ? "border-subtle border-b"
                    : ""
                }`}
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)_auto] md:items-center md:gap-6">
                  <div>
                    <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                      {tool.eyebrow}
                    </p>
                    <h3 className="text-primary mt-3 text-[24px] leading-[1.06] font-medium tracking-[-0.03em]">
                      {tool.title}
                    </h3>
                  </div>

                  <div>
                    <p className="text-tertiary text-[15px] leading-[1.7]">
                      {tool.desc}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tool.tags.map((tag, tagIndex) => (
                        <MetaPill
                          key={tag}
                          accent={index === 0 && tagIndex === 0}
                        >
                          {tag}
                        </MetaPill>
                      ))}
                    </div>
                  </div>

                  <div className="text-secondary group-hover:text-primary inline-flex items-center gap-2 text-[14px] font-medium transition-colors md:justify-self-end">
                    {tool.actionLabel}
                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                      <ArrowUpRightIcon size={11} />
                    </span>
                  </div>
                </div>
              </ExternalLink>
            ))}

            {emergingTools.map((tool) => (
              <ExternalLink
                key={tool.title}
                href={tool.href}
                className="group block px-5 py-4 transition-colors hover:bg-[var(--btn-ghost-hover-bg)] md:px-6"
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)_auto] md:items-center md:gap-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <MetaPill accent>{tool.status}</MetaPill>
                    <span className="text-primary text-[20px] font-medium tracking-[-0.02em]">
                      {tool.title}
                    </span>
                  </div>

                  <p className="text-tertiary text-[14px] leading-[1.68]">
                    {tool.desc}
                  </p>

                  <div className="text-secondary group-hover:text-primary inline-flex items-center gap-2 text-[14px] font-medium transition-colors md:justify-self-end">
                    {tool.actionLabel}
                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                      <ArrowUpRightIcon size={11} />
                    </span>
                  </div>
                </div>
              </ExternalLink>
            ))}
          </div>

          <div className="border-subtle rounded-[28px] border p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-muted text-[13px] font-medium tracking-[0.08em] uppercase">
                  {t("community.eyebrow")}
                </p>
                <h3 className="mt-3 text-[24px] leading-[1.06] font-medium tracking-[-0.03em] md:text-[28px]">
                  {t("community.title")}
                </h3>
                <p className="text-tertiary mt-3 text-[15px] leading-[1.72]">
                  {t("community.description", {
                    kaspa: BUILD_TERMS.kaspa,
                    sdk: BUILD_TERMS.sdk,
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {communityTools.map((tool) => (
                <ExternalLink
                  key={tool.title}
                  href={tool.href}
                  className="group border-subtle rounded-[20px] border p-4 transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)] md:p-5"
                  style={{ background: "var(--surface)" }}
                >
                  <MetaPill>{tool.type}</MetaPill>
                  <h4 className="mt-3 text-[17px] font-medium tracking-[-0.02em] md:mt-4 md:text-[19px]">
                    {tool.title}
                  </h4>
                  <p className="text-tertiary mt-2 text-[14px] leading-[1.62] md:text-[15px] md:leading-[1.68]">
                    {tool.desc}
                  </p>
                  <div className="text-secondary group-hover:text-primary mt-3 inline-flex items-center gap-2 text-[14px] font-medium transition-colors md:mt-4">
                    {t("community.open")}
                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                      <ArrowUpRightIcon size={11} />
                    </span>
                  </div>
                </ExternalLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
