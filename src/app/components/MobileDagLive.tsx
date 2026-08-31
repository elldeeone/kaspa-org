"use client";

import { useEffect, useState } from "react";

import DagHero from "@/dag-viz/DagHero";

import { DagPlaybackControl, useDagPlayback } from "./DagPlayback";

export default function MobileDagLive({
  playbackLabels,
}: {
  playbackLabels: { play: string; pause: string };
}) {
  const [showDag, setShowDag] = useState(false);
  const { paused } = useDagPlayback();

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1279px)");

    const update = () => {
      setShowDag(mobileQuery.matches);
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

    return () => {
      removeMobileListener();
    };
  }, []);

  return (
    <div className="home-hero-dag-viewport relative w-full overflow-hidden xl:hidden">
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
              snapshotFirstFrameUrl="/replay/mainnet-first-frame.json"
              snapshotPlaybackRate={1}
              paused={paused}
              scale={0.5}
              maxDpr={2}
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

          <DagPlaybackControl
            labels={playbackLabels}
            className="absolute right-3 bottom-[15%] z-20 sm:right-4 sm:bottom-4"
          />
        </>
      ) : null}
    </div>
  );
}
