import { expect, test } from "@playwright/test";

test("Production offers English, Spanish, German, and French", async ({
  page,
}) => {
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
  await expect(
    menu.getByRole("menuitemradio", { name: "Deutsch" }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitemradio", { name: "Français" }),
  ).toBeVisible();
  await expect(menu).not.toContainText("简体中文");
  await expect(menu).not.toContainText("Pseudo");
});
