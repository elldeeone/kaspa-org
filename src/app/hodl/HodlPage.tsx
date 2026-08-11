"use client";

import { useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

import { openKaspaAi } from "../components/aiLauncherEvents";
import PageSectionsNav from "../components/page-sections/PageSectionsNav";
import type { PageSectionLink } from "../components/page-sections/types";
import { useFloatingSectionNav } from "../components/page-sections/useFloatingSectionNav";
import type { UseSectionId } from "./content";
import BuySection from "./sections/BuySection";
import HelpSection from "./sections/HelpSection";
import JourneyRail, { type JourneyRailStep } from "./sections/JourneyRail";
import StartSection from "./sections/StartSection";
import TransferSection from "./sections/TransferSection";
import WalletSection from "./sections/WalletSection";
import { StepConnector } from "./ui";
import type { KaspaWallet } from "./wallet-finder/types";

export default function HodlPage({
  aiAvailable,
  wallets,
}: {
  aiAvailable: boolean;
  wallets: KaspaWallet[];
}) {
  const t = useTranslations("hodl");
  const walletHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const buyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const transferHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const sectionLinks = useMemo<PageSectionLink<UseSectionId>[]>(
    () => [
      {
        id: "wallet",
        label: t("navigation.sections.wallet.label"),
        compactLabel: t("navigation.sections.wallet.compactLabel"),
        href: "#wallet",
        description: t("navigation.sections.wallet.description"),
      },
      {
        id: "buy",
        label: t("navigation.sections.buy.label"),
        compactLabel: t("navigation.sections.buy.compactLabel"),
        href: "#buy",
        description: t("navigation.sections.buy.description"),
      },
      {
        id: "transfer",
        label: t("navigation.sections.transfer.label"),
        compactLabel: t("navigation.sections.transfer.compactLabel"),
        href: "#transfer",
        description: t("navigation.sections.transfer.description"),
      },
      {
        id: "help",
        label: t("navigation.sections.help.label"),
        compactLabel: t("navigation.sections.help.compactLabel"),
        href: "#help",
        description: t("navigation.sections.help.description"),
      },
    ],
    [t],
  );

  const nav = useFloatingSectionNav<UseSectionId>({
    links: sectionLinks,
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
    <>
      <PageSectionsNav<UseSectionId>
        sheetId="mobile-section-sheet-hodl"
        sectionLinks={sectionLinks}
        mobileSectionLinks={sectionLinks}
        activeSection={nav.activeSection}
        activeSectionLink={nav.activeSectionLink}
        showSectionNav={nav.showSectionNav}
        sectionNavIdle={nav.sectionNavIdle}
        mobileNavOpen={nav.mobileNavOpen}
        mobileCurrentLabel={
          nav.activeSection === "start"
            ? t("navigation.current")
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
        <WalletSection headingRef={walletHeadingRef} wallets={wallets} />
        <StepConnector />
        <BuySection headingRef={buyHeadingRef} />
        <StepConnector />
        <TransferSection headingRef={transferHeadingRef} />
      </JourneyRail>

      <HelpSection kaspaAiEnabled={aiAvailable} onOpenAi={handleOpenAi} />
    </>
  );
}
