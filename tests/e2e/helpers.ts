import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { TERMS_VERSION } from "../../src/lib/validation/auth";
import { loadTestEnv } from "../db/env";

const env = loadTestEnv();
export const admin = createClient<Database>(env.url, env.secret, { auth: { persistSession: false, autoRefreshToken: false } });
export const PASSWORD = "E2e-Pa55word!";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export type E2EUser = { id: string; email: string; username: string };

/** Compte confirmé créé par l'API d'administration (pour les parcours qui ne testent pas l'inscription). */
export async function createUser(label: string): Promise<E2EUser> {
  const tag = randomUUID().slice(0, 6);
  const email = `e2e-${label}-${tag}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { age_confirmed: "true", terms_version: TERMS_VERSION },
  });
  if (error || !data.user) throw error ?? new Error("createUser");
  const username = `E2e_${label}_${tag}`.slice(0, 20);
  const { error: e2 } = await admin.from("profiles").update({ username }).eq("id", data.user.id);
  if (e2) throw e2;
  return { id: data.user.id, email, username };
}

export async function deleteUser(u: E2EUser | undefined) {
  if (u) await admin.auth.admin.deleteUser(u.id).catch(() => undefined);
}

export async function login(page: Page, email: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/\/connexion/);
}

/** Dernier lien reçu par une adresse dans Mailpit (SMTP local de Supabase). */
export async function lastMailLink(to: string, pathPart: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const list = (await res.json()) as { messages: { ID: string }[] };
    if (list.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()) as { HTML: string };
      const m = msg.HTML.match(new RegExp(`href="([^"]*${pathPart}[^"]*)"`));
      if (m) return m[1].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun e-mail contenant ${pathPart} pour ${to}`);
}

/** Aucune valeur d'attribut id ne doit apparaître deux fois (libellés de formulaires fiables). */
export async function expectUniqueIds(page: Page) {
  const dupes = await page.evaluate(() => {
    const seen = new Map<string, number>();
    document.querySelectorAll("[id]").forEach((el) => seen.set(el.id, (seen.get(el.id) ?? 0) + 1));
    return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  });
  expect(dupes, `identifiants dupliqués sur ${page.url()}`).toEqual([]);
}
