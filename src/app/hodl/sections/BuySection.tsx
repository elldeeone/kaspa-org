"use client";

import { useTranslations } from "next-intl";
import type { RefObject } from "react";

import ExternalLink from "../../components/ExternalLink";
import { exchanges } from "../content";
import { JourneyStepHeader } from "../ui";

export default function BuySection({
  headingRef,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const t = useTranslations("hodl");

  return (
    <section
      id="buy"
      className="scroll-mt-32 px-6 py-20 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-32"
    >
      <div className="mx-auto max-w-7xl lg:pl-[96px]">
        <JourneyStepHeader
          step={2}
          title={t("buy.heading")}
          description={t("buy.description")}
          headingRef={headingRef}
        />

        <div className="mt-12">
          <div className="grid grid-cols-4 overflow-hidden rounded-[20px] lg:grid-cols-8">
            {exchanges.map((exchange) => (
              <ExternalLink
                key={exchange.name}
                href={exchange.url}
                className="group relative flex aspect-square items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: exchange.bg }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={exchange.logo}
                  alt={exchange.name}
                  width={exchange.logoWidth}
                  height={exchange.logoHeight}
                  className="h-auto w-[60%] max-w-[120px]"
                />
              </ExternalLink>
            ))}
            <div
              className="text-primary col-span-2 flex items-center justify-center text-[clamp(16px,2vw,24px)] font-semibold"
              style={{ background: "var(--surface)" }}
            >
              {t("buy.moreExchanges", { count: 50 })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
