import { expect, test } from "@playwright/test";

test("Production offers English and approved Spanish", async ({ page }) => {
  await page.goto("/");
  const selector = page.locator("[data-language-selector]:visible");
  const trigger = selector.getByRole("button", {
    name: "Language",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = selector.getByRole("menu", { name: "Language" });
  await expect(
    menu.getByRole("menuitemradio", { name: "English" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    menu.getByRole("menuitemradio", { name: "Español" }),
  ).toBeVisible();
  await expect(menu).not.toContainText("Deutsch");
  await expect(menu).not.toContainText("Pseudo");
});
