"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { PauseIcon, PlayIcon } from "./icons";

type DagPlaybackContextValue = {
  paused: boolean;
  preferenceReady: boolean;
  toggle: () => void;
};

const DagPlaybackContext = createContext<DagPlaybackContextValue | null>(null);

export function DagPlaybackProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(true);
  const [preferenceReady, setPreferenceReady] = useState(false);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const applyPreference = () => {
      setPaused(reducedMotionQuery.matches);
      setPreferenceReady(true);
    };

    applyPreference();
    reducedMotionQuery.addEventListener("change", applyPreference);
    return () =>
      reducedMotionQuery.removeEventListener("change", applyPreference);
  }, []);

  return (
    <DagPlaybackContext.Provider
      value={{
        paused,
        preferenceReady,
        toggle: () => setPaused((current) => !current),
      }}
    >
      {children}
    </DagPlaybackContext.Provider>
  );
}

export function useDagPlayback() {
  const context = useContext(DagPlaybackContext);
  if (!context) {
    throw new Error("useDagPlayback must be used within DagPlaybackProvider");
  }
  return context;
}

export function DagPlaybackControl({
  labels,
  className,
}: {
  labels: { play: string; pause: string };
  className?: string;
}) {
  const { paused, preferenceReady, toggle } = useDagPlayback();
  if (!preferenceReady) return null;

  const label = paused ? labels.play : labels.pause;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`group pointer-events-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:outline-none ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="relative inline-flex h-7 w-7 items-center justify-center"
      >
        <span
          className="absolute inset-0 rounded-full border border-[var(--btn-ghost-border)] opacity-[0.35] shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            background:
              "color-mix(in srgb, var(--dag-mask-color) 78%, transparent)",
          }}
        />
        <span className="relative inline-flex items-center justify-center opacity-[0.65] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {paused ? <PlayIcon size={11} /> : <PauseIcon size={11} />}
        </span>
      </span>
    </button>
  );
}
