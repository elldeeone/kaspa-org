"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { dispatchKaspaMarkSignal } from "./kaspaMarkSignal";

const GLYPH_TAP_TARGET = 11;

export default function FooterGlyph(): React.JSX.Element {
  const t = useTranslations("shared.footer");
  const clickCountRef = useRef(0);

  function handleGlyphClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!document.documentElement.classList.contains("dark")) {
      clickCountRef.current = 0;
      return;
    }

    clickCountRef.current += 1;

    if (clickCountRef.current < GLYPH_TAP_TARGET) {
      return;
    }

    clickCountRef.current = 0;
    dispatchKaspaMarkSignal({
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  return (
    <button
      type="button"
      aria-label={t("glyphAria")}
      onClick={handleGlyphClick}
      className="silver-sweep-text -m-2 inline-flex min-h-10 min-w-10 items-center justify-center p-2 text-[20px] outline-none"
      style={
        {
          "--shimmer-spread": "0.6ch",
          "--shimmer-duration": "12s",
        } as CSSProperties
      }
    >
      {"\u{1090A}"}
    </button>
  );
}
