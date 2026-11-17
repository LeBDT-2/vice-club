import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGES, PLAY_STYLES } from "@/lib/validation/profile";

export const PAGE_SIZE = 12;

export const playerFiltersSchema = z.object({
  jeu: z.uuid().optional().catch(undefined),
  plateforme: z.uuid().optional().catch(undefined),
  langue: z.enum(Object.keys(LANGUAGES) as [string, ...string[]]).optional().catch(undefined),
  style: z.enum(Object.keys(PLAY_STYLES) as [string, ...string[]]).optional().catch(undefined),
  micro: z.enum(["oui"]).optional().catch(undefined),
  dispo: z.enum(["maintenant", "bientot"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
});
export type PlayerFilters = z.infer<typeof playerFiltersSchema>;

export type PlayerCardData = {
  id: string;
  username: string;
  avatarPath: string | null;
  bio: string;
  languages: string[];
  styles: string[];
  hasMic: boolean | null;
  lastSeenAt: string | null;
  games: { label: string; gameShort: string; platformShort: string }[];
  availability: { kind: "now" | "planned"; startsAt: string; endsAt: string; note: string } | null;
};

type GpRow = {
  id: string;
  game_id: string;
  platform_id: string;
  crossplay_group: string | null;
  matchmaking_enabled: boolean;
};

/** Combinaisons compatibles avec (jeu, plateforme) selon la configuration de l'administration. */
export function compatibleGamePlatformIds(all: GpRow[], gameId?: string, platformId?: string): string[] | null {
  if (!gameId && !platformId) return null;
  const enabled = all.filter((gp) => gp.matchmaking_enabled);
  if (gameId && !platformId) return enabled.filter((gp) => gp.game_id === gameId).map((gp) => gp.id);
  if (!gameId && platformId) return enabled.filter((gp) => gp.platform_id === platformId).map((gp) => gp.id);
  const selected = enabled.filter((gp) => gp.game_id === gameId && gp.platform_id === platformId);
  const groups = new Set(selected.map((gp) => gp.crossplay_group).filter((g): g is string => Boolean(g)));
  return enabled
    .filter((gp) => gp.game_id === gameId && (gp.platform_id === platformId || (gp.crossplay_group && groups.has(gp.crossplay_group))))
    .map((gp) => gp.id);
}

export async function searchPlayers(filters: PlayerFilters, viewerId: string | null) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: gps } = await supabase.from("game_platforms").select("id, game_id, platform_id, crossplay_group, matchmaking_enabled");
  const compatible = compatibleGamePlatformIds(gps ?? [], filters.jeu, filters.plateforme);
  if (compatible && compatible.length === 0) return { players: [] as PlayerCardData[], total: 0 };

  const availSelect = filters.dispo ? "availabilities!inner(kind, starts_at, ends_at, note)" : "availabilities(kind, starts_at, ends_at, note)";
  const gamesSelect = compatible
    ? "profile_games!inner(game_platform_id, game_platforms(version_label, games(short_name), platforms(short_name)))"
    : "profile_games(game_platform_id, game_platforms(version_label, games(short_name), platforms(short_name)))";

  let q = supabase
    .from("profiles")
    .select(`id, username, avatar_path, bio, languages, play_styles, has_mic, last_seen_at, ${gamesSelect}, ${availSelect}`, { count: "exact" })
    .not("username", "is", null)
    .is("hidden_at", null);

  if (viewerId) q = q.neq("id", viewerId);
  if (compatible) q = q.in("profile_games.game_platform_id", compatible);
  if (filters.langue) q = q.contains("languages", [filters.langue]);
  if (filters.style) q = q.contains("play_styles", [filters.style]);
  if (filters.micro === "oui") q = q.eq("has_mic", true);
  if (filters.dispo === "maintenant") q = q.lte("availabilities.starts_at", nowIso).gt("availabilities.ends_at", nowIso);
  if (filters.dispo === "bientot") {
    const in24h = new Date(Date.now() + 24 * 3600_000).toISOString();
    q = q.gt("availabilities.ends_at", nowIso).lte("availabilities.starts_at", in24h);
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error("search_failed");

  // Le filtre !inner ne garde que les profils compatibles, mais la liste des jeux
  // affichée doit être complète : on la recharge pour les profils de la page.
  const ids = (data ?? []).map((p) => p.id);
  const fullGames = new Map<string, PlayerCardData["games"]>();
  if (compatible && ids.length) {
    const { data: pg } = await supabase
      .from("profile_games")
      .select("profile_id, game_platforms(version_label, games(short_name), platforms(short_name))")
      .in("profile_id", ids);
    for (const row of pg ?? []) {
      const gp = row.game_platforms;
      if (!gp) continue;
      const list = fullGames.get(row.profile_id) ?? [];
      list.push({ label: `${gp.games.short_name} · ${gp.platforms.short_name}`, gameShort: gp.games.short_name, platformShort: gp.platforms.short_name });
      fullGames.set(row.profile_id, list);
    }
  }

  const players: PlayerCardData[] = (data ?? []).map((p) => {
    const av = Array.isArray(p.availabilities) ? p.availabilities[0] : p.availabilities;
    const activeAv = av && new Date(av.ends_at) > new Date() ? av : null;
    const games =
      fullGames.get(p.id) ??
      (p.profile_games ?? [])
        .filter((g) => g.game_platforms)
        .map((g) => ({
          label: `${g.game_platforms!.games.short_name} · ${g.game_platforms!.platforms.short_name}`,
          gameShort: g.game_platforms!.games.short_name,
          platformShort: g.game_platforms!.platforms.short_name,
        }));
    return {
      id: p.id,
      username: p.username!,
      avatarPath: p.avatar_path,
      bio: p.bio,
      languages: p.languages,
      styles: p.play_styles,
      hasMic: p.has_mic,
      lastSeenAt: p.last_seen_at,
      games,
      availability: activeAv ? { kind: activeAv.kind as "now" | "planned", startsAt: activeAv.starts_at, endsAt: activeAv.ends_at, note: activeAv.note } : null,
    };
  });
  return { players, total: count ?? 0 };
}

/** Joueurs disponibles maintenant (accueil) : données réelles uniquement. */
export async function availableNow(limit = 6, viewerId: string | null = null) {
  const res = await searchPlayers({ dispo: "maintenant", page: 1 }, viewerId);
  return res.players.slice(0, limit);
}
