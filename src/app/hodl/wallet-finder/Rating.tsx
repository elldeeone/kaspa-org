"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ACCENT } from "../content";
import { WALLET_CHECK_RATINGS } from "./taxonomy";
import type { WalletCheckRating, WalletCriterion } from "./types";
import { getRatingExplanationKey } from "./walletMetadata";

const RATING_META = {
  good: { color: ACCENT },
  acceptable: { color: "rgb(90, 165, 90)" },
  caution: { color: "rgb(210, 130, 30)" },
  not_applicable: { color: "rgba(160,160,170,0.5)" },
} as const satisfies Record<WalletCheckRating, { color: string }>;

const TOOLTIP_WIDTH = 240;

export function RatingSymbol({ rating }: { rating: WalletCheckRating }) {
  if (rating === "good") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill={RATING_META.good.color} />
      </svg>
    );
  }
  if (rating === "acceptable") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16">
        <path d="M2 14L14 14L14 2z" fill={RATING_META.acceptable.color} />
      </svg>
    );
  }
  if (rating === "caution") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16">
        <path d="M8 2L15 14H1z" fill={RATING_META.caution.color} />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16">
      <rect
        x="5"
        y="5"
        width="6"
        height="6"
        rx="1"
        fill={RATING_META.not_applicable.color}
      />
    </svg>
  );
}

export function RatingTooltip({
  rating,
  criterion,
  children,
  className,
}: {
  rating: WalletCheckRating;
  criterion: WalletCriterion;
  children?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("hodl");
  const [visible, setVisible] = useState(false);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const explanationKey = getRatingExplanationKey(criterion, rating);
  const explanation = explanationKey ? t(explanationKey) : undefined;

  const criterionLabel = t(`walletFinder.criteria.${criterion}.label`);
  const ratingLabel = t(`walletFinder.ratings.${rating}`);

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
          tipRect.left + tipRect.width / 2 - TOOLTIP_WIDTH / 2,
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
        aria-label={t("walletFinder.ratings.aria", {
          criterion: criterionLabel,
          rating: ratingLabel,
        })}
        className={`inline-flex cursor-pointer ${className ?? ""}`}
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
        {children ?? <RatingSymbol rating={rating} />}
      </span>
      {visible &&
        tipRect &&
        explanation &&
        createPortal(
          <div
            className="fixed z-[9999] w-60 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg)] p-3 text-[11px] leading-[1.5] text-[var(--text-secondary)] shadow-md"
            style={{
              top: tipRect.bottom + 6,
              left: tooltipLeft,
            }}
          >
            <p
              className="mb-1 text-[10px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: RATING_META[rating].color }}
            >
              {t("walletFinder.ratings.tooltipHeading", {
                criterion: criterionLabel,
                rating: ratingLabel,
              })}
            </p>
            <p>{explanation}</p>
          </div>,
          document.body,
        )}
    </>
  );
}

export function RatingLegend({
  className = "mt-6 flex flex-wrap gap-5",
}: {
  className?: string;
} = {}) {
  const t = useTranslations("hodl");

  return (
    <div className={className}>
      {WALLET_CHECK_RATINGS.map((rating) => (
        <div key={rating} className="flex items-center gap-1.5">
          <RatingSymbol rating={rating} />
          <span className="text-secondary text-[12.5px]">
            {t(`walletFinder.ratings.${rating}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
