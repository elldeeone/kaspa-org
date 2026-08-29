import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { PageSectionLink } from "../components/page-sections/types";
import { BUILD_TERMS } from "./constants";
import type { SectionId, StartRoute } from "./types";

export function useBuildNavigation(): {
  startRoutes: StartRoute[];
  sectionLinks: PageSectionLink<SectionId>[];
  mobileSectionLinks: PageSectionLink<SectionId>[];
} {
  const t = useTranslations("build");

  return useMemo(() => {
    const startRoutes: StartRoute[] = [
      {
        title: t("start.quickstart.routes.chainData"),
        href: "#try-live",
      },
      { title: t("start.quickstart.routes.stack"), href: "#paths" },
      { title: t("start.quickstart.routes.node"), href: "#run-a-node" },
    ];
    const sectionLinks: PageSectionLink<SectionId>[] = [
      {
        id: "try-live",
        label: t("navigation.sections.tryLive.label"),
        compactLabel: t("navigation.sections.tryLive.compactLabel"),
        href: "#try-live",
        description: t("navigation.sections.tryLive.description"),
      },
      {
        id: "paths",
        label: t("navigation.sections.paths.label"),
        compactLabel: t("navigation.sections.paths.compactLabel"),
        href: "#paths",
        description: t("navigation.sections.paths.description"),
      },
      {
        id: "run-a-node",
        label: t("navigation.sections.runNode.label"),
        compactLabel: t("navigation.sections.runNode.compactLabel"),
        href: "#run-a-node",
        description: t("navigation.sections.runNode.description", {
          docker: BUILD_TERMS.docker,
          rustyKaspa: BUILD_TERMS.rustyKaspa,
        }),
      },
      {
        id: "tooling",
        label: t("navigation.sections.tooling.label"),
        compactLabel: t("navigation.sections.tooling.compactLabel"),
        href: "#tooling",
        description: t("navigation.sections.tooling.description"),
      },
      {
        id: "access",
        label: t("navigation.sections.access.label"),
        compactLabel: t("navigation.sections.access.compactLabel"),
        href: "#access",
        description: t("navigation.sections.access.description"),
      },
      {
        id: "developments",
        label: t("navigation.sections.developments.label"),
        compactLabel: t("navigation.sections.developments.compactLabel"),
        href: "#developments",
        description: t("navigation.sections.developments.description"),
      },
      {
        id: "help",
        label: t("navigation.sections.help.label"),
        compactLabel: t("navigation.sections.help.compactLabel"),
        href: "#help",
        description: t("navigation.sections.help.description"),
      },
    ];
    const mobileSectionLinks: PageSectionLink<SectionId>[] = [
      {
        id: "start",
        label: t("navigation.sections.start.label"),
        compactLabel: t("navigation.sections.start.compactLabel"),
        href: "#start",
        description: t("navigation.sections.start.description"),
      },
      ...sectionLinks,
    ];

    return { mobileSectionLinks, sectionLinks, startRoutes };
  }, [t]);
}
