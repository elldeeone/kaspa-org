import { expect, test } from "@playwright/test";

test("theme toggle flips the active theme", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");
  const toggle = page.getByRole("button", {
    name: /switch to (dark|light) mode/i,
  });
  await expect(toggle).toBeVisible();
  const initialLabel = await toggle.getAttribute("aria-label");
  const initialClassName = await html.getAttribute("class");

  await toggle.click();

  await expect
    .poll(async () => toggle.getAttribute("aria-label"))
    .not.toBe(initialLabel);
  await expect
    .poll(async () => html.getAttribute("class"))
    .not.toBe(initialClassName);
});

test("dark mode footer glyph swaps the header mark after eleven clicks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
  });
  await page.goto("/");

  await expect(page.locator("html")).toHaveClass(/dark/);

  const glyph = page.getByRole("button", { name: "Kaspa glyph" });
  await glyph.scrollIntoViewIfNeeded();

  for (let clickCount = 0; clickCount < 11; clickCount += 1) {
    await glyph.dispatchEvent("click", {
      clientX: 36,
      clientY: 755,
    });
  }

  await expect(page.locator("nav text").filter({ hasText: "𐤊" })).toBeVisible();
});

test("proof query param opens the genesis overlay and close clears it", async ({
  page,
}) => {
  let proofCatalogRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/i18n/home-proof/en")) {
      proofCatalogRequests += 1;
    }
  });
  await page.goto("/?proof=1");

  const backButton = page.getByRole("button", { name: /^back$/i });

  await expect(
    page
      .getByRole("heading", { name: "Live supply vs. emission schedule" })
      .first(),
  ).toBeVisible();
  const lastLink = page.getByRole("link", { name: "serialization.go" });
  await expect(backButton).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(lastLink).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(backButton).toBeFocused();
  await expect(backButton).toBeVisible();
  await expect(page).toHaveURL(/\/\?proof=1$/);

  await backButton.click();

  await expect(backButton).toHaveCount(0);
  await expect.poll(() => page.url()).not.toMatch(/[?&]proof=1/);
  await expect(
    page.getByRole("button", { name: "Verify the proof" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Verify the proof" }).click();
  await expect(
    page
      .getByRole("heading", { name: "Live supply vs. emission schedule" })
      .first(),
  ).toBeVisible();
  expect(proofCatalogRequests).toBe(1);
});

test("proof loading error traps focus and Escape restores the trigger", async ({
  page,
}) => {
  await page.route("**/api/i18n/home-proof/en", async (route) => {
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Verify the proof" });
  await trigger.click();

  const backButton = page.getByRole("button", { name: /^back$/i });
  const retryButton = page.getByRole("button", { name: "Try again" });
  await expect(
    page.getByRole("alert").filter({
      hasText: "The proof could not be loaded.",
    }),
  ).toBeVisible();
  await expect(backButton).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(retryButton).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(backButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(backButton).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
