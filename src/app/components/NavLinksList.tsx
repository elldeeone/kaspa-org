"use client";

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
  return (
    <>
      {navLinks.map((link) => {
        if (link.disabled) {
          return (
            <span
              key={link.label}
              className={disabledClassName}
              aria-disabled="true"
            >
              {link.label}
            </span>
          );
        }

        if (link.external) {
          return (
            <a
              key={link.label}
              href={link.href}
              onClick={onNavigate}
              className={linkClassName}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={tabIndex}
            >
              {link.label}
            </a>
          );
        }

        return (
          <Link
            key={link.label}
            href={link.href}
            onClick={onNavigate}
            className={linkClassName}
            tabIndex={tabIndex}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
