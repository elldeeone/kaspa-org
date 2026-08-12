import assert from "node:assert/strict";

import { buildExampleContract } from "../../src/i18n/build-example-contract.ts";
import {
  defaultLocale,
  localeRegistry,
  supportedLocaleCodes,
} from "../../src/i18n/locale-registry.ts";
import { I18N_PUBLICATION_PROFILE_ENV } from "../../src/i18n/publication-profile-contract.ts";
import { installI18nPublicationProfile } from "../../src/i18n/publication-profile-node.ts";
import { NEXT_INTL_LOCALE_HEADER } from "../../src/i18n/route-request.ts";
import { startProductionServer } from "./production-server.mts";

installI18nPublicationProfile();
const [config, manifest] = await Promise.all([
  import("../../src/i18n/config.ts"),
  import("../../src/i18n/manifest.ts"),
]);
delete process.env[I18N_PUBLICATION_PROFILE_ENV];
const { isLocaleProductionReady } = config;
const { RESERVED_NOT_FOUND_PATHNAME, ROUTE_MISS_HEADER, stablePathnames } =
  manifest;
const unavailableLocales = supportedLocaleCodes.filter(
  (locale) => !isLocaleProductionReady(locale),
);
const translatedProductionLocales = supportedLocaleCodes.filter(
  (locale) => locale !== defaultLocale && isLocaleProductionReady(locale),
);
const unavailableArtifactLocales = (
  Object.keys(buildExampleContract.artifactManifest.urlsByLocale) as Array<
    keyof typeof buildExampleContract.artifactManifest.urlsByLocale
  >
).filter((locale) => unavailableLocales.includes(locale));

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const server = await startProductionServer(process.cwd());

  try {
    assert.equal(new URL(server.baseUrl).hostname, "127.0.0.1");
    let routeCount = 0;
    const request = async (
      pathname: string,
      expectedStatus: number,
      headers?: HeadersInit,
    ) => {
      const response = await fetch(`${server.baseUrl}${pathname}`, {
        headers,
        redirect: "manual",
      });
      routeCount += 1;
      assert.equal(response.status, expectedStatus, pathname);
      return response;
    };

    for (const pathname of ["/", "/lore", "/build", "/hodl", "/assets"]) {
      const response = await request(pathname, 200);
      assert.equal(response.headers.get("link"), null, pathname);
    }

    for (const locale of translatedProductionLocales) {
      for (const stablePathname of stablePathnames) {
        const pathname = `/${locale}${stablePathname === "/" ? "" : stablePathname}`;
        const response = await request(pathname, 200);
        assert.equal(response.headers.get("link"), null, pathname);
        assert.match(
          await response.text(),
          new RegExp(
            `<html lang="${locale}" dir="${localeRegistry[locale].dir}"`,
            "u",
          ),
        );
      }
    }

    const prefixed = await request("/en/lore", 307);
    assert.equal(prefixed.headers.get("location"), "/lore");

    for (const locale of unavailableArtifactLocales) {
      for (const pathname of buildExampleContract.artifactManifest.urlsByLocale[
        locale
      ]) {
        await request(pathname, 404);
      }
    }

    for (const locale of Object.keys(
      buildExampleContract.artifactManifest.urlsByLocale,
    ) as Array<
      keyof typeof buildExampleContract.artifactManifest.urlsByLocale
    >) {
      if (!isLocaleProductionReady(locale)) continue;
      for (const pathname of buildExampleContract.artifactManifest.urlsByLocale[
        locale
      ]) {
        const response = await request(pathname, 200);
        if (pathname.endsWith(".html")) {
          assert.match(
            await response.text(),
            new RegExp(
              `<html lang="${locale}" dir="${localeRegistry[locale].dir}">`,
              "u",
            ),
          );
        }
      }
    }

    for (const pathname of [
      "/missing",
      "/zz/missing",
      "/missing.txt",
      "/api/nope",
      "/_vercel/missing",
      RESERVED_NOT_FOUND_PATHNAME,
      "/en/opengraph-image",
      ...unavailableLocales.flatMap((locale) => [
        ...stablePathnames.map(
          (pathname) => `/${locale}${pathname === "/" ? "" : pathname}`,
        ),
        `/${locale}/missing`,
        `/${locale}/opengraph-image`,
      ]),
    ]) {
      const response = await request(pathname, 404, {
        [ROUTE_MISS_HEADER]: "1",
        [NEXT_INTL_LOCALE_HEADER]: "es",
      });
      const html = await response.text();
      assert.match(html, /<html lang="en" dir="ltr"/u, pathname);
      assert.match(html, /data-kaspa-global-not-found="true"/u, pathname);
    }

    for (const locale of translatedProductionLocales) {
      const localizedMissing = await request(`/${locale}/missing`, 404, {
        [ROUTE_MISS_HEADER]: "1",
        [NEXT_INTL_LOCALE_HEADER]: defaultLocale,
      });
      const localizedMissingHtml = await localizedMissing.text();
      assert.match(
        localizedMissingHtml,
        new RegExp(
          `<html lang="${locale}" dir="${localeRegistry[locale].dir}"`,
          "u",
        ),
      );
      assert.match(localizedMissingHtml, /data-kaspa-global-not-found="true"/u);
    }

    await request("/api/ask", 405);
    const proofCatalog = await request("/api/i18n/home-proof/en", 200);
    assert.match(await proofCatalog.text(), /"trigger":"Verify the proof"/u);
    for (const locale of unavailableLocales) {
      await request(`/api/i18n/home-proof/${locale}`, 404);
    }
    for (const locale of translatedProductionLocales) {
      const proofCatalog = await request(`/api/i18n/home-proof/${locale}`, 200);
      assert.match(await proofCatalog.text(), /"trigger":"[^"]+"/u);
    }
    await request("/icon.svg", 200);
    await request("/opengraph-image", 200);
    for (const locale of translatedProductionLocales) {
      await request(`/${locale}/opengraph-image`, 200);
    }
    await delay(250);

    for (const forbidden of [
      /NoFallbackError/u,
      /ERR_INVALID_URL/u,
      /Internal Server Error/u,
      /TypeError: Invalid URL/u,
    ]) {
      assert.doesNotMatch(server.readLogs(), forbidden);
    }

    console.log(
      `i18n production smoke: ${routeCount} routes passed with a clean server log`,
    );
  } finally {
    await server.stop();
  }
}

await main();
