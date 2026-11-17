import { expect, test } from "@playwright/test";

test("accueil : diaporama en pause et échauffement « Devine la voiture »", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("commence ici");

  const pause = page.getByRole("button", { name: "Mettre le diaporama en pause" });
  await pause.click();
  await expect(page.getByRole("button", { name: "Relancer le diaporama" })).toBeVisible();
  await page.getByRole("button", { name: /^Photo 3 :/ }).click();
  await expect(page.getByRole("button", { name: /^Photo 3 :/ })).toHaveAttribute("aria-pressed", "true");

  const teaser = page.getByRole("group", { name: "Devine la voiture" });
  await teaser.scrollIntoViewIfNeeded();
  await teaser.getByRole("button", { name: "Ferrari Testarossa" }).click();
  await expect(page.getByText("Bien vu, c'est une Ferrari Testarossa.")).toBeVisible();
  await page.getByRole("button", { name: "Voiture suivante" }).click();
  await page.getByRole("group", { name: "Devine la voiture" }).getByRole("button", { name: "Ferrari F40" }).click();
  await expect(page.getByText("Raté : c'était une Porsche 911.")).toBeVisible();
  await expect(page.getByText(/1 trouvée sur 2/)).toBeVisible();
});

test("les crédits des photos d'ambiance sont publiés", async ({ page }) => {
  await page.goto("/sources");
  const table = page.locator("#photos ~ table").first();
  await expect(table.getByRole("link", { name: "Porsche 911 sous la pluie" })).toHaveAttribute("href", /commons\.wikimedia\.org/);
  await expect(table.getByRole("link", { name: "CC BY-SA 4.0" }).first()).toBeVisible();
});
