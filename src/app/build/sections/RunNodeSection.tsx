import { useState } from "react";
import { useTranslations } from "next-intl";

import ExternalLink from "../../components/ExternalLink";
import SectionHeading from "../../components/SectionHeading";
import { copyTextToClipboard } from "../../components/copyTextToClipboard";
import {
  BUILD_TERMS,
  DOCKER_HUB_URL,
  DOCKER_RUN_COMMAND,
  RUSTY_KASPA_URL,
} from "../content";
import { ArrowUpRightIcon, CheckIcon, ClipboardIcon } from "../icons";
import { MetaPill } from "../ui";

export default function RunNodeSection() {
  const t = useTranslations("build.runNode");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(DOCKER_RUN_COMMAND);
    if (!ok) return;

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="run-a-node"
      className="scroll-mt-32 px-6 py-16 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-24"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div className="h-fit lg:sticky lg:top-32">
          <SectionHeading
            label={t("heading.label")}
            title={t("heading.title")}
            description={t("heading.description", {
              docker: BUILD_TERMS.docker,
              dockerHub: BUILD_TERMS.dockerHub,
              rustyKaspa: BUILD_TERMS.rustyKaspa,
            })}
          />
        </div>

        <div className="mt-10 lg:mt-0">
          <div
            className="border-subtle rounded-[28px] border p-6 md:p-7"
            style={{ background: "var(--surface)" }}
          >
            <MetaPill>
              {t("quickstart", { docker: BUILD_TERMS.docker })}
            </MetaPill>
            <h3 className="mt-5 text-[22px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[24px]">
              {t("title", { rustyKaspa: BUILD_TERMS.rustyKaspa })}
            </h3>
            <p className="text-tertiary mt-3 text-[15px] leading-[1.7]">
              {t("description", {
                grpc: BUILD_TERMS.grpc,
                p2p: BUILD_TERMS.p2p,
              })}
            </p>

            <button
              onClick={handleCopy}
              aria-label={
                copied
                  ? t("commandCopied", { docker: BUILD_TERMS.docker })
                  : t("copyCommand", { docker: BUILD_TERMS.docker })
              }
              className="group border-subtle text-secondary hover:text-primary mt-6 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left font-mono text-[13px] transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)] md:text-[14px]"
              style={{ background: "var(--bg)" }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-muted select-none">$</span>
                <span className="truncate">{DOCKER_RUN_COMMAND}</span>
              </span>
              <span className="text-muted group-hover:text-secondary shrink-0 transition-colors">
                {copied ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
              </span>
            </button>

            <div className="border-subtle mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5">
              <ExternalLink
                href={DOCKER_HUB_URL}
                className="group text-secondary hover:text-primary inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors"
              >
                {t("dockerHub", { dockerHub: BUILD_TERMS.dockerHub })}
                <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                  <ArrowUpRightIcon size={10} />
                </span>
              </ExternalLink>
              <ExternalLink
                href={RUSTY_KASPA_URL}
                className="group text-secondary hover:text-primary inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors"
              >
                {t("compile")}
                <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                  <ArrowUpRightIcon size={10} />
                </span>
              </ExternalLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
