"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";

import { accentAlpha, KASPIUM_SCREENSHOT_SRC } from "./content";

export function StepConnector() {
  return <div className="h-16 md:h-20" aria-hidden="true" />;
}

export function JourneyStepHeader({
  step,
  title,
  description,
  headingRef,
}: {
  step: number;
  title: string;
  description: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 lg:hidden">
        <span
          className="text-[48px] leading-none font-bold tracking-[-0.04em] md:text-[64px]"
          style={{ color: accentAlpha(0.25) }}
        >
          {step}
        </span>
        <h2 className="text-[28px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[36px]">
          {title}
        </h2>
      </div>
      <h2
        ref={headingRef}
        className="hidden text-[28px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[36px] lg:block"
      >
        {title}
      </h2>
      <p className="text-tertiary mt-4 text-[16px] leading-[1.72] md:text-[17px]">
        {description}
      </p>
    </div>
  );
}

export function PhoneFrame({
  className = "",
  frameClassName = "",
}: {
  className?: string;
  frameClassName?: string;
}) {
  const t = useTranslations("hodl");

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative aspect-[230/498] overflow-hidden rounded-[34px] border-[6px] border-[rgba(26,26,30,0.1)] bg-[#f5f5f7] ${frameClassName}`}
      >
        <Image
          src={KASPIUM_SCREENSHOT_SRC}
          alt={t("media.kaspiumScreenshotAlt")}
          fill
          priority
          sizes="(min-width: 1024px) 240px, (min-width: 768px) 260px, 248px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
