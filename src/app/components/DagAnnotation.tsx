"use client";

import { Rock_Salt } from "next/font/google";
import type { ReactNode } from "react";

const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

export default function DagAnnotation({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute select-none"
      style={{
        top: "12%",
        right: "18%",
        zIndex: 5,
        transform: "rotate(-3deg)",
      }}
    >
      {/* Handwritten text */}
      <p
        className={rockSalt.className}
        style={{
          color: "#d63031",
          fontSize: "clamp(10px, 1.05vw, 19px)",
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
