"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";

import { GenesisQr } from "../GenesisQr";
import { ACCENT } from "../content";
import {
  CopyIcon,
  PaperPlaneIcon,
  SecurityIcon,
  TimeCircleIcon,
  VaultIcon,
} from "../icons";
import { JourneyStepHeader } from "../ui";

export default function TransferSection({
  headingRef,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const t = useTranslations("hodl");
  const transferSteps = [
    {
      step: "01",
      title: t("transfer.steps.receiveAddress.title"),
      desc: t("transfer.steps.receiveAddress.description"),
      icon: CopyIcon,
    },
    {
      step: "02",
      title: t("transfer.steps.testTransaction.title"),
      desc: t("transfer.steps.testTransaction.description"),
      icon: PaperPlaneIcon,
    },
    {
      step: "03",
      title: t("transfer.steps.balance.title"),
      desc: t("transfer.steps.balance.description"),
      icon: VaultIcon,
    },
  ];

  return (
    <section
      id="transfer"
      className="scroll-mt-32 px-6 py-20 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-32"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-7xl lg:pl-[96px]">
        <JourneyStepHeader
          step={3}
          title={t("transfer.heading")}
          description={t("transfer.description")}
          headingRef={headingRef}
        />

        <div
          role="img"
          aria-label={t("transfer.screenReaderDiagram")}
          className="border-subtle relative mt-12 flex h-[180px] w-full items-center justify-between overflow-hidden rounded-[30px] border bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--accent)_5%,transparent)] to-transparent px-[8%] shadow-[inset_0_1px_10px_rgba(0,0,0,0.02)] sm:h-[220px] sm:px-[15%] md:h-[280px]"
        >
          <div
            className="relative z-20 flex w-[96px] shrink-0 flex-col rounded-[14px] border border-black/5 bg-white p-2.5 opacity-90 shadow-xl backdrop-blur-md sm:w-[134px] sm:rounded-[18px] sm:p-3.5 dark:border-white/5 dark:bg-[#111113]"
            style={{
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.02) inset",
            }}
          >
            <div className="mb-2 flex h-[14px] w-full items-center justify-between sm:mb-3 sm:h-[16px]">
              <div className="h-1.5 w-10 rounded-full bg-gray-200 sm:h-2 sm:w-14" />
            </div>

            <div className="mb-0 flex aspect-square w-full flex-col gap-1.5 border border-transparent p-1 sm:gap-2 sm:p-1.5">
              <div className="flex-1 rounded-[4px] border border-black/5 bg-gray-50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] sm:rounded dark:border-white/5 dark:bg-zinc-800/80" />
              <div className="flex-1 rounded-[4px] border border-black/5 bg-gray-50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] sm:rounded dark:border-white/5 dark:bg-zinc-800/80" />
            </div>

            <div
              className="mt-auto flex h-[18px] w-full shrink-0 items-center justify-center rounded-md sm:h-[24px]"
              style={{ background: ACCENT }}
            >
              <div className="h-1.5 w-1/2 rounded-full bg-white opacity-40 sm:h-2" />
            </div>
          </div>

          <div className="z-30 mx-3 flex min-w-0 flex-1 items-center opacity-90 sm:mx-6">
            <div
              className="h-[2px] flex-1 bg-repeat-x"
              style={{
                backgroundImage: `linear-gradient(to right, ${ACCENT} 50%, transparent 50%)`,
                backgroundSize: "10px 2px",
              }}
            />
            <svg
              width="10"
              height="14"
              viewBox="0 0 10 14"
              fill="none"
              className="-ml-[2px] shrink-0"
              style={{ zIndex: 35 }}
            >
              <path
                d="M1 1L8 7L1 13"
                stroke={ACCENT}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div
            className="relative z-20 flex w-[96px] shrink-0 flex-col items-center justify-start rounded-[14px] border border-black/5 bg-white p-2.5 shadow-xl sm:w-[134px] sm:rounded-[18px] sm:p-3.5 dark:border-white/5 dark:bg-[#111113]"
            style={{
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.05) inset",
            }}
          >
            <div className="mb-2 flex h-[14px] w-full items-center justify-between sm:mb-3 sm:h-[16px]">
              <span className="text-primary text-[10px] font-semibold tracking-wide sm:text-[12px]">
                {t("transfer.receive")}
              </span>
              <span
                className="h-1.5 w-1.5 rounded-full opacity-60"
                style={{ background: ACCENT }}
              />
            </div>

            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-black/5 bg-white p-1.5 shadow-sm sm:p-2">
              <GenesisQr className="h-full w-full text-black" />
            </div>

            <div className="text-tertiary hover:text-primary mt-2 w-full shrink-0 cursor-default truncate rounded-md bg-black/5 px-1.5 py-1 text-center font-mono text-[7px] transition-colors sm:mt-2.5 sm:px-2 sm:py-1.5 sm:text-[9px] dark:bg-white/5">
              kaspa:qrge...3a2w
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:mt-14 lg:grid-cols-3">
          {transferSteps.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group rounded-[22px] border border-transparent bg-[#F7F7F7] px-5 py-5 transition-all duration-300 hover:-translate-y-[2px] hover:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] dark:border-[rgba(255,255,255,0.04)] dark:bg-[rgba(255,255,255,0.02)]"
              >
                <div className="flex items-start gap-4">
                  <div className="border-subtle mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors duration-300 group-hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] group-hover:text-[var(--accent)] dark:bg-[#1a1a1e]">
                    <Icon />
                  </div>
                  <div>
                    <span
                      className="mb-1.5 block text-[11px] font-bold tracking-[0.1em] uppercase opacity-80"
                      style={{ color: ACCENT }}
                    >
                      {t("transfer.stepLabel", { step: item.step })}
                    </span>
                    <h3 className="text-[17px] leading-[1.2] font-medium tracking-[-0.02em] md:text-[18px]">
                      {item.title}
                    </h3>
                    <p className="text-tertiary mt-2 text-[14px] leading-[1.65]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-start gap-4 rounded-[24px] bg-black/[0.03] px-5 py-4 dark:bg-white/[0.03]">
            <div
              className="mt-[3px] flex w-5 shrink-0 justify-center"
              style={{ color: ACCENT }}
            >
              <TimeCircleIcon />
            </div>
            <p className="text-secondary flex-1 text-[14px] leading-[1.7]">
              <strong className="text-primary font-medium">
                {t("transfer.waitTimes.label")}
              </strong>{" "}
              {t("transfer.waitTimes.body")}
            </p>
          </div>

          <div className="flex items-start gap-4 rounded-[24px] bg-black/[0.03] px-5 py-4 dark:bg-white/[0.03]">
            <div
              className="mt-[3px] flex w-5 shrink-0 justify-center"
              style={{ color: ACCENT }}
            >
              <SecurityIcon />
            </div>
            <p className="text-secondary flex-1 text-[14px] leading-[1.7]">
              <strong className="text-primary font-medium">
                {t("transfer.security.label")}
              </strong>{" "}
              {t("transfer.security.body")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
