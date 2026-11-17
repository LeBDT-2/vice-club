import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export class RateLimitError extends Error {
  constructor() {
    super("rate_limited");
  }
}

/**
 * Limitation de débit persistante (table Postgres, compatible serverless).
 * Chaque règle = { clé, maximum, fenêtre en secondes }. Toutes doivent passer.
 */
export async function enforceRateLimits(rules: { key: string; max: number; windowSeconds: number }[]) {
  const admin = createAdminClient();
  for (const rule of rules) {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_bucket: rule.key,
      p_max: rule.max,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      // En cas de panne, on refuse plutôt que d'ouvrir silencieusement.
      console.error("[rate-limit] indisponible", { code: error.code });
      throw new RateLimitError();
    }
    if (data !== true) throw new RateLimitError();
  }
}
