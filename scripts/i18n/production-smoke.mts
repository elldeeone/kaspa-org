import assert from "node:assert/strict";

import {
  RESERVED_NOT_FOUND_PATHNAME,
  ROUTE_MISS_HEADER,
} from "../../src/i18n/manifest.ts";
import { NEXT_INTL_LOCALE_HEADER } from "../../src/i18n/site.ts";
import { startProductionServer } from "./production-server.mts";

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const server = await startProductionServer(process.cwd());

  try {
    const request = async (
      pathname: string,
      expectedStatus: number,
      headers?: HeadersInit,
    ) => {
      const response = await fetch(`${server.baseUrl}${pathname}`, {
        headers,
        redirect: "manual",
      });
      assert.equal(response.status, expectedStatus, pathname);
      return response;
    };

    for (const pathname of ["/", "/lore", "/build", "/hodl", "/assets"]) {
      await request(pathname, 200);
    }

    const prefixed = await request("/en/lore", 307);
    assert.equal(prefixed.headers.get("location"), "/lore");

    for (const pathname of [
      "/missing",
      "/es/missing",
      "/zz/missing",
      "/es/lore",
      "/missing.txt",
      "/api/nope",
      "/_vercel/missing",
      RESERVED_NOT_FOUND_PATHNAME,
      "/en/opengraph-image",
    ]) {
      const response = await request(pathname, 404, {
        [ROUTE_MISS_HEADER]: "1",
        [NEXT_INTL_LOCALE_HEADER]: "es",
      });
      const html = await response.text();
      assert.match(html, /<html lang="en" dir="ltr"/u, pathname);
      assert.match(html, /data-kaspa-global-not-found="true"/u, pathname);
    }

    await request("/api/ask", 405);
    await request("/icon.svg", 200);
    await request("/opengraph-image", 200);
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
      "i18n production smoke: 18 routes passed with a clean server log",
    );
  } finally {
    await server.stop();
  }
}

await main();
