import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client Supabase agissant AU NOM de l'utilisateur courant (JWT de la session).
 * Toutes les règles RLS s'appliquent.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    // Cookies de session marqués Secure dès que le site est servi en HTTPS.
    cookieOptions: { secure: env.NEXT_PUBLIC_SITE_URL.startsWith("https://") },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le proxy se charge du rafraîchissement.
        }
      },
    },
  });
}

export type UserClient = Awaited<ReturnType<typeof createClient>>;
