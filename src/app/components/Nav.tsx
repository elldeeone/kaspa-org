"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useIsKnownPathname } from "@/i18n/link";
import { localizedDestinationInventory } from "@/i18n/manifest";
import {
  KASPA_MARK_SIGNAL,
  type KaspaMarkSignalDetail,
} from "./kaspaMarkSignal";
import LogoContextMenu, {
  LOGO_MENU_ID,
  type LogoMenuPosition,
} from "./LogoContextMenu";
import LanguageSelector from "./LanguageSelector";
import NavLinksList from "./NavLinksList";
import ThemeToggle from "./ThemeToggle";
import { useIsClient } from "./useIsClient";

const navLinkDesktop =
  "nav-link inline-flex min-h-10 items-center whitespace-nowrap py-2 text-[15px] text-secondary hover:text-primary transition-colors duration-300";
const navLinkMobile =
  "nav-link inline-flex min-h-11 items-center whitespace-nowrap py-2 text-[17px] text-secondary hover:text-primary transition-colors duration-300";
const navLinkDisabledDesktop =
  "inline-flex min-h-10 items-center whitespace-nowrap py-2 text-[15px] text-secondary";
const navLinkDisabledMobile =
  "inline-flex min-h-11 items-center whitespace-nowrap py-2 text-[17px] text-secondary";

type LogoFlight = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

function KaspaGlyphLogo(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 291.78 133.6"
      className="kaspa-mark-lock h-auto w-[116px] sm:w-[126px] md:w-[140px]"
    >
      <text
        x="66.6"
        y="80"
        fill="currentColor"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontSize="48"
        fontWeight="700"
        textAnchor="middle"
      >
        𐤊
      </text>
      <path
        fill="currentColor"
        d="M170.96,59.8c-4.02,0-7.82,1.17-10.39,2.79-.5.34-.56.62-.33,1.12l1.62,3.52c.28.61.67.61,1.23.28,1.9-1.06,4.36-2.01,6.98-2.01,1.28,0,2.46.33,3.07,1.12.56.67.78,1.62.78,2.9v.56c-3.02.22-7.04.67-10.11,2.01-2.68,1.23-4.64,3.18-4.64,6.48,0,2.51.95,4.53,2.51,5.81,1.51,1.34,3.63,2.07,5.92,2.07,2.57,0,4.52-.39,6.82-1.84h.22v.45c0,.45.39.84.89.84h4.92c.45,0,.84-.39.84-.84v-15.53c0-3.24-.84-5.25-2.23-6.81-2.18-2.4-5.53-2.91-8.1-2.91ZM173.92,79.91c-1.28.78-2.63,1.06-3.91,1.06-2.07,0-3.8-.84-3.8-2.62,0-2.74,4.36-3.18,7.71-3.3v4.86Z"
      />
      <path
        fill="currentColor"
        d="M202.25,71.75c-1.79-.89-3.41-1.4-5.2-2.12-1.29-.5-2.46-1.06-2.46-2.18,0-1.29,1.12-1.79,2.63-1.79,1.62,0,3.52.39,5.75,1.62.45.22.78.17,1.01-.28l2.01-4.13c.22-.39.22-.84-.34-1.12-2.01-1.12-4.58-1.96-8.66-1.96-6.59,0-10.22,2.96-10.22,7.65,0,3.24,1.4,5.36,4.13,6.7,1.79.89,3.74,1.51,5.36,2.23,1.4.62,2.4,1.06,2.4,2.29,0,1.34-1.12,2.01-2.96,2.01-2.4,0-4.08-.78-6.31-2.07-.45-.22-.84-.11-1.06.33l-2.07,4.3c-.22.39-.11.78.39,1.06,1.96,1.12,4.58,2.12,9.22,2.12,6.48,0,10.56-3.52,10.56-8.21,0-2.74-1.17-5.03-4.19-6.48Z"
      />
      <path
        fill="currentColor"
        d="M221.71,59.8c-3.3,0-6.7.28-8.99.89-.56.17-.84.5-.84,1.01v36.42c0,.5.34.89.84.89h5.7c.45,0,.84-.39.84-.89v-12.12c1.23.34,2.46.45,3.91.45,3.91,0,7.99-1.23,10.61-4.19,1.84-2.12,3.02-5.08,3.02-9.11s-1.34-7.15-3.58-9.33c-2.68-2.68-6.82-4.02-11.51-4.02ZM227.46,78.79c-1.4,1.23-3.24,1.62-5.08,1.62-1.23,0-2.23-.17-3.13-.5v-13.85c.95-.17,2.18-.22,3.18-.22,2.18,0,4.02.73,5.25,2.07,1.12,1.28,1.79,3.02,1.79,5.25,0,2.62-.78,4.52-2.01,5.64Z"
      />
      <path
        fill="currentColor"
        d="M260.7,62.7c-2.18-2.4-5.53-2.91-8.1-2.91-4.02,0-7.82,1.17-10.39,2.79-.5.34-.56.62-.33,1.12l1.62,3.52c.28.61.67.61,1.23.28,1.9-1.06,4.36-2.01,6.98-2.01,1.28,0,2.46.33,3.07,1.12.56.67.78,1.62.78,2.9v.56c-3.02.22-7.04.67-10.11,2.01-2.68,1.23-4.64,3.18-4.64,6.48,0,2.51.95,4.53,2.51,5.81,1.51,1.34,3.63,2.07,5.92,2.07,2.57,0,4.52-.39,6.82-1.84h.22v.45c0,.45.39.84.89.84h4.92c.45,0,.84-.39.84-.84v-15.53c0-3.24-.84-5.25-2.23-6.81ZM255.56,79.91c-1.28.78-2.63,1.06-3.91,1.06-2.07,0-3.8-.84-3.8-2.62,0-2.74,4.36-3.18,7.71-3.3v4.86Z"
      />
      <path
        fill="currentColor"
        d="M157.21,47.84h-8.1c-.67,0-1.23.28-1.73.84l-11.43,11.19v-11.19c0-.45-.34-.84-.84-.84h-6.31c-.5,0-.89.39-.89.84v36.37c0,.45.39.84.89.84h6.31c.5,0,.84-.39.84-.84v-11.19l11.43,11.19c.5.56,1.06.84,1.73.84h8.1c.73,0,1.01-.67.39-1.28l-18.13-17.74,18.13-17.74c.61-.61.33-1.28-.39-1.28Z"
      />
    </svg>
  );
}

