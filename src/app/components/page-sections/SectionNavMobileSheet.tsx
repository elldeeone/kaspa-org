"use client";

import type { MouseEventHandler } from "react";
import { useTranslations } from "next-intl";

import { ChevronRightIcon } from "../icons";
import type { PageSectionLink } from "./types";

type SectionNavMobileSheetProps<T extends string> = {
  sheetId: string;
  mobileNavOpen: boolean;
  activeSection: T;
  sectionLinks: readonly PageSectionLink<T>[];
  onCloseMobileNav: () => void;
  onHashClick: (href: `#${T}`) => MouseEventHandler<HTMLAnchorElement>;
  sheetLinkLabelKey?: "label" | "compactLabel";
};

export default function SectionNavMobileSheet<T extends string>({
  sheetId,
  mobileNavOpen,
  activeSection,
  sectionLinks,
  onCloseMobileNav,
  onHashClick,
  sheetLinkLabelKey = "compactLabel",
}: SectionNavMobileSheetProps<T>): React.JSX.Element {
  const t = useTranslations("shared.pageSections");

  return (
    <div
      className={`fixed inset-0 z-[70] transition-transform duration-300 md:hidden ${
        mobileNavOpen
          ? "pointer-events-auto translate-y-0"
          : "pointer-events-none translate-y-full"
      }`}
      inert={!mobileNavOpen}
    >
      <div
        id={sheetId}
        role="dialog"
        aria-modal="true"
        aria-label={t("dialogAria")}
        className="flex h-full flex-col bg-[var(--surface)]"
      >
        <div
          className="border-subtle flex items-center justify-end border-b px-5 pb-3"
          style={{
            paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <button
            type="button"
            onClick={onCloseMobileNav}
            tabIndex={mobileNavOpen ? 0 : -1}
            className="text-secondary hover:text-primary inline-flex h-9 items-center text-[13px] font-medium transition-colors"
          >
            {t("close")}
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div>
            {sectionLinks.map((link, index) => {
              const active = link.id === activeSection;

              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={onHashClick(link.href)}
                  tabIndex={mobileNavOpen ? 0 : -1}
                  className={`flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-[var(--btn-ghost-hover-bg)] ${
                    index < sectionLinks.length - 1
                      ? "border-subtle border-b"
                      : ""
                  }`}
                  style={{
                    background: active
                      ? "rgba(118, 167, 158, 0.06)"
                      : "var(--surface)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="text-primary text-[15px] font-medium tracking-[-0.02em]">
                        {link[sheetLinkLabelKey]}
                      </p>
                      {active ? (
                        <span className="text-secondary text-[11px] font-medium">
                          {t("current")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-tertiary mt-1 text-[13px] leading-[1.55]">
                      {link.description}
                    </p>
                  </div>
                  <div className="text-muted shrink-0 pt-1">
                    <ChevronRightIcon size={12} />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
