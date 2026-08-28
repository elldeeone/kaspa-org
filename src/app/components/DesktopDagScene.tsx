"use client";

import DagHero from "@/dag-viz/DagHero";
import type { Locale } from "@/i18n/locale-registry";

import DagAnnotation from "./DagAnnotation";

interface DesktopDagSceneProps {
  annotation: string;
  locale: Locale;
  maskColor: string;
  paused: boolean;
}

export default function DesktopDagScene({
  annotation,
  locale,
  maskColor,
  paused,
}: DesktopDagSceneProps) {
  return (
    <>
      {/* Live DAG canvas */}
      <DagHero
        snapshotReplayUrl="/replay/mainnet-60s-compressed.json"
        snapshotPlaybackRate={1}
        paused={paused}
        scale={0.4}
        style={{
          position: "absolute",
          inset: 0,
          background: maskColor,
        }}
      />

      {/* Gradient masks to blend DAG into the page */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to right, ${maskColor} 0%, ${maskColor} 8%, transparent 45%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${maskColor} 0%, transparent 20%, transparent 80%, ${maskColor} 100%)`,
        }}
      />

      {/* Hand-scribbled annotation */}
      <DagAnnotation locale={locale}>{annotation}</DagAnnotation>
    </>
  );
}
