"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { ACCENT } from "../content";
import { WALLET_DISPLAY_RATINGS } from "./taxonomy";
import type {
  WalletCriterion,
  WalletDisplayRating,
  WalletRatingBreakdownItem,
} from "./types";
import { getRatingExplanationKey } from "./walletMetadata";

const RATING_META = {
  good: { color: ACCENT },
  acceptable: { color: "rgb(90, 165, 90)" },
  mixed: { color: "rgb(170, 145, 55)" },
  caution: { color: "rgb(210, 130, 30)" },
  not_applicable: { color: "rgba(160,160,170,0.5)" },
} as const satisfies Record<WalletDisplayRating, { color: string }>;

const TOOLTIP_WIDTH = 240;

export function RatingSymbol({ rating }: { rating: WalletDisplayRating }) {
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
  if (rating === "mixed") {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16">
        <path d="M8 1a7 7 0 0 0 0 14z" fill={RATING_META.mixed.color} />
        <path
          d="M8 1a7 7 0 0 1 0 14z"
          fill={RATING_META.mixed.color}
          fillOpacity="0.4"
        />
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
  breakdown = [],
}: {
  rating: WalletDisplayRating;
  criterion: WalletCriterion;
  children?: ReactNode;
  className?: string;
  breakdown?: WalletRatingBreakdownItem[];
}) {
  const t = useTranslations("hodl");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const hasBreakdown = breakdown.length > 0;

  const explanationKey =
    rating === "mixed" ? undefined : getRatingExplanationKey(criterion, rating);
  const explanation =
    rating === "mixed"
      ? criterion === "transparency" && hasBreakdown
        ? t("walletFinder.ratings.explanations.transparency.mixed")
        : t("walletFinder.ratings.mixedExplanation")
      : explanationKey
        ? t(explanationKey)
        : undefined;

  const criterionLabel = t(`walletFinder.criteria.${criterion}.label`);
  const ratingLabel = t(`walletFinder.ratings.${rating}`);
  const breakdownLabel = (item: WalletRatingBreakdownItem) =>
    item.platforms
      .map((platform) => {
        const platformLabel = t(`walletFinder.operatingSystems.${platform}`);
        if (criterion !== "transparency") return platformLabel;
        return platform === "hardware"
          ? t("walletFinder.transparencySurfaces.firmware")
          : t("walletFinder.transparencySurfaces.application", {
              platform: platformLabel,
            });
      })
      .join(" / ");
  const breakdownReasons = Array.from(
    breakdown.reduce((groups, item) => {
      const labels = groups.get(item.rating) ?? [];
      labels.push(breakdownLabel(item));
      groups.set(item.rating, labels);
      return groups;
    }, new Map<WalletRatingBreakdownItem["rating"], string[]>()),
  ).flatMap(([itemRating, labels]) => {
    const key = getRatingExplanationKey(criterion, itemRating);
    return key ? [{ itemRating, labels, explanation: t(key) }] : [];
  });
  const breakdownList = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  });
  const tooltipWidth = hasBreakdown ? 300 : TOOLTIP_WIDTH;

  const cancelClose = () => window.clearTimeout(closeTimerRef.current);

  const open = () => {
    cancelClose();
    if (ref.current) {
      setTipRect(ref.current.getBoundingClientRect());
      setVisible(true);
    }
  };

  const close = () => {
    cancelClose();
    setVisible(false);
  };

  const scheduleMouseClose = (event: { pointerType: string }) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    closeTimerRef.current = window.setTimeout(close, 100);
  };

  useEffect(() => {
    if (!visible) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        !ref.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        setVisible(false);
      }
    };
    const handleScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        tooltipRef.current?.contains(event.target)
      ) {
        return;
      }
      setVisible(false);
    };
    const handleResize = () => setVisible(false);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer, { passive: true });
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      cancelClose();
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !tipRect || !tooltipRef.current) return;

    const padding = 8;
    const gap = 6;
    const tooltipHeight = tooltipRef.current.getBoundingClientRect().height;
    const below = tipRect.bottom + gap;
    const above = tipRect.top - tooltipHeight - gap;

    if (below + tooltipHeight <= window.innerHeight - padding) return;
    if (above >= padding) {
      tooltipRef.current.style.top = `${above}px`;
      return;
    }

    tooltipRef.current.style.top = `${padding}px`;
    tooltipRef.current.style.left = `${
      tipRect.left - tooltipWidth - gap >= padding
        ? tipRect.left - tooltipWidth - gap
        : Math.min(
            tipRect.right + gap,
            window.innerWidth - tooltipWidth - padding,
          )
    }px`;
  }, [tipRect, tooltipWidth, visible]);

  const tooltipLeft = tipRect
    ? Math.max(
        8,
        Math.min(
          window.innerWidth - tooltipWidth - 8,
          tipRect.left + tipRect.width / 2 - tooltipWidth / 2,
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
        onPointerLeave={scheduleMouseClose}
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
            ref={tooltipRef}
            role="tooltip"
            tabIndex={0}
            className={`fixed z-[9999] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg)] p-3 text-[11px] leading-[1.5] text-[var(--text-secondary)] shadow-md ${hasBreakdown ? "w-[300px]" : "w-60"}`}
            style={{
              top: tipRect.bottom + 6,
              left: tooltipLeft,
            }}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleMouseClose}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                close();
                ref.current?.focus();
              }
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
            {hasBreakdown && (
              <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
                <p className="mb-1.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--text-muted)] uppercase">
                  {t("walletFinder.ratings.breakdown")}
                </p>
                <ul className="space-y-1.5">
                  {breakdown.map((item) => {
                    return (
                      <li
                        key={item.platforms.join("-")}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{breakdownLabel(item)}</span>
                        <span className="grid w-[88px] shrink-0 grid-cols-[16px_1fr] items-center gap-1.5 font-medium whitespace-nowrap">
                          <RatingSymbol rating={item.rating} />
                          {t(
                            item.rating === "not_applicable"
                              ? "walletFinder.ratings.notApplicableCompact"
                              : `walletFinder.ratings.${item.rating}`,
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {breakdownReasons.length > 0 && (
                  <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
                    <p className="mb-1.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--text-muted)] uppercase">
                      {t("walletFinder.ratings.why")}
                    </p>
                    <ul className="space-y-1.5">
                      {breakdownReasons.map(
                        ({ itemRating, labels, explanation }) => (
                          <li key={itemRating}>
                            <span className="font-medium text-[var(--text-primary)]">
                              {breakdownList.format(labels)}:
                            </span>{" "}
                            {explanation}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
      {WALLET_DISPLAY_RATINGS.map((rating) => (
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
