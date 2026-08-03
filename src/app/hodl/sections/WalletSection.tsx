"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";

import { ACCENT } from "../content";
import { ShieldKeyIcon } from "../icons";
import { JourneyStepHeader } from "../ui";
import WalletFinder from "../wallet-finder/WalletFinder";

export default function WalletSection({
  headingRef,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const t = useTranslations("hodl");

  return (
    <section
      id="wallet"
      className="scroll-mt-32 px-6 py-20 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-32"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-7xl lg:pl-[96px]">
        <JourneyStepHeader
          step={1}
          title={t("wallet.heading")}
          description={t("wallet.description")}
          headingRef={headingRef}
        />

        <WalletFinder />

        <div className="mt-6 flex items-start gap-3 rounded-[24px] bg-black/[0.03] px-5 py-4 dark:bg-white/[0.03]">
          <div className="mt-0.5 shrink-0" style={{ color: ACCENT }}>
            <ShieldKeyIcon />
          </div>
          <p className="text-secondary text-[14px] leading-[1.7]">
            <strong className="text-primary font-medium">
              {t("wallet.safety.label")}
            </strong>{" "}
            {t("wallet.safety.body")}
          </p>
        </div>
      </div>
    </section>
  );
}
