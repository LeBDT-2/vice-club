import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, expectUniqueIds, lastMailLink, login, PASSWORD, type E2EUser } from "./helpers";

test.describe("Comptes", () => {
  test("inscription, confirmation par e-mail et choix du pseudo", async ({ page }) => {
    const email = `e2e-signup-${randomUUID().slice(0, 6)}@example.test`;
    await page.goto("/inscription");
    await expectUniqueIds(page);
    // Sans la déclaration 18+ : refus explicite.
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirme le mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Tu dois déclarer avoir 18 ans ou plus.")).toBeVisible();

    // L'e-mail saisi est conservé ; les mots de passe sont volontairement effacés.
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirme le mot de passe").fill(PASSWORD);
    await page.locator("input[name=age_confirmed]").check();
    await page.locator("input[name=terms_accepted]").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("status").first()).toBeVisible();

    const link = await lastMailLink(email, "auth/confirm");
    await page.goto(link);
    await expect(page).toHaveURL(/\/bienvenue/);
    const username = `Neo_${randomUUID().slice(0, 6)}`;
    await page.getByLabel("Ton pseudo public").fill(username);
    await page.getByRole("button", { name: "Valider mon pseudo" }).click();
    await expect(page).toHaveURL(/\/compte\/profil/);

    const { data } = await admin.from("profiles").select("id, username").eq("username", username).single();
    expect(data?.username).toBe(username);
    await admin.auth.admin.deleteUser(data!.id);
  });

  test.describe("compte existant", () => {
    let u: E2EUser;
    test.beforeAll(async () => {
      u = await createUser("auth");
    });
    test.afterAll(async () => deleteUser(u));

    test("mauvais mot de passe : message générique, puis connexion et déconnexion", async ({ page }) => {
      await page.goto("/connexion");
      await page.getByLabel("Adresse e-mail").fill(u.email);
      await page.getByLabel("Mot de passe", { exact: true }).fill("Faux-mot-de-passe1");
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(page.locator("[role=alert]").first()).toBeVisible();
      await expect(page).toHaveURL(/\/connexion/);

      await login(page, u.email);
      await page.goto("/compte");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectUniqueIds(page);
    });

    test("une URL de retour externe est ignorée", async ({ page }) => {
      await login(page, u.email, PASSWORD, "https://evil.example/vol");
      expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host);
    });

    test("mot de passe oublié puis réinitialisation", async ({ page }) => {
      await page.goto("/mot-de-passe-oublie");
      await page.getByLabel("Adresse e-mail du compte").fill(u.email);
      await page.getByRole("button", { name: "Recevoir un lien de réinitialisation" }).click();
      await expect(page.getByRole("status").first()).toBeVisible();
      const link = await lastMailLink(u.email, "auth/confirm");
      await page.goto(link);
      await expect(page).toHaveURL(/reinitialiser-mot-de-passe/);
      const next = "Nouv3au-Secret!";
      await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(next);
      await page.getByLabel("Confirme le nouveau mot de passe").fill(next);
      await page.getByRole("button", { name: "Enregistrer le nouveau mot de passe" }).click();
      await expect(page).not.toHaveURL(/reinitialiser-mot-de-passe/);
      await page.context().clearCookies();
      await login(page, u.email, next);
    });
  });

  test("les pages privées redirigent vers la connexion", async ({ page }) => {
    for (const path of ["/compte", "/messages", "/demandes", "/mon-garage/nouveau", "/admin"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/connexion\?next=/);
    }
  });
});
