import assert from "node:assert/strict";

import { buildExampleContract } from "../../src/i18n/build-example-contract.ts";
import { I18N_PUBLICATION_PROFILE_ENV } from "../../src/i18n/publication-profile-contract.ts";
import { installI18nPublicationProfile } from "../../src/i18n/publication-profile-node.ts";
import { NEXT_INTL_LOCALE_HEADER } from "../../src/i18n/route-request.ts";
import { startProductionServer } from "./production-server.mts";

installI18nPublicationProfile();
const manifest = await import("../../src/i18n/manifest.ts");
delete process.env[I18N_PUBLICATION_PROFILE_ENV];
const { RESERVED_NOT_FOUND_PATHNAME, ROUTE_MISS_HEADER } = manifest;

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

    for (const pathname of [
      "/es",
      "/es/lore",
      "/es/build",
      "/es/assets",
      "/es/hodl",
    ]) {
      const response = await request(pathname, 200);
      assert.equal(response.headers.get("link"), null, pathname);
      assert.match(await response.text(), /<html lang="es" dir="ltr"/u);
    }

    const prefixed = await request("/en/lore", 307);
    assert.equal(prefixed.headers.get("location"), "/lore");

    for (const pathname of buildExampleContract.artifactManifest.urlsByLocale[
      "en-XA"
    ]) {
      await request(pathname, 404);
    }

    for (const pathname of buildExampleContract.artifactManifest.urlsByLocale
      .es) {
      const response = await request(pathname, 200);
      if (pathname.endsWith(".html")) {
        assert.match(await response.text(), /<html lang="es" dir="ltr">/u);
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
      "/en-XA",
      "/en-XA/lore",
      "/en-XA/build",
      "/en-XA/assets",
      "/en-XA/hodl",
      "/en-XA/missing",
      "/en-XA/opengraph-image",
    ]) {
      const response = await request(pathname, 404, {
        [ROUTE_MISS_HEADER]: "1",
        [NEXT_INTL_LOCALE_HEADER]: "es",
      });
      const html = await response.text();
      assert.match(html, /<html lang="en" dir="ltr"/u, pathname);
      assert.match(html, /data-kaspa-global-not-found="true"/u, pathname);
    }

    const spanishMissing = await request("/es/missing", 404, {
      [ROUTE_MISS_HEADER]: "1",
      [NEXT_INTL_LOCALE_HEADER]: "en",
    });
    const spanishMissingHtml = await spanishMissing.text();
    assert.match(spanishMissingHtml, /<html lang="es" dir="ltr"/u);
    assert.match(spanishMissingHtml, /data-kaspa-global-not-found="true"/u);

    await request("/api/ask", 405);
    const proofCatalog = await request("/api/i18n/home-proof/en", 200);
    assert.match(await proofCatalog.text(), /"trigger":"Verify the proof"/u);
    await request("/api/i18n/home-proof/en-XA", 404);
    const spanishProofCatalog = await request("/api/i18n/home-proof/es", 200);
    assert.match(
      await spanishProofCatalog.text(),
      /"trigger":"Verificar la prueba"/u,
    );
    await request("/icon.svg", 200);
    await request("/opengraph-image", 200);
    await request("/es/opengraph-image", 200);
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
