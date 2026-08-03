import type { MouseEventHandler } from "react";
import { useTranslations } from "next-intl";

import ExternalLink from "../../components/ExternalLink";
import type { SectionId, StartRoute } from "../content";
import {
  BUILD_TERMS,
  DOCS_URL,
  KASPA_ACCENT,
  KASPA_VERSION,
  RUSTY_KASPA_URL,
  RUSTY_RELEASE_URL,
} from "../content";
import { ArrowUpRightIcon, ChevronRightIcon, SparklesIcon } from "../icons";
import { GridSurface } from "../ui";

export default function StartSection({
  kaspaAiEnabled,
  onOpenAi,
  onHashClick,
  startRoutes,
}: {
  kaspaAiEnabled: boolean;
  onOpenAi: () => void;
  onHashClick: (href: `#${SectionId}`) => MouseEventHandler<HTMLAnchorElement>;
  startRoutes: StartRoute[];
}) {
  const t = useTranslations("build.start");

  return (
    <section
      id="start"
      className="relative scroll-mt-32 overflow-hidden px-6 pt-24 pb-8 md:px-12 md:pt-28 md:pb-10 lg:px-20 lg:pt-36 lg:pb-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]">
        <div
          className="absolute top-10 left-[8%] h-[220px] w-[220px] rounded-full blur-3xl"
          style={{ background: `rgba(${KASPA_ACCENT}, 0.05)` }}
        />
        <div
          className="absolute top-20 right-[5%] h-[280px] w-[280px] rounded-full blur-3xl"
          style={{ background: `rgba(${KASPA_ACCENT}, 0.035)` }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(460px,560px)] xl:gap-16">
        <div className="max-w-2xl text-center lg:text-left">
          <ExternalLink
            href={RUSTY_RELEASE_URL}
            className="group border-subtle inline-flex items-center gap-0 overflow-hidden rounded-full border text-[13px] font-medium transition-colors hover:border-[var(--btn-ghost-hover-border)]"
          >
            <span
              className="rounded-full px-3.5 py-1.5 text-[var(--btn-primary-text)]"
              style={{ background: "var(--btn-primary-bg)" }}
            >
              {t("release.version", { version: KASPA_VERSION })}
            </span>
            <span className="text-secondary flex items-center gap-2 px-3.5 py-1.5">
              {t("release.action")}
              <span className="text-muted inline-block transition-transform duration-200 group-hover:translate-x-[2px]">
                &rarr;
              </span>
            </span>
          </ExternalLink>

          <h1 className="mt-7 text-[40px] leading-[0.92] font-bold tracking-[-0.04em] sm:text-[46px] md:text-[60px] lg:text-[72px]">
            {t("heading", { kaspa: BUILD_TERMS.kaspa })}
          </h1>

          <p className="text-secondary mx-auto mt-5 max-w-2xl text-[17px] leading-[1.7] sm:text-[18px] md:text-[20px] lg:mx-0">
            {t("description", {
              kaspa: BUILD_TERMS.kaspa,
              rust: BUILD_TERMS.rust,
              wasmSdk: BUILD_TERMS.wasmSdk,
            })}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row lg:items-stretch lg:justify-start">
            <ExternalLink
              href={DOCS_URL}
              className="btn-primary w-full justify-center sm:w-auto"
            >
              {t("actions.openDocs")} <ChevronRightIcon />
            </ExternalLink>
            <ExternalLink
              href={RUSTY_KASPA_URL}
              className="btn-ghost w-full justify-center sm:w-auto"
            >
              {t("actions.viewGitHub", { github: BUILD_TERMS.github })}{" "}
              <ArrowUpRightIcon />
            </ExternalLink>
          </div>
        </div>

        <div className="mt-8 lg:mt-0">
          <div
            className="border-subtle relative overflow-hidden rounded-[30px] border p-4 md:p-5 lg:p-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(15, 23, 42, 0.02), transparent 42%), var(--surface)",
              boxShadow: "0 18px 52px rgba(15, 23, 42, 0.04)",
            }}
          >
            <GridSurface />
            <div className="relative">
              <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                {t("quickstart.eyebrow")}
              </p>
              <h2 className="mt-2 max-w-lg text-[22px] leading-[1.06] font-medium tracking-[-0.03em] md:text-[26px] lg:text-[28px]">
                {t("quickstart.title")}
              </h2>
              <p className="text-tertiary mt-2.5 max-w-lg text-[14px] leading-[1.65] md:text-[15px]">
                {kaspaAiEnabled
                  ? t("quickstart.descriptionWithAi", {
                      kaspaAi: BUILD_TERMS.kaspaAi,
                    })
                  : t("quickstart.descriptionWithoutAi")}
              </p>

              {kaspaAiEnabled ? (
                <button
                  onClick={onOpenAi}
                  className="group border-subtle mt-5 flex w-full items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)]"
                  style={{ background: "var(--bg)" }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: `rgba(${KASPA_ACCENT}, 0.08)`,
                        color: "var(--text-primary)",
                      }}
                    >
                      <SparklesIcon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-primary truncate text-[15px] font-medium tracking-[-0.02em]">
                        {t("quickstart.aiTitle", {
                          kaspaAi: BUILD_TERMS.kaspaAi,
                        })}
                      </p>
                      <p className="text-tertiary mt-1 text-[13px] leading-[1.55]">
                        {t("quickstart.aiDescription", {
                          api: BUILD_TERMS.api,
                          sdk: BUILD_TERMS.sdk,
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-muted group-hover:text-secondary shrink-0 transition-all duration-200 group-hover:translate-x-[2px]">
                    <ChevronRightIcon size={12} />
                  </span>
                </button>
              ) : null}

              <div className="border-subtle mt-5 border-t pt-5">
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  {t("quickstart.jumpLabel")}
                </p>
                <div className="mt-3 grid gap-2 lg:grid-cols-3">
                  {startRoutes.map((card) => (
                    <ExternalLink
                      key={card.title}
                      href={card.href}
                      onClick={onHashClick(card.href)}
                      className="group border-subtle flex min-h-[56px] items-center justify-between gap-4 rounded-[16px] border px-3.5 py-3 text-left transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)] lg:min-h-[68px] lg:px-4"
                      style={{ background: "var(--bg)" }}
                    >
                      <div className="min-w-0">
                        <p className="text-primary text-[14px] leading-[1.25] font-medium tracking-[-0.02em] lg:text-[13px]">
                          {card.title}
                        </p>
                      </div>
                      <span className="text-muted group-hover:text-secondary shrink-0 transition-all duration-200 group-hover:translate-x-[2px]">
                        <ChevronRightIcon size={12} />
                      </span>
                    </ExternalLink>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
