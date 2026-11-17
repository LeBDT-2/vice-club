import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client PRIVILÉGIÉ (clé secrète, contourne la RLS).
 *
 * Usage strictement limité et toujours précédé d'un contrôle d'autorisation explicite :
 *  - moteur des mini-jeux (tables de solutions inaccessibles aux clients) ;
 *  - back-office de contenu (après requireStaff('admin') + MFA) ;
 *  - opérations Auth admin (suppression de compte) et dépôts Storage ré-encodés ;
 *  - limitation de débit persistante.
 * Ne jamais l'importer dans un composant client (protégé par "server-only").
 */
let cached: ReturnType<typeof createClient<Database>> | undefined;
export function createAdminClient() {
  if (cached) return cached;
  const env = serverEnv();
  cached = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}

export type AdminClient = ReturnType<typeof createAdminClient>;
