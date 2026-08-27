import { supportedLocaleCodes, type Locale } from "./locale-registry.ts";

const AI_ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export const localeCodes: readonly Locale[] = supportedLocaleCodes;

export const isAiDeploymentEnabled = AI_ENABLED_VALUES.has(
  (process.env.NEXT_PUBLIC_KASPA_AI_ENABLED ?? "").trim().toLowerCase(),
);

export function isLocale(value: string | undefined): value is Locale {
  return localeCodes.some((locale) => locale === value);
}

export function resolveLocale(value: string | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return (
    localeCodes.find((locale) => locale.toLowerCase() === normalized) ?? null
  );
}
