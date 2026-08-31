import { useEffect, useRef } from "react";
import HeroDag from "./dag/HeroDag";

const DEFAULT_API_URL = "https://kgi.kaspad.net:3147";
const DEFAULT_API_PORT = "3147";

const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

const normalizeApiUrl = (rawUrl: string): string => {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return DEFAULT_API_URL;

  const withScheme = URL_SCHEME_REGEX.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  try {
    const url = new URL(withScheme);

    if (!url.port && url.hostname === "kgi.kaspad.net") {
      url.port = DEFAULT_API_PORT;
    }

    if (url.pathname === "/") {
      url.pathname = "";
    } else {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_URL;
  }
};

interface DagHeroProps {
  apiUrl?: string;
  replayUrl?: string;
  snapshotReplayUrl?: string;
  snapshotFirstFrameUrl?: string;
  snapshotPlaybackRate?: number;
  scale?: number;
  backgroundAlpha?: number;
  maxDpr?: number;
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function DagHero({
  apiUrl = DEFAULT_API_URL,
  replayUrl,
  snapshotReplayUrl,
  snapshotFirstFrameUrl,
  snapshotPlaybackRate = 1,
  scale = 0.4,
  backgroundAlpha = 0,
  maxDpr = 2,
  paused = false,
  className,
  style,
}: DagHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dagRef = useRef<HeroDag | null>(null);
  const pausedRef = useRef(paused);
  const normalizedApiUrl = apiUrl ? normalizeApiUrl(apiUrl) : undefined;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let canvas: HTMLCanvasElement | null = null;
    const dag = new HeroDag(scale, backgroundAlpha, maxDpr, pausedRef.current);
    dagRef.current = dag;
    let isCancelled = false;

    const startDag = async () => {
      if (isCancelled) return;

      const firstFramePromise = snapshotFirstFrameUrl
        ? dag.fetchSnapshotReplay(snapshotFirstFrameUrl)
        : null;
      const fullReplayPromise =
        snapshotReplayUrl && firstFramePromise
          ? dag.fetchSnapshotReplay(snapshotReplayUrl)
          : null;
      const firstAvailablePromise =
        firstFramePromise && fullReplayPromise
          ? Promise.any([
              firstFramePromise.then((data) => ({ data, isFull: false })),
              fullReplayPromise.then((data) => ({ data, isFull: true })),
            ])
          : null;
      void firstAvailablePromise?.catch(() => undefined);

      // Create canvas dynamically so StrictMode re-mounts work cleanly.
      canvas = document.createElement("canvas");
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      container.prepend(canvas);

      try {
        await dag.initialize(canvas);
      } catch (error) {
        if (!isCancelled) {
          console.error("[DAG Hero] Initialization failed", error);
        }
        return;
      }

      if (isCancelled) {
        dag.stop();
        return;
      }

      if (snapshotReplayUrl) {
        try {
          if (firstAvailablePromise) {
            const firstAvailable = await firstAvailablePromise;
            if (isCancelled) return;
            dag.setSnapshotReplay(
              firstAvailable.data,
              snapshotPlaybackRate,
              false,
            );
            if (firstAvailable.isFull) return;
          }

          const fullReplay = await (fullReplayPromise ??
            dag.fetchSnapshotReplay(snapshotReplayUrl));
          if (isCancelled) return;
          dag.setSnapshotReplay(fullReplay, snapshotPlaybackRate, false);
        } catch (error) {
          if (!isCancelled) {
            console.error("[DAG Hero] Snapshot replay failed", error);
          }
        }
      } else if (replayUrl) {
        dag.loadReplay(replayUrl).catch((error) => {
          if (!isCancelled) {
            console.error("[DAG Hero] Replay failed", error);
          }
        });
      } else if (normalizedApiUrl) {
        dag.loadAPI(normalizedApiUrl);
      }
    };

    void startDag();

    return () => {
      isCancelled = true;
      dag.stop();
      dagRef.current = null;
      if (canvas?.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [
    normalizedApiUrl,
    replayUrl,
    snapshotFirstFrameUrl,
    snapshotPlaybackRate,
    snapshotReplayUrl,
    scale,
    backgroundAlpha,
    maxDpr,
  ]);

  useEffect(() => {
    dagRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        ...style,
      }}
    />
  );
}
