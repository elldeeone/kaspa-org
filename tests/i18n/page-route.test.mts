import assert from "node:assert/strict";
import test from "node:test";

import { supportedLocaleCodes } from "../../src/i18n/locale-registry.ts";
import { stablePathnameMap } from "../../src/i18n/manifest.ts";
import { createLocalizedPageAdapter } from "../../src/i18n/page-route.ts";
import { routing } from "../../src/i18n/routing.ts";

test("the route manifest drives next-intl pathnames", () => {
  assert.deepEqual(stablePathnameMap, {
    "/": "/",
    "/lore": "/lore",
    "/build": "/build",
    "/assets": "/assets",
    "/hodl": "/hodl",
  });
  assert.deepEqual(routing.pathnames, stablePathnameMap);
});

test("localized page adapters own static params, validation, and metadata", async () => {
  const activatedLocales: string[] = [];
  const pageRoute = createLocalizedPageAdapter("home", (locale) => {
    activatedLocales.push(locale);
  });

  assert.deepEqual(
    pageRoute.generateStaticParams(),
    supportedLocaleCodes.map((locale) => ({ locale })),
  );
  const route = await pageRoute.resolve(Promise.resolve({ locale: "es" }));
  assert.equal(route.routeId, "home");
  assert.equal(route.canonicalPathname, "/es");

  const metadata = await pageRoute.generateMetadata({
    params: Promise.resolve({ locale: "es" }),
  });
  assert.equal(metadata.alternates?.canonical, "/es");
  assert.deepEqual(activatedLocales, ["es", "es"]);
  await assert.rejects(
    pageRoute.resolve(Promise.resolve({ locale: "zz" })),
    /Unexpected locale static parameter for home: zz/u,
  );
});
