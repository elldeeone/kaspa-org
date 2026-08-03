"use client";

import { useTranslations } from "next-intl";

import { ChevronRightIcon } from "../icons";
import type { PageSectionLink } from "./types";

type SectionNavMobileBarProps<T extends string> = {
  activeSectionLink: PageSectionLink<T>;
  currentLabel: string;
  showSectionNav: boolean;
  navStateClass: string;
  mobileNavOpen: boolean;
  onNavInteract: () => void;
  onOpenMobileNav: () => void;
  sheetId: string;
};

export default function SectionNavMobileBar<T extends string>({
  activeSectionLink,
  currentLabel,
  showSectionNav,
  navStateClass,
  mobileNavOpen,
  onNavInteract,
  onOpenMobileNav,
  sheetId,
}: SectionNavMobileBarProps<T>): React.JSX.Element {
  const t = useTranslations("shared.pageSections");

  return (
    <div
      className={`fixed inset-x-0 top-16 z-40 transition-all duration-300 md:hidden ${
        showSectionNav
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
      inert={!showSectionNav}
    >
      <div
        className={`border-subtle border-b transition-opacity duration-500 ${navStateClass}`}
        style={{ background: "var(--surface)" }}
        onFocusCapture={onNavInteract}
        onPointerDown={onNavInteract}
      >
        <div className="mx-auto flex h-10 max-w-6xl items-center gap-3 px-5 sm:px-6">
          <button
            type="button"
            aria-expanded={mobileNavOpen}
            aria-controls={sheetId}
            aria-label={t("openAria", { section: activeSectionLink.label })}
            onClick={onOpenMobileNav}
            className="text-secondary hover:text-primary inline-flex shrink-0 items-center gap-2 transition-colors"
          >
            <span className="text-muted shrink-0 text-[10px] font-medium tracking-[0.12em] uppercase">
              {t("onThisPage")}
            </span>
            <span className="text-muted">
              <ChevronRightIcon size={10} />
            </span>
          </button>
          <span className="h-3.5 w-px shrink-0 bg-[var(--border-subtle)]" />
          <span className="text-secondary min-w-0 truncate text-[12px] font-medium sm:text-[13px]">
            {currentLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
