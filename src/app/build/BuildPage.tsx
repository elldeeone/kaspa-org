"use client";

import { useState } from "react";

import AiLauncherEntry from "../components/AiLauncherEntry";
import MarketingPageShell from "../components/MarketingPageShell";
import { openKaspaAi } from "../components/aiLauncherEvents";
import PageSectionsNav from "../components/page-sections/PageSectionsNav";
import { useFloatingSectionNav } from "../components/page-sections/useFloatingSectionNav";
import {
  mobileSectionLinks,
  sectionLinks,
  type BrowserExample,
  type SectionId,
} from "./content";
import AccessSection from "./sections/AccessSection";
import DevelopmentsSection from "./sections/DevelopmentsSection";
import HelpSection from "./sections/HelpSection";
import PathsSection from "./sections/PathsSection";
import RunNodeSection from "./sections/RunNodeSection";
import StartSection from "./sections/StartSection";
import ToolingSection from "./sections/ToolingSection";
import TryLiveSection from "./sections/TryLiveSection";

export default function BuildPage({ aiAvailable }: { aiAvailable: boolean }) {
  const [activeExampleId, setActiveExampleId] =
    useState<BrowserExample["id"]>("server-info");

  const nav = useFloatingSectionNav<SectionId>({
    links: mobileSectionLinks,
    initialSection: "start",
  });

  const handleOpenAi = (prompt?: string) => {
    openKaspaAi(prompt ? { prompt } : undefined);
  };

  return (
    <MarketingPageShell afterFooter={aiAvailable ? <AiLauncherEntry /> : null}>
      <PageSectionsNav<SectionId>
        sheetId="mobile-section-sheet"
        sectionLinks={sectionLinks}
        mobileSectionLinks={mobileSectionLinks}
        activeSection={nav.activeSection}
        activeSectionLink={nav.activeSectionLink}
        showSectionNav={nav.showSectionNav}
        sectionNavIdle={nav.sectionNavIdle}
        mobileNavOpen={nav.mobileNavOpen}
        mobileCurrentLabel={
          nav.activeSection === "start" ? "Build" : nav.activeSectionLink.label
        }
        onNavInteract={nav.markSectionNavActive}
        onOpenMobileNav={nav.openMobileNav}
        onCloseMobileNav={nav.closeMobileNav}
        onHashClick={nav.handleHashClick}
        sheetLinkLabelKey="label"
      />

      <StartSection
        kaspaAiEnabled={aiAvailable}
        onOpenAi={() => handleOpenAi()}
        onHashClick={nav.handleHashClick}
      />
      <TryLiveSection
        activeExampleId={activeExampleId}
        onSelectExample={setActiveExampleId}
      />
      <PathsSection onHashClick={nav.handleHashClick} />
      <RunNodeSection />
      <ToolingSection />
      <AccessSection />
      <DevelopmentsSection />
      <HelpSection kaspaAiEnabled={aiAvailable} onOpenAi={handleOpenAi} />
    </MarketingPageShell>
  );
}
