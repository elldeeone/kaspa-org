"use client";

import { useMemo, useRef } from "react";

import { isKaspaAiEnabled } from "../aiFeature";
import AiLauncherEntry from "../components/AiLauncherEntry";
import MarketingPageShell from "../components/MarketingPageShell";
import { openKaspaAi } from "../components/aiLauncherEvents";
import PageSectionsNav from "../components/page-sections/PageSectionsNav";
import { useFloatingSectionNav } from "../components/page-sections/useFloatingSectionNav";
import { mobileSectionLinks, sectionLinks, type UseSectionId } from "./content";
import BuySection from "./sections/BuySection";
import HelpSection from "./sections/HelpSection";
import JourneyRail, { type JourneyRailStep } from "./sections/JourneyRail";
import StartSection from "./sections/StartSection";
import TransferSection from "./sections/TransferSection";
import WalletSection from "./sections/WalletSection";
import { StepConnector } from "./ui";

export default function HodlPage() {
  const walletHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const buyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const transferHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const nav = useFloatingSectionNav<UseSectionId>({
    links: mobileSectionLinks,
    initialSection: "start",
  });

  const journeySteps = useMemo<JourneyRailStep[]>(
    () => [
      {
        id: "wallet",
        step: 1,
        background: "var(--surface)",
        headingRef: walletHeadingRef,
      },
      {
        id: "buy",
        step: 2,
        background: "var(--bg)",
        headingRef: buyHeadingRef,
      },
      {
        id: "transfer",
        step: 3,
        background: "var(--surface)",
        headingRef: transferHeadingRef,
      },
    ],
    [],
  );

  const handleOpenAi = (prompt?: string) => {
    openKaspaAi(prompt ? { prompt } : undefined);
  };

  return (
    <MarketingPageShell
      afterFooter={isKaspaAiEnabled ? <AiLauncherEntry /> : null}
    >
      <PageSectionsNav<UseSectionId>
        sheetId="mobile-section-sheet-hodl"
        sectionLinks={sectionLinks}
        mobileSectionLinks={mobileSectionLinks}
        activeSection={nav.activeSection}
        activeSectionLink={nav.activeSectionLink}
        showSectionNav={nav.showSectionNav}
        sectionNavIdle={nav.sectionNavIdle}
        mobileNavOpen={nav.mobileNavOpen}
        mobileCurrentLabel={
          nav.activeSection === "start"
            ? "HODL"
            : nav.activeSectionLink.compactLabel
        }
        onNavInteract={nav.markSectionNavActive}
        onOpenMobileNav={nav.openMobileNav}
        onCloseMobileNav={nav.closeMobileNav}
        onHashClick={nav.handleHashClick}
        sheetLinkLabelKey="compactLabel"
      />

      <StartSection />
      <StepConnector />

      <JourneyRail steps={journeySteps}>
        <WalletSection headingRef={walletHeadingRef} />
        <StepConnector />
        <BuySection headingRef={buyHeadingRef} />
        <StepConnector />
        <TransferSection headingRef={transferHeadingRef} />
      </JourneyRail>

      <HelpSection kaspaAiEnabled={isKaspaAiEnabled} onOpenAi={handleOpenAi} />
    </MarketingPageShell>
  );
}
