import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { TERMS_VERSION } from "@/lib/validation/auth";
import { loadTestEnv } from "./env";

const env = loadTestEnv();
const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export type Client = SupabaseClient<Database>;
export const admin: Client = createClient<Database>(env.url, env.secret, opts);
export const anon = (): Client => createClient<Database>(env.url, env.anon, opts);

export type TestUser = { id: string; email: string; username: string; client: Client };
const created: string[] = [];
const PASSWORD = "Test-Pa55word!";

/** Crée un compte confirmé avec pseudo, et renvoie un client connecté en son nom. */
export async function createUser(label: string): Promise<TestUser> {
  const tag = randomUUID().slice(0, 8);
  const email = `rls-${label}-${tag}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { age_confirmed: "true", terms_version: TERMS_VERSION },
  });
  if (error || !data.user) throw error ?? new Error("createUser");
  created.push(data.user.id);
  const client = anon();
  const { error: signErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signErr) throw signErr;
  const username = `T_${label}_${tag}`.slice(0, 20);
  const { error: uErr } = await client.from("profiles").update({ username }).eq("id", data.user.id);
  if (uErr) throw uErr;
  return { id: data.user.id, email, username, client };
}

export async function deleteCreatedUsers() {
  for (const id of created.splice(0)) await admin.auth.admin.deleteUser(id);
}

/** Message d'erreur Postgres/PostgREST, pour vérifier les exceptions nommées. */
export function errText(e: { message?: string; details?: string; hint?: string } | null | undefined) {
  return e ? `${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}` : "";
}
