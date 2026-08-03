import { useTranslations } from "next-intl";

import ExternalLink from "../../components/ExternalLink";
import ShuffledPromptPills from "../../components/ShuffledPromptPills";
import { type OpenKaspaAiDetail } from "../../components/aiLauncherEvents";
import {
  BUILD_TERMS,
  DOCS_URL,
  TELEGRAM_RND_URL,
  useAiPrompts,
} from "../content";
import { ArrowUpRightIcon, ChevronRightIcon, SparklesIcon } from "../icons";
import { GridSurface } from "../ui";

export default function HelpSection({
  kaspaAiEnabled,
  onOpenAi,
}: {
  kaspaAiEnabled: boolean;
  onOpenAi: (prompt?: OpenKaspaAiDetail["prompt"]) => void;
}) {
  const t = useTranslations("build.help");
  const aiPrompts = useAiPrompts();

  return (
    <section
      id="help"
      className="scroll-mt-32 px-6 pt-16 pb-28 md:scroll-mt-40 md:px-12 lg:px-20 lg:pt-24 lg:pb-36"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-subtle relative overflow-hidden rounded-[32px] border px-6 py-8 md:px-8 md:py-9">
          <GridSurface />
          <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            <div className="max-w-2xl">
              <p className="text-muted text-[13px] font-medium tracking-[0.08em] uppercase">
                {t("eyebrow")}
              </p>
              <h2 className="mt-3 text-[32px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[40px]">
                {t("title")}
              </h2>
              <p className="text-tertiary mt-4 text-[16px] leading-[1.75]">
                {kaspaAiEnabled
                  ? t("descriptionWithAi", {
                      discord: BUILD_TERMS.discord,
                      github: BUILD_TERMS.github,
                      kaspaAi: BUILD_TERMS.kaspaAi,
                      qa: BUILD_TERMS.qa,
                      telegram: BUILD_TERMS.telegram,
                    })
                  : t("descriptionWithoutAi", {
                      discord: BUILD_TERMS.discord,
                      github: BUILD_TERMS.github,
                      qa: BUILD_TERMS.qa,
                      telegram: BUILD_TERMS.telegram,
                    })}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ExternalLink href={DOCS_URL} className="btn-primary">
                  {t("actions.openDocs")} <ChevronRightIcon />
                </ExternalLink>
                {kaspaAiEnabled ? (
                  <button onClick={() => onOpenAi()} className="btn-ghost">
                    <SparklesIcon size={14} />
                    {t("actions.openAi")}
                  </button>
                ) : null}
              </div>

              {kaspaAiEnabled ? (
                <ShuffledPromptPills
                  prompts={aiPrompts}
                  count={4}
                  onSelect={onOpenAi}
                />
              ) : null}
            </div>

            <div className="mt-8 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:self-start">
              <ExternalLink
                href="https://github.com/kaspanet/rusty-kaspa"
                className="group border-subtle flex min-h-[132px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:min-h-[148px]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  {t("links.github.eyebrow")}
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    {t("links.github.title", {
                      github: BUILD_TERMS.github,
                    })}
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>

              <ExternalLink
                href="https://discord.gg/kaspa"
                className="group border-subtle flex min-h-[132px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:min-h-[148px]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  {t("links.discord.eyebrow")}
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    {t("links.discord.title", {
                      discord: BUILD_TERMS.discord,
                    })}
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>

              <ExternalLink
                href="https://qa.kas.pa/"
                className="group border-subtle flex min-h-[132px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:min-h-[148px]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  {t("links.qa.eyebrow")}
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    {t("links.qa.title", {
                      kaspaQAndA: BUILD_TERMS.kaspaQAndA,
                    })}
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>

              <ExternalLink
                href={TELEGRAM_RND_URL}
                className="group border-subtle flex min-h-[132px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:min-h-[148px]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  {t("links.telegram.eyebrow")}
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    {t("links.telegram.title", {
                      telegram: BUILD_TERMS.telegram,
                    })}
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
