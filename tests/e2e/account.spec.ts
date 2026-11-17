import { expect, test } from "@playwright/test";
import { admin, createUser, deleteUser, expectUniqueIds, login, PASSWORD, type E2EUser } from "./helpers";

let u: E2EUser;
let other: E2EUser;

test.beforeAll(async () => {
  [u, other] = await Promise.all([createUser("acc"), createUser("accO")]);
});
test.afterAll(async () => {
  await deleteUser(u);
  await deleteUser(other);
});

test("un faux fichier image est refusé comme avatar", async ({ page }) => {
  await login(page, u.email);
  await page.goto("/compte/profil");
  await expectUniqueIds(page);
  await page.getByLabel("Nouvelle image").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'></svg>"),
  });
  await page.getByRole("button", { name: "Mettre à jour l'avatar" }).click();
  await expect(page.locator("#f-avatar-err")).toBeVisible();
  const { data } = await admin.from("profiles").select("avatar_path").eq("id", u.id).single();
  expect(data?.avatar_path).toBeNull();
});

test("l'export ne contient que mes données", async ({ page }) => {
  await login(page, u.email);
  const res = await page.request.get("/compte/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const body = await res.text();
  expect(body).toContain(u.id);
  expect(body).not.toContain(other.id);
  expect(body).not.toContain(other.email);
  // Sans session : refus.
  const anon = await page.context().browser()!.newContext();
  expect((await anon.request.get(`${test.info().project.use.baseURL}/compte/export`)).status()).toBe(401);
  await anon.close();
});

test("suppression du compte avec confirmation par mot de passe", async ({ page }) => {
  await login(page, u.email);
  await page.goto("/compte");
  // Mauvais mot de passe : refus.
  await page.locator("#delete-current").fill("Mauvais-mot-de-passe1");
  await page.getByLabel("Tape SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();
  // Bon mot de passe : compte supprimé et déconnexion.
  await page.locator("#delete-current").fill(PASSWORD);
  await page.getByLabel("Tape SUPPRIMER pour confirmer").fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page).toHaveURL(/compte=supprime/);
  const { data } = await admin.auth.admin.getUserById(u.id);
  expect(data.user).toBeNull();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("id", u.id);
  expect(count).toBe(0);
});
