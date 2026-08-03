import { expect, test } from "@playwright/test";

test("Production omits the one-option language control", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-language-selector]")).toHaveCount(0);
});
