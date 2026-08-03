"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/link";

import { navLinks } from "./navLinks";

type NavLinksListProps = {
  linkClassName: string;
  disabledClassName: string;
  onNavigate?: () => void;
  tabIndex?: number;
};

export default function NavLinksList({
  linkClassName,
  disabledClassName,
  onNavigate,
  tabIndex,
}: NavLinksListProps): React.JSX.Element {
  const t = useTranslations("shared.navigation.links");

  return (
    <>
      {navLinks.map((link) => {
        const label = t(link.id);
        if (link.disabled) {
          return (
            <span
              key={link.id}
              className={disabledClassName}
              aria-disabled="true"
            >
              {label}
            </span>
          );
        }

        if (link.external) {
          return (
            <a
              key={link.id}
              href={link.href}
              onClick={onNavigate}
              className={linkClassName}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={tabIndex}
            >
              {label}
            </a>
          );
        }

        return (
          <Link
            key={link.id}
            href={link.href}
            onClick={onNavigate}
            className={linkClassName}
            tabIndex={tabIndex}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
