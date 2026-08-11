import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  request as requestFactory,
  test,
  type APIRequestContext,
} from "@playwright/test";

import {
  startProductionServer,
  type ProductionServer,
} from "../scripts/i18n/production-server.mts";
import {
  buildProductionFixture,
  createProductionFixture,
  validateProductionFixtureClientPayload,
  type ProductionFixture,
} from "../scripts/i18n/unpublished-route-fixture.mts";

// This is intentionally a test-owned oracle. Importing production route data
// here would let the implementation and its expected route set drift together.
export const publicRouteGolden = [
  { id: "home", path: "/", englishFingerprint: "Get started" },
  {
    id: "lore",
    path: "/lore",
    englishFingerprint:
      "Kaspa is a live proof-of-work blockDAG running at 10 blocks per second.",
  },
  { id: "build", path: "/build", englishFingerprint: "Build on Kaspa" },
  {
    id: "assets",
    path: "/assets",
    englishFingerprint: "Kaspa logo assets",
  },
  {
    id: "hodl",
    path: "/hodl",
    englishFingerprint: "Buy KAS and move it into a wallet you control.",
  },
] as const;

export type PublicRouteId = (typeof publicRouteGolden)[number]["id"];

const publicEnglishPaths = new Set<string>(
  publicRouteGolden.map(({ path }) => path),
);

export function localizePublicPath(locale: string, englishPath: string) {
  return `/${locale}${englishPath === "/" ? "" : englishPath}`;
}

export function localizePublicRouteGolden(locale: string) {
  return publicRouteGolden.map((route) => {
    const path = localizePublicPath(locale, route.path);
    return { ...route, path, internalPath: path };
  });
}

export function isGoldenEnglishPublicPath(pathname: string) {
  return publicEnglishPaths.has(pathname);
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

type ScenarioEnvironment = Readonly<Record<string, string | undefined>>;
type ScenarioFixtureFactory = (
  repositoryRoot: string,
) => Promise<ProductionFixture>;

export type BuiltLocaleScenario = {
  baseUrl: string;
  fixtureRoot: string;
  readLogs: () => string;
  request: APIRequestContext;
  dispose: () => Promise<void>;
};

type StartBuiltLocaleScenarioOptions = {
  createFixture?: ScenarioFixtureFactory;
  environment?: ScenarioEnvironment;
  repositoryRoot?: string;
  validateClientPayload?: boolean;
};

async function disposeScenarioResources(
  fixture: ProductionFixture,
  server?: ProductionServer,
  request?: APIRequestContext,
) {
  const results = await Promise.allSettled([
    request?.dispose(),
    server?.stop(),
  ]);
  const fixtureResult = await Promise.allSettled([fixture.dispose()]);
  const errors = [...results, ...fixtureResult].flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
  if (errors.length > 0) {
    throw new AggregateError(errors, "locale scenario cleanup failed");
  }
}

export async function startBuiltLocaleScenario({
  createFixture = createProductionFixture,
  environment = {},
  repositoryRoot = process.cwd(),
  validateClientPayload = true,
}: StartBuiltLocaleScenarioOptions = {}): Promise<BuiltLocaleScenario> {
  const fixture = await createFixture(repositoryRoot);
  let server: ProductionServer | undefined;
  let request: APIRequestContext | undefined;

  try {
    await buildProductionFixture(fixture.root, environment);
    if (validateClientPayload) {
      await validateProductionFixtureClientPayload(fixture.root, environment);
    }
    server = await startProductionServer(fixture.root, environment);
    request = await requestFactory.newContext({ baseURL: server.baseUrl });
  } catch (error) {
    try {
      await disposeScenarioResources(fixture, server, request);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "locale scenario startup and cleanup failed",
      );
    }
    throw error;
  }

  let disposePromise: Promise<void> | undefined;
  return {
    baseUrl: server.baseUrl,
    fixtureRoot: fixture.root,
    readLogs: server.readLogs,
    request,
    dispose() {
      disposePromise ??= disposeScenarioResources(fixture, server, request);
      return disposePromise;
    },
  };
}

export function runOnlyInProject(reason: string, project = "desktop-chromium") {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== project, reason);
  });
}

type UseBuiltLocaleScenarioOptions = StartBuiltLocaleScenarioOptions & {
  enabled: boolean;
  enabledHint: string;
  name: string;
  project?: string;
  timeout?: number;
};

export function useBuiltLocaleScenario({
  enabled,
  enabledHint,
  name,
  project = "desktop-chromium",
  timeout = 240_000,
  ...scenarioOptions
}: UseBuiltLocaleScenarioOptions) {
  test.skip(!enabled, enabledHint);
  test.describe.configure({ mode: "serial", timeout });
  runOnlyInProject(`${name} runs once`, project);

  let scenario: BuiltLocaleScenario | undefined;

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== project) return;
    scenario = await startBuiltLocaleScenario(scenarioOptions);
  });

  test.afterAll(async () => {
    await scenario?.dispose();
  });

  return {
    require() {
      if (!scenario) throw new Error(`${name} did not start`);
      return scenario;
    },
  };
}
