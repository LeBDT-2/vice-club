import { expect, test, type Browser, type Page } from "@playwright/test";
import { admin, createUser, deleteUser, expectUniqueIds, login, type E2EUser } from "./helpers";

let a: E2EUser;
let b: E2EUser;

test.beforeAll(async () => {
  [a, b] = await Promise.all([createUser("socA"), createUser("socB")]);
});
test.afterAll(async () => {
  await deleteUser(a);
  await deleteUser(b);
});

async function pageAs(browser: Browser, u: E2EUser): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, u.email);
  return page;
}

test("demande de contact, acceptation, messagerie, signalement puis blocage", async ({ browser }) => {
  const pa = await pageAs(browser, a);
  const pb = await pageAs(browser, b);

  // A trouve B et lui écrit une demande.
  await pa.goto(`/joueurs/${b.username}`);
  await expectUniqueIds(pa);
  await pa.getByLabel(`Un mot pour ${b.username} (facultatif)`).fill("Partant pour une session ce soir ?");
  await pa.getByRole("button", { name: "Envoyer une demande de contact" }).click();
  await expect(pa.getByText("Ta demande de contact est en attente de réponse.")).toBeVisible();

  // Avant acceptation, A ne peut pas écrire : aucune conversation.
  const { count: before } = await admin.from("conversations").select("id", { count: "exact", head: true }).or(`user_low.eq.${a.id},user_high.eq.${a.id}`);
  expect(before).toBe(0);

  // B accepte.
  await pb.goto("/demandes");
  await expect(pb.getByText("Partant pour une session ce soir ?")).toBeVisible();
  await pb.getByRole("button", { name: `Accepter la demande de ${a.username}` }).click();
  await expect(pb).toHaveURL(/\/messages\//);

  // Messagerie dans les deux sens.
  await pb.getByLabel("Ton message").fill("Carrément, 21h ?");
  await pb.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(pb.getByText("Carrément, 21h ?")).toBeVisible();

  await pa.goto("/messages");
  await pa.getByRole("link", { name: new RegExp(b.username) }).first().click();
  await expect(pa.getByText("Carrément, 21h ?")).toBeVisible();
  await pa.getByLabel("Ton message").fill("Ça marche !");
  await pa.getByLabel("Ton message").press("Enter");
  await expect(pa.getByText("Ça marche !")).toBeVisible();

  // A signale le profil de B.
  await pa.goto(`/joueurs/${b.username}`);
  await pa.getByText("Signaler ce profil").click();
  await pa.getByLabel("Motif").selectOption("spam");
  await pa.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(pa.getByText("Signalement transmis à l'équipe de modération. Merci.")).toBeVisible();
  const { data: reports } = await admin.from("reports").select("reason, target_user_id").eq("reporter_id", a.id);
  expect(reports).toEqual([{ reason: "spam", target_user_id: b.id }]);

  // B bloque A depuis la conversation : A ne peut plus écrire.
  await pb.goto("/messages");
  await pb.getByRole("link", { name: new RegExp(a.username) }).first().click();
  await pb.getByRole("button", { name: "Bloquer" }).click();
  await pa.goto("/messages");
  const conv = pa.getByRole("link", { name: new RegExp(b.username) });
  if (await conv.count()) {
    await conv.first().click();
    await expect(pa.getByLabel("Ton message")).toHaveCount(0);
  }
  await pa.goto(`/joueurs/${b.username}`);
  await expect(pa.getByRole("button", { name: "Envoyer une demande de contact" })).toHaveCount(0);
});
