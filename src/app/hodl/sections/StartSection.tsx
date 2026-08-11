"use client";

import { useTranslations } from "next-intl";

import { ACCENT, accentAlpha } from "../content";

export default function StartSection() {
  const t = useTranslations("hodl");

  return (
    <section
      id="start"
      className="relative scroll-mt-32 px-6 pt-28 pb-0 md:px-12 lg:px-20 lg:pt-36"
    >
      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-2xl lg:text-left">
          <h1 className="text-[40px] leading-[0.94] font-bold tracking-[-0.04em] sm:text-[48px] md:text-[64px] lg:text-[72px]">
            {t.rich("start.heading", {
              flicker: (chunks) => (
                <span className="relative inline-block">{chunks}</span>
              ),
              source: (chunks) => (
                <span className="animate-flicker-out">{chunks}</span>
              ),
              replacement: (chunks) => (
                <span
                  className="animate-flicker-in absolute top-0 left-0 opacity-0"
                  style={{
                    color: ACCENT,
                    textShadow: `0 0 12px ${accentAlpha(0.5)}`,
                  }}
                >
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="text-secondary mt-5 text-[17px] leading-[1.72] sm:text-[18px] md:text-[20px]">
            {t("start.tagline")}
          </p>
        </div>
      </div>
    </section>
  );
}
