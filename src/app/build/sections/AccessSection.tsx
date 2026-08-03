import { useTranslations } from "next-intl";

import ExternalLink from "../../components/ExternalLink";
import SectionHeading from "../../components/SectionHeading";
import { KASPA_ACCENT, useNetworkAccessGroups } from "../content";
import { ArrowUpRightIcon } from "../icons";

export default function AccessSection() {
  const t = useTranslations("build.access");
  const networkAccessGroups = useNetworkAccessGroups();

  return (
    <section
      id="access"
      className="scroll-mt-32 px-6 py-16 md:scroll-mt-40 md:px-12 lg:px-20 lg:py-24"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div className="h-fit lg:sticky lg:top-32">
          <SectionHeading
            label={t("heading.label")}
            title={t("heading.title")}
            description={t("heading.description")}
          />
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-0">
          {networkAccessGroups.map((group) => (
            <div
              key={group.title}
              className="border-subtle flex flex-col rounded-[26px] border p-6"
              style={{
                background: "var(--surface)",
              }}
            >
              <div
                className="h-1 w-16 rounded-full"
                style={{ background: `rgba(${KASPA_ACCENT}, 0.32)` }}
              />
              <h3 className="mt-5 text-[22px] font-medium tracking-[-0.02em]">
                {group.title}
              </h3>
              <p className="text-tertiary mt-3 text-[15px] leading-[1.7]">
                {group.desc}
              </p>
              <div className="mt-auto pt-5">
                {group.links.map((link) => (
                  <ExternalLink
                    key={link.label}
                    href={link.href}
                    className="group/link border-subtle text-secondary hover:text-primary flex items-center justify-between border-b py-3 text-[15px] font-medium transition-colors"
                  >
                    {link.label}
                    <span className="text-muted group-hover/link:text-secondary inline-flex transition-all duration-200 group-hover/link:translate-x-[2px] group-hover/link:-translate-y-[2px]">
                      <ArrowUpRightIcon size={11} />
                    </span>
                  </ExternalLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
