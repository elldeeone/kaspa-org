"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

const TOOLTIP_WIDTH = 224;

export default function InfoTooltip({
  children,
  text,
  ariaLabel,
}: {
  children?: ReactNode;
  text?: string;
  ariaLabel?: string;
}) {
  const t = useTranslations("hodl");
  const [visible, setVisible] = useState(false);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const open = () => {
    if (ref.current) {
      setTipRect(ref.current.getBoundingClientRect());
      setVisible(true);
    }
  };

  const close = () => setVisible(false);

  useEffect(() => {
    if (!visible) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setVisible(false);
      }
    };
    const handleScroll = () => setVisible(false);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer, { passive: true });
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [visible]);

  const tooltipLeft = tipRect
    ? Math.max(
        8,
        Math.min(
          window.innerWidth - TOOLTIP_WIDTH - 8,
          tipRect.right - TOOLTIP_WIDTH,
        ),
      )
    : 0;

  return (
    <>
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-expanded={visible}
        aria-label={ariaLabel ?? t("walletFinder.common.moreInformation")}
        className="inline-flex shrink-0 cursor-pointer items-center"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") open();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") close();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (visible) close();
          else open();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            if (visible) close();
            else open();
          } else if (event.key === "Escape") {
            close();
          }
        }}
      >
        <svg
          className="h-[14px] w-[14px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm9-2.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 7a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V7z"
          />
        </svg>
      </span>
      {visible &&
        tipRect &&
        createPortal(
          <div
            className="fixed z-[9999] w-56 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg)] p-3 text-[11px] leading-[1.5] text-[var(--text-secondary)] shadow-md"
            style={{
              top: tipRect.bottom + 6,
              left: tooltipLeft,
            }}
          >
            {children ?? text}
          </div>,
          document.body,
        )}
    </>
  );
}
