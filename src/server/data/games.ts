import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GameKind } from "@/lib/games/scoring";
import { getTodayChallenge } from "@/server/games/engine";

export type Availability = Record<GameKind | "garage", { ready: boolean; count: number; demo: boolean }>;

/**
 * Indique si chaque mini-jeu dispose d'assez de contenu publié pour être joué.
 * Ne renvoie que des compteurs : aucune donnée de solution ne sort d'ici.
 */
export const gameAvailability = cache(async (): Promise<Availability> => {
  const admin = createAdminClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [where, whereDemo, mystery, mysteryDemo, reality, realityDemo, priced, pricedDemo, props, vehicles, vehiclesDemo] = await Promise.all([
    count(admin.from("geo_locations").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(admin.from("geo_locations").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", true)),
    count(admin.from("mystery_puzzles").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(admin.from("mystery_puzzles").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", true)),
    count(admin.from("reality_items").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(admin.from("reality_items").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", true)),
    count(admin.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "published").not("game_price", "is", null)),
    count(admin.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", true).not("game_price", "is", null)),
    count(admin.from("properties").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(admin.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(admin.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "published").eq("is_demo", true)),
  ]);
  return {
    garage: { ready: vehicles >= 5, count: vehicles, demo: vehiclesDemo > 0 },
    where: { ready: where >= 3, count: where, demo: whereDemo > 0 },
    mystery: { ready: mystery >= 1, count: mystery, demo: mysteryDemo > 0 },
    higher_lower: { ready: priced + props >= 2, count: priced + props, demo: pricedDemo > 0 },
    reality: { ready: reality >= 5, count: reality, demo: realityDemo > 0 },
  };
});

export const todayChallenge = cache(async () => getTodayChallenge());

export type MyResult = {
  sessionId: string;
  kind: GameKind;
  mode: string;
  ranked: boolean;
  challengeDate: string | null;
  score: number;
  maxScore: number | null;
  completedAt: string;
  shareText: string;
};

/** Résultats personnels (RLS : uniquement les siens). */
export async function myResults(limit = 30, offset = 0): Promise<MyResult[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_results")
    .select("session_id, game_kind, mode, ranked, challenge_date, score, max_score, completed_at, share_text")
    .order("completed_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []).map((r) => ({
    sessionId: r.session_id,
    kind: r.game_kind as GameKind,
    mode: r.mode,
    ranked: r.ranked,
    challengeDate: r.challenge_date,
    score: r.score,
    maxScore: r.max_score,
    completedAt: r.completed_at,
    shareText: r.share_text,
  }));
}

export async function myBestScores(): Promise<Partial<Record<GameKind, number>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("game_results").select("game_kind, score").order("score", { ascending: false }).limit(500);
  const best: Partial<Record<GameKind, number>> = {};
  for (const r of data ?? []) {
    const k = r.game_kind as GameKind;
    if (best[k] === undefined) best[k] = r.score;
  }
  return best;
}
