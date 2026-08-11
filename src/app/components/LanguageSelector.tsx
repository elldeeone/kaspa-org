"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { buildLanguageHref, usePathname } from "@/i18n/navigation";
import { shouldBypassLocaleRouting } from "@/i18n/proxy-policy";

import {
  isLanguageSelectorLocale,
  isLanguageSelectorEnabled,
  LANGUAGE_SELECTOR_OPTIONS,
  type LanguageSelectorLocale,
} from "./language-selector-model";

function LanguageIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15.3 15.3 0 0 1 0 18" />
      <path d="M12 3a15.3 15.3 0 0 0 0 18" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function EnabledLanguageSelector({
  compact = false,
}: {
  compact?: boolean;
}): React.JSX.Element | null {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("shared.navigation.language");
  const generatedId = useId();
  const menuId = `language-menu-${generatedId}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!menuOpen) return;

    const currentIndex = LANGUAGE_SELECTOR_OPTIONS.findIndex(
      ({ code }) => code === locale,
    );
    const focusId = window.requestAnimationFrame(() => {
      itemRefs.current[Math.max(currentIndex, 0)]?.focus({
        preventScroll: true,
      });
    });

    const closeWithoutRestoringFocus = () => setMenuOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        closeWithoutRestoringFocus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        closeWithoutRestoringFocus();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && selectorRef.current?.contains(target)) {
        return;
      }
      closeWithoutRestoringFocus();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeWithoutRestoringFocus);
    return () => {
      window.cancelAnimationFrame(focusId);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeWithoutRestoringFocus);
    };
  }, [locale, menuOpen]);

  if (
    !isLanguageSelectorEnabled ||
    !isLanguageSelectorLocale(locale) ||
    shouldBypassLocaleRouting(pathname)
  ) {
    return null;
  }

  const navigateToLocale = (nextLocale: LanguageSelectorLocale) => {
    if (nextLocale === locale) {
      setMenuOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    window.location.assign(
      buildLanguageHref(
        pathname,
        nextLocale,
        window.location.search,
        window.location.hash,
      ),
    );
  };

  const focusMenuItem = (index: number) => {
    const itemCount = LANGUAGE_SELECTOR_OPTIONS.length;
    const nextIndex = (index + itemCount) % itemCount;
    itemRefs.current[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={selectorRef}
      data-language-selector=""
      className="relative shrink-0"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("label")}
        title={t("label")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={() => setMenuOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setMenuOpen(true);
          }
        }}
        className={`text-primary flex ${
          compact ? "h-11 w-11" : "h-10 w-10"
        } cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:outline-none ${
          menuOpen ? "bg-[var(--surface)]" : ""
        }`}
      >
        <LanguageIcon />
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("label")}
          onKeyDown={(event) => {
            const activeIndex = itemRefs.current.findIndex(
              (item) => item === document.activeElement,
            );

            if (event.key === "ArrowDown") {
              event.preventDefault();
              focusMenuItem(activeIndex + 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              focusMenuItem(activeIndex - 1);
            } else if (event.key === "Home") {
              event.preventDefault();
              focusMenuItem(0);
            } else if (event.key === "End") {
              event.preventDefault();
              focusMenuItem(LANGUAGE_SELECTOR_OPTIONS.length - 1);
            }
          }}
          className="border-subtle absolute top-[calc(100%+0.5rem)] right-0 z-[90] max-h-[min(24rem,calc(100vh-6rem))] min-w-[160px] overflow-y-auto rounded-xl border p-1 shadow-xl backdrop-blur-xl"
          style={{ backgroundColor: "var(--overlay-bg)" }}
        >
          {LANGUAGE_SELECTOR_OPTIONS.map((option, index) => {
            const isCurrent = option.code === locale;

            return (
              <button
                key={option.code}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                aria-label={option.label}
                lang={option.hrefLang}
                dir={option.dir}
                tabIndex={-1}
                onClick={() => navigateToLocale(option.code)}
                className={`flex min-h-10 w-full cursor-pointer items-center justify-between gap-5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors hover:bg-[var(--surface)] focus:bg-[var(--surface)] focus:outline-none ${
                  isCurrent
                    ? "text-primary bg-[var(--surface)]"
                    : "text-secondary"
                }`}
              >
                <span>{option.label}</span>
                {isCurrent ? (
                  <span aria-hidden="true" className="flex w-3.5">
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function LanguageSelector({
  compact = false,
}: {
  compact?: boolean;
}): React.JSX.Element | null {
  if (!isLanguageSelectorEnabled) return null;
  return <EnabledLanguageSelector compact={compact} />;
}
