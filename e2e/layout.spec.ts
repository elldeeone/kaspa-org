import { expect, test } from "@playwright/test";

import {
  assertEqualControlRow,
  assertWordsStayOnSingleLine,
  waitForStableLayout,
} from "./i18n-preview-helpers";

test("home hero stays within a 320px mobile viewport", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Custom narrow viewport coverage runs once",
  );

  const baseURL = testInfo.project.use.baseURL as string;
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const heading = page.getByRole("heading", {
    level: 1,
    name: /real-time\s+decentralization/i,
  });
  const subtitle = page.getByText(
    /bitcoin's proof-of-work without the wait\./i,
  );
  const heroLinks = [
    page.getByRole("link", { name: /get started/i }),
    page.getByRole("link", { name: /get a wallet/i }),
    page.getByRole("link", { name: /buy kaspa/i }),
  ];

  await expect(heading).toBeVisible();
  await expect(subtitle).toBeVisible();
  await assertWordsStayOnSingleLine(heading, "320px English home hero");

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

  const viewportWidth = page.viewportSize()?.width ?? 320;
  for (const locator of [heading, subtitle, ...heroLinks]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();

    if (!box) {
      continue;
    }

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
  }

  await context.close();
});

test("home proof actions stay equal and side-by-side on mobile", async ({
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Custom mobile viewport coverage runs once",
  );

  const baseURL = testInfo.project.use.baseURL as string;
  for (const width of [320, 375, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await assertEqualControlRow(
      page.locator("#verify .btn-primary, #verify .btn-ghost"),
      `${width}px English proof actions`,
    );
    await context.close();
  }
});
