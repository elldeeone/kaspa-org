"use client";

import { Caveat, Rock_Salt } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { getDagAnnotationFontContract } from "@/i18n/dag-annotation-font";
import type { Locale } from "@/i18n/locale-registry";

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

const caveat = Caveat({
  subsets: ["cyrillic"],
  weight: ["400"],
  preload: false,
});

const maShanZheng = localFont({
  src: "../fonts/MaShanZheng-Regular.ttf",
  weight: "400",
  preload: false,
});

const yomogi = localFont({
  src: "../fonts/Yomogi-Regular.ttf",
  weight: "400",
  preload: false,
});

const fontClassNames = {
  Caveat: caveat.className,
  "Ma Shan Zheng": maShanZheng.className,
  "Rock Salt": rockSalt.className,
  Yomogi: yomogi.className,
} as const;

export default function DagAnnotation({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const font = getDagAnnotationFontContract(locale);

  return (
    <div
      className="pointer-events-none absolute select-none"
      style={{
        top: "12%",
        right: "18%",
        minWidth: "clamp(140px, 12.1vw, 220px)",
        zIndex: 5,
        transform: "rotate(-3deg)",
      }}
    >
      {/* Handwritten text */}
      <p
        className={fontClassNames[font.family]}
        style={{
          color: "#d63031",
          fontSize: font.fontSize,
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: "0.01em",
        }}
      >
        {children}
      </p>

      {/* Arrow — diagonal down-left like the handwritten version */}
      <svg
        width="clamp(20px, 2vw, 36px)"
        height="clamp(32px, 3.2vw, 56px)"
        viewBox="0 0 80 120"
        fill="none"
        className="mt-3 ml-[25%]"
      >
        {/* Straight diagonal shaft */}
        <line
          x1="65"
          y1="5"
          x2="20"
          y2="95"
          stroke="#d63031"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* V arrowhead */}
        <line
          x1="20"
          y1="95"
          x2="15"
          y2="72"
          stroke="#d63031"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="20"
          y1="95"
          x2="40"
          y2="82"
          stroke="#d63031"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
