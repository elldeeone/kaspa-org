"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DagHero = dynamic(() => import("@/dag-viz/DagHero"), { ssr: false });

export default function MobileDagLive() {
  const [showDag, setShowDag] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1279px)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const update = () => {
      setShowDag(mobileQuery.matches && !reducedMotionQuery.matches);
    };

    update();

    const addListener = (query: MediaQueryList) => {
      if (query.addEventListener) {
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
      }

      query.addListener(update);
      return () => query.removeListener(update);
    };

    const removeMobileListener = addListener(mobileQuery);
    const removeReducedMotionListener = addListener(reducedMotionQuery);

    return () => {
      removeMobileListener();
      removeReducedMotionListener();
    };
  }, []);

  return (
    <div className="home-hero-dag-viewport relative w-full overflow-hidden motion-reduce:hidden xl:hidden">
      {showDag ? (
        <>
          {/* Right offset ramps from 0 below 768px to ~170px at 1280px so the
              newest block lands ~78–84vw of the viewport at every width. Below
              md the canvas hits viewport-right; at wider widths it pulls back
              enough that the DAG content (even at min snapshot span of 16) still
              overflows canvas-left and bleeds off the viewport's left edge. */}
          <div
            className="absolute top-0 bottom-0 w-[110%]"
            style={{ right: "max(0px, calc((100vw - 768px) / 3))" }}
          >
            <DagHero
              snapshotReplayUrl="/replay/mainnet-60s-compressed.json"
              snapshotPlaybackRate={1}
              scale={0.5}
              maxDpr={3}
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--dag-mask-color)",
              }}
            />
          </div>

          {/* Bottom fade — stronger to keep hero text area clear */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 50%, color-mix(in srgb, var(--dag-mask-color) 80%, transparent) 80%, var(--dag-mask-color) 100%)",
            }}
          />

          {/* Soft edge vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 85% at 50% 45%, transparent 0%, var(--dag-mask-color) 100%)",
            }}
          />
        </>
      ) : null}
    </div>
  );
}
