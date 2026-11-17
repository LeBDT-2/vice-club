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
  await teaser.getByRole("button", { name: "Progen T20" }).click();
  await expect(page.getByText("Bien vu, c'est une Progen T20.")).toBeVisible();
  await page.getByRole("button", { name: "Voiture suivante" }).click();
  await page.getByRole("group", { name: "Devine la voiture" }).getByRole("button", { name: "Grotti Stinger" }).click();
  await expect(page.getByText("Raté : c'était une Invetero Coquette Classic.")).toBeVisible();
  await expect(page.getByText(/1 trouvée sur 2/)).toBeVisible();
});

test("accueil : section GTA VI avec logo, compte à rebours et crédit Rockstar", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Vice City, le retour" }) });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("img", { name: "Logo de Grand Theft Auto VI" })).toBeVisible();
  await expect(section.getByRole("link", { name: /Site officiel de Rockstar/ })).toHaveAttribute("href", "https://www.rockstargames.com/VI");
  await expect(section.getByText(/site de fans non officiel/)).toBeVisible();
});

test("les crédits des visuels GTA et des photos d'ambiance sont publiés", async ({ page }) => {
  await page.goto("/sources");
  await expect(page.locator("#gta ~ table").first().getByRole("link", { name: "Logo officiel" })).toHaveAttribute("href", "https://www.rockstargames.com/VI");
  const table = page.locator("#photos ~ table").first();
  await expect(table.getByRole("link", { name: "Porsche 911 sous la pluie" })).toHaveAttribute("href", /commons\.wikimedia\.org/);
  await expect(table.getByRole("link", { name: "CC BY-SA 4.0" }).first()).toBeVisible();
});
