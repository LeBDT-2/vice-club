import { expect, test } from "@playwright/test";

const PAGES = ["/", "/joueurs", "/mini-jeux", "/defi-du-jour", "/classements", "/connexion", "/inscription", "/confidentialite", "/contact"];

test("aucune page publique ne déborde horizontalement sur mobile", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("le menu mobile s'ouvre et se parcourt au clavier", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /menu/i });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Trouver des joueurs" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("le lien d'évitement mène au contenu et le focus est visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenu$/);
});
