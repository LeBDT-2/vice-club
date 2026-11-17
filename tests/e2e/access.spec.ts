import { expect, test } from "@playwright/test";
import { createUser, deleteUser, login, type E2EUser } from "./helpers";

let u: E2EUser;
test.beforeAll(async () => {
  u = await createUser("acs");
});
test.afterAll(async () => deleteUser(u));

test("un membre sans rôle n'accède pas à l'administration", async ({ page }) => {
  await login(page, u.email);
  for (const path of ["/admin", "/admin/signalements", "/admin/contact", "/admin/contenu/medias", "/admin/parametres"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/acces-refuse/);
  }
});

test("les routes privées ne sont pas mises en cache et sont exclues de l'indexation", async ({ page }) => {
  await login(page, u.email);
  const res = await page.goto("/compte");
  expect(res?.headers()["cache-control"] ?? "").toMatch(/private|no-store/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("en-têtes de sécurité présents", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["x-powered-by"]).toBeUndefined();
});
