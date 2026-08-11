import { useTranslations } from "next-intl";

import FooterGlyph from "./FooterGlyph";
import { ArrowUpRightIcon } from "./icons";

const footerLinks = [
  { id: "explorer", href: "https://kaspa.stream/" },
  { id: "github", href: "https://github.com/kaspanet/rusty-kaspa/" },
  { id: "x", href: "https://x.com/search?q=kaspa" },
] as const;

export default function Footer({
  reserveLauncherSpace = false,
}: {
  reserveLauncherSpace?: boolean;
}) {
  const t = useTranslations("shared.footer");

  return (
    <footer
      className={`border-subtle relative z-20 border-t ${
        reserveLauncherSpace ? "mb-14 sm:mb-16" : ""
      }`}
      style={{ background: "var(--bg)" }}
    >
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-6 pt-3 pb-3 md:flex md:flex-row md:items-center md:justify-between md:gap-4 md:px-12 lg:px-20">
        <FooterGlyph />
        <span className="text-tertiary min-w-0 px-1 text-center text-[11px] leading-tight md:pointer-events-none md:absolute md:inset-x-0 md:px-0 md:text-[12px] md:leading-normal">
          <span className="md:pointer-events-auto">
            {t.rich("operatedBy", {
              operator: (children) => (
                <a
                  href="https://kasmedia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-secondary underline underline-offset-2 transition-colors"
                >
                  {children}
                </a>
              ),
            })}
          </span>
        </span>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 sm:gap-x-6">
          {footerLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-secondary hover:text-primary relative z-30 -mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 text-[13px] transition-colors"
            >
              {t(`links.${link.id}`)}
              <span className="opacity-30 transition-opacity group-hover:opacity-70">
                <ArrowUpRightIcon size={10} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
