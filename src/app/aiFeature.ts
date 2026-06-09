const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export const KASPA_AI_DISABLED_MESSAGE = "Kaspa AI is temporarily unavailable.";

export const isKaspaAiEnabled = ENABLED_VALUES.has(
  (process.env.NEXT_PUBLIC_KASPA_AI_ENABLED ?? "").trim().toLowerCase(),
);
