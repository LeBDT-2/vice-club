"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Client navigateur (clé publique). Utilisé uniquement pour Realtime. */
export function createBrowserSupabase() {
  if (client) return client;
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: { secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") } },
  );
  return client;
}
