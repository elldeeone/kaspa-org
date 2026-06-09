"use client";

import { isKaspaAiEnabled } from "../aiFeature";

export type OpenKaspaAiDetail = {
  prompt?: string;
};

export const OPEN_KASPA_AI_EVENT = "kaspa:open-ai";
export const AI_LAUNCHER_READY_EVENT = "kaspa:ai-ready";

export function openKaspaAi(detail?: OpenKaspaAiDetail) {
  if (!isKaspaAiEnabled || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<OpenKaspaAiDetail>(OPEN_KASPA_AI_EVENT, {
      detail,
    }),
  );
}

export function notifyKaspaAiReady() {
  if (!isKaspaAiEnabled || typeof window === "undefined") return;

  window.dispatchEvent(new Event(AI_LAUNCHER_READY_EVENT));
}