export default function Nav() {
  const t = useTranslations("shared.navigation");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoReplaced, setLogoReplaced] = useState(false);
  const [logoFlight, setLogoFlight] = useState<LogoFlight | null>(null);
  const [logoMenu, setLogoMenu] = useState<LogoMenuPosition | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const logoTargetRef = useRef<HTMLAnchorElement>(null);
  const isDarkRef = useRef(false);
  const logoReplacedRef = useRef(false);
  const logoFlightRef = useRef<LogoFlight | null>(null);
  const { resolvedTheme } = useTheme();
  const isClient = useIsClient();
  const isDark = isClient && resolvedTheme === "dark";
  const showGlyphLogo = isDark && logoReplaced;
  const activeLogoFlight = isDark ? logoFlight : null;
  const assetsPublished = useIsKnownPathname(
    localizedDestinationInventory.logoAssets.pathname,
  );

  const logoSrc = isDark ? "/kaspa-logo-dark.svg" : "/kaspa-logo.svg";

  useEffect(() => {
    isDarkRef.current = isDark;
    logoReplacedRef.current = logoReplaced;
    logoFlightRef.current = activeLogoFlight;
  }, [activeLogoFlight, isDark, logoReplaced]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isDark) {
      const resetId = window.requestAnimationFrame(() => {
        setLogoFlight(null);
        setLogoReplaced(false);
      });

      return () => window.cancelAnimationFrame(resetId);
    }
  }, [isDark]);

  useEffect(() => {
    const onMarkSignal = (event: Event) => {
      const customEvent = event as CustomEvent<KaspaMarkSignalDetail>;
      const { clientX, clientY } = customEvent.detail;

      if (
        !isDarkRef.current ||
        logoReplacedRef.current ||
        logoFlightRef.current
      ) {
        return;
      }

      const targetRect = logoTargetRef.current?.getBoundingClientRect();
      if (!targetRect) {
        setLogoReplaced(true);
        return;
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reducedMotion) {
        setLogoReplaced(true);
        return;
      }

      setLogoFlight({
        id: window.performance.now(),
        startX: clientX,
        startY: clientY,
        endX: targetRect.left + targetRect.width / 2,
        endY: targetRect.top + targetRect.height / 2,
      });
    };

    window.addEventListener(KASPA_MARK_SIGNAL, onMarkSignal);
    return () => {
      window.removeEventListener(KASPA_MARK_SIGNAL, onMarkSignal);
    };
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => clearLongPress, []);

  const handleLogoContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const targetRect = logoTargetRef.current?.getBoundingClientRect();
    const position =
      event.clientX === 0 && event.clientY === 0 && targetRect
        ? { x: targetRect.left, y: targetRect.bottom }
        : { x: event.clientX, y: event.clientY };
    setLogoMenu(position);
  };

  const closeLogoMenu = () => {
    setLogoMenu(null);
    window.requestAnimationFrame(() => {
      logoTargetRef.current?.focus({ preventScroll: true });
    });
  };

  const handleLogoTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    longPressFired.current = false;
    const { clientX, clientY } = touch;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setLogoMenu({ x: clientX, y: clientY });
    }, 500);
  };

  const handleLogoClick = (event: React.MouseEvent) => {
    if (longPressFired.current) {
      event.preventDefault();
      longPressFired.current = false;
    }
  };

  const flightStyle = activeLogoFlight
    ? ({
        left: `${activeLogoFlight.startX - 24}px`,
        top: `${activeLogoFlight.startY - 24}px`,
        "--kaspa-flight-x": `${
          activeLogoFlight.endX - activeLogoFlight.startX
        }px`,
        "--kaspa-flight-y": `${
          activeLogoFlight.endY - activeLogoFlight.startY
        }px`,
      } as CSSProperties)
    : undefined;

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 font-sans transition-all duration-300 ${
        scrolled || menuOpen ? "backdrop-blur-xl" : ""
      }`}
      style={{
        backgroundColor:
          scrolled || menuOpen ? "var(--overlay-bg)" : "transparent",
      }}
    >
      <div className="flex h-16 items-center justify-between px-5 sm:px-6 md:h-20 md:px-12 lg:px-20">
        <Link
          ref={logoTargetRef}
          href={localizedDestinationInventory.navigationHome.pathname}
          onContextMenu={assetsPublished ? handleLogoContextMenu : undefined}
          onTouchStart={assetsPublished ? handleLogoTouchStart : undefined}
          onTouchEnd={assetsPublished ? clearLongPress : undefined}
          onTouchMove={assetsPublished ? clearLongPress : undefined}
          onTouchCancel={assetsPublished ? clearLongPress : undefined}
          onClick={handleLogoClick}
          className={`text-primary relative flex h-12 w-[116px] shrink-0 items-center select-none sm:w-[126px] md:w-[140px] ${
            assetsPublished ? "[-webkit-touch-callout:none]" : ""
          }`}
          aria-label={t("homeAria")}
          aria-haspopup={assetsPublished ? "menu" : undefined}
          aria-expanded={assetsPublished ? logoMenu !== null : undefined}
          aria-controls={assetsPublished && logoMenu ? LOGO_MENU_ID : undefined}
        >
          {showGlyphLogo ? (
            <span aria-hidden="true" className="text-primary flex">
              <KaspaGlyphLogo />
            </span>
          ) : (
            <Image
              src={logoSrc}
              alt=""
              width={140}
              height={64}
              className="h-auto w-[116px] sm:w-[126px] md:w-[140px]"
            />
          )}
        </Link>
        {activeLogoFlight ? (
          <span
            key={activeLogoFlight.id}
            aria-hidden="true"
            className="text-primary kaspa-logo-flight pointer-events-none fixed z-[80] flex h-12 w-12 items-center justify-center text-[30px] leading-none font-semibold drop-shadow-[0_0_18px_rgba(255,255,255,0.22)]"
            style={flightStyle}
            onAnimationEnd={() => {
              setLogoFlight(null);
              setLogoReplaced(true);
            }}
          >
            𐤊
          </span>
        ) : null}

        <div className="hidden items-center gap-4 md:flex lg:gap-5">
          <div className="flex items-center gap-6 lg:gap-8">
            <NavLinksList
              linkClassName={navLinkDesktop}
              disabledClassName={navLinkDisabledDesktop}
            />
          </div>
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 md:hidden">
          <LanguageSelector compact />
          <ThemeToggle compact />
          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="text-primary relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface)]"
            aria-label={t("toggleMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-links"
          >
            <span className="sr-only">{t("menu")}</span>
            <span
              className={`absolute h-[1.5px] w-[18px] bg-current transition-all duration-300 ${
                menuOpen ? "translate-y-0 rotate-45" : "-translate-y-[4.5px]"
              }`}
            />
            <span
              className={`absolute h-[1.5px] w-[18px] bg-current transition-all duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute h-[1.5px] w-[18px] bg-current transition-all duration-300 ${
                menuOpen ? "translate-y-0 -rotate-45" : "translate-y-[4.5px]"
              }`}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav-links"
        inert={!menuOpen}
        className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          menuOpen
            ? "max-h-[420px] opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-5 px-6 pb-6">
          <NavLinksList
            linkClassName={navLinkMobile}
            disabledClassName={navLinkDisabledMobile}
            onNavigate={() => setMenuOpen(false)}
            tabIndex={menuOpen ? 0 : -1}
          />
        </div>
      </div>

      {assetsPublished && logoMenu ? (
        <LogoContextMenu position={logoMenu} onClose={closeLogoMenu} />
      ) : null}
    </nav>
  );
}
