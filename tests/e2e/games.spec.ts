import { expect, test } from "@playwright/test";
import { admin } from "./helpers";

test("un visiteur joue une partie d'entraînement complète au clavier, sans voir les réponses", async ({ page }) => {
  const { count } = await admin.from("reality_items").select("id", { count: "exact", head: true }).eq("status", "published");
  test.skip((count ?? 0) < 5, "Pas assez de contenu publié pour « GTA ou réalité ? » (lancer pnpm seed:demo en local).");

  await page.goto("/mini-jeux/gta-ou-realite");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page).toHaveURL(/\/mini-jeux\/gta-ou-realite\/partie\//);
  await page.waitForLoadState("networkidle"); // hydratation terminée avant d'utiliser le clavier

  // Le HTML de la page ne contient jamais la vérité de la manche.
  const html = await page.content();
  expect(html).not.toMatch(/"truth"|"answer":"(gta|reality)"/);

  for (let round = 0; round < 20; round++) {
    const answer = page.getByRole("button", { name: "Capture GTA" });
    if (!(await answer.isVisible().catch(() => false))) break;
    await expect(answer).toBeEnabled();
    await answer.focus();
    await page.keyboard.press("Enter");
    const next = page.getByRole("button", { name: /Manche suivante|Voir le résultat/ });
    await expect(next).toBeVisible();
    await next.press("Enter");
    // Attend la manche suivante ou le résultat (la réponse reste affichée pendant le chargement).
    await expect(page.getByRole("button", { name: "Capture GTA" }).or(page.getByRole("heading", { name: "Résultat", exact: true })).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Résultat", exact: true })).toBeVisible();
  await expect(page.getByText(/Rejouer/)).toBeVisible();
});

test("une partie d'un autre visiteur est introuvable", async ({ page, browser }) => {
  const { count } = await admin.from("reality_items").select("id", { count: "exact", head: true }).eq("status", "published");
  test.skip((count ?? 0) < 5, "Contenu insuffisant.");
  await page.goto("/mini-jeux/gta-ou-realite");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page).toHaveURL(/\/partie\//);
  const url = page.url();
  const stranger = await browser.newContext();
  const p2 = await stranger.newPage();
  const res = await p2.goto(url);
  expect(res?.status()).toBe(404);
  const sessionId = new URL(url).pathname.split("/").pop();
  const imgUrl = `/api/jeux/${sessionId}/image/1`;
  // Le propriétaire voit l'image ; l'inconnu reçoit 404.
  expect((await page.request.get(imgUrl)).status()).toBe(200);
  expect((await p2.request.get(imgUrl)).status()).toBe(404);
  await stranger.close();
});
