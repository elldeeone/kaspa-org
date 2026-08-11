"use client";

import type { MouseEventHandler } from "react";
import { useTranslations } from "next-intl";

import type { PageSectionLink } from "./types";

type SectionNavDesktopProps<T extends string> = {
  sectionLinks: readonly PageSectionLink<T>[];
  activeSection: T;
  showSectionNav: boolean;
  navStateClass: string;
  onNavInteract: () => void;
  onHashClick: (href: `#${T}`) => MouseEventHandler<HTMLAnchorElement>;
};

export default function SectionNavDesktop<T extends string>({
  sectionLinks,
  activeSection,
  showSectionNav,
  navStateClass,
  onNavInteract,
  onHashClick,
}: SectionNavDesktopProps<T>): React.JSX.Element {
  const t = useTranslations("shared.pageSections");

  return (
    <div
      className={`fixed inset-x-0 top-20 z-40 hidden transition-all duration-300 lg:block ${
        showSectionNav
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
      inert={!showSectionNav}
    >
      <div
        className={`border-subtle border-b transition-opacity duration-500 ${navStateClass}`}
        style={{ background: "var(--surface)" }}
        onMouseEnter={onNavInteract}
        onFocusCapture={onNavInteract}
        onPointerDown={onNavInteract}
      >
        <div className="px-20">
          <div className="mx-auto flex h-9 max-w-6xl items-center gap-4">
            <span className="text-muted shrink-0 text-[10px] font-medium tracking-[0.12em] uppercase">
              {t("onThisPage")}
            </span>
            <span className="h-3.5 w-px shrink-0 bg-[var(--border-subtle)]" />
            <div className="flex min-w-0 items-center gap-4">
              {sectionLinks.map((link) => {
                const active = link.id === activeSection;

                return (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={onHashClick(link.href)}
                    className={`inline-flex h-9 items-center border-b text-[13px] font-medium transition-colors ${
                      active
                        ? "text-primary border-[var(--text-primary)]"
                        : "text-secondary hover:text-primary border-transparent"
                    }`}
                  >
                    {link.compactLabel}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
