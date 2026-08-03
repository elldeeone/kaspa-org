"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  AI_LAUNCHER_READY_EVENT,
  OPEN_KASPA_AI_EVENT,
  openKaspaAi,
  type OpenKaspaAiDetail,
} from "./aiLauncherEvents";

const AiLauncher = dynamic(() => import("./AiLauncher"), {
  ssr: false,
});

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function AiLauncherEntry() {
  return <EnabledAiLauncherEntry />;
}

function EnabledAiLauncherEntry() {
  const [enabled, setEnabled] = useState(false);
  const [launcherReady, setLauncherReady] = useState(false);
  const pendingOpenRequestRef = useRef<OpenKaspaAiDetail | null>(null);

  useEffect(() => {
    if (launcherReady) return;

    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const activate = () => setEnabled(true);
    const handleInteraction = () => activate();
    const handleLauncherReady = () => setLauncherReady(true);
    const handleOpenRequest: EventListener = (event) => {
      const customEvent = event as CustomEvent<OpenKaspaAiDetail>;
      const prompt = customEvent.detail?.prompt?.trim();

      pendingOpenRequestRef.current = prompt ? { prompt } : {};
      activate();
    };

    window.addEventListener("pointerdown", handleInteraction, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", handleInteraction, { once: true });
    window.addEventListener(AI_LAUNCHER_READY_EVENT, handleLauncherReady);
    window.addEventListener(OPEN_KASPA_AI_EVENT, handleOpenRequest);

    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(activate, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(activate, 1000);
    }

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener(AI_LAUNCHER_READY_EVENT, handleLauncherReady);
      window.removeEventListener(OPEN_KASPA_AI_EVENT, handleOpenRequest);

      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }

      if (typeof idleId === "number" && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [launcherReady]);

  useEffect(() => {
    if (!launcherReady) return;

    const pendingOpenRequest = pendingOpenRequestRef.current;
    if (!pendingOpenRequest) return;

    pendingOpenRequestRef.current = null;
    openKaspaAi(pendingOpenRequest.prompt ? pendingOpenRequest : undefined);
  }, [launcherReady]);

  if (!enabled) return null;

  return <AiLauncher />;
}
