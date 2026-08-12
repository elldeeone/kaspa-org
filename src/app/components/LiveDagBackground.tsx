"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n/locale-registry";

const DesktopDagScene = dynamic(() => import("./DesktopDagScene"), {
  ssr: false,
});

export default function LiveDagBackground({
  annotation,
  locale,
}: {
  annotation: string;
  locale: Locale;
}) {
  const { resolvedTheme } = useTheme();
  const [showDag, setShowDag] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const update = () => {
      setShowDag(desktopQuery.matches && !reducedMotionQuery.matches);
    };

    // Initial check on mount
    update();

    const addListener = (query: MediaQueryList) => {
      if (query.addEventListener) {
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
      }

      query.addListener(update);
      return () => query.removeListener(update);
    };

    const removeDesktopListener = addListener(desktopQuery);
    const removeReducedMotionListener = addListener(reducedMotionQuery);

    return () => {
      removeDesktopListener();
      removeReducedMotionListener();
    };
  }, []);

  if (!showDag) return null;

  const isDark = resolvedTheme === "dark";
  const maskColor = isDark ? "#16161a" : "#f5f5f7";

  return (
    <div className="pointer-events-none fixed top-0 right-0 z-0 h-screen w-[56vw] overflow-hidden 2xl:-right-[5vw] 2xl:w-[70vw]">
      <DesktopDagScene
        annotation={annotation}
        locale={locale}
        maskColor={maskColor}
      />
    </div>
  );
}
