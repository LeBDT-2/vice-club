import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Présence technique (distincte de la disponibilité déclarée) : mise à jour au plus
 * toutes les 5 minutes, à partir de la navigation. Jamais affichée comme « en ligne ».
 */
export async function touchPresence(userId: string) {
  const threshold = new Date(Date.now() - 5 * 60_000).toISOString();
  await createAdminClient()
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId)
    .or(`last_seen_at.is.null,last_seen_at.lt.${threshold}`);
}
