import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { test } from "@playwright/test";

// This is intentionally a test-owned oracle. Importing production route data
// here would let the implementation and its expected route set drift together.
export const publicRouteGolden = [
  { id: "home", path: "/" },
  { id: "lore", path: "/lore" },
  { id: "build", path: "/build" },
  { id: "assets", path: "/assets" },
  { id: "hodl", path: "/hodl" },
] as const;

export type PublicRouteId = (typeof publicRouteGolden)[number]["id"];

export function localizePublicPath(locale: string, englishPath: string) {
  return `/${locale}${englishPath === "/" ? "" : englishPath}`;
}

export async function readPrerenderRoutePathnames(fixtureRoot: string) {
  const manifest = JSON.parse(
    await readFile(
      join(fixtureRoot, ".next", "prerender-manifest.json"),
      "utf8",
    ),
  ) as { routes: Record<string, unknown> };
  return new Set(Object.keys(manifest.routes));
}

export function runOnlyInProject(reason: string, project = "desktop-chromium") {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== project, reason);
  });
}
