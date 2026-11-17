import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Charge .env.local (local) puis vérifie qu'on vise bien une base LOCALE. */
export function loadTestEnv() {
  const file = resolve(process.cwd(), ".env.local");
  if (existsSync(file) && !process.env.NEXT_PUBLIC_SUPABASE_URL) process.loadEnvFile(file);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+/.test(url)) {
    throw new Error(`Les tests d'intégration ne tournent que sur une base locale (supabase start). URL reçue : « ${url || "vide"} ».`);
  }
  if (!anon || !secret) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY et SUPABASE_SECRET_KEY sont requis (voir supabase status).");
  return { url, anon, secret };
}
