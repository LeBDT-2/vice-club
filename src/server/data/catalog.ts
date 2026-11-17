import "server-only";
import { createClient } from "@/lib/supabase/server";

export type GamePlatformOption = {
  id: string;
  gameId: string;
  gameName: string;
  gameShort: string;
  platformName: string;
  platformShort: string;
  versionLabel: string;
  matchmaking: boolean;
  label: string;
};

/** Combinaisons jeu × plateforme publiées (configurées dans l'administration). */
export async function listGamePlatforms(): Promise<GamePlatformOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_platforms")
    .select("id, version_label, matchmaking_enabled, game:games!inner(id, name, short_name, sort_order), platform:platforms!inner(name, short_name, sort_order)")
    .eq("status", "published");
  return (data ?? [])
    .map((gp) => ({
      id: gp.id,
      gameId: gp.game.id,
      gameName: gp.game.name,
      gameShort: gp.game.short_name,
      platformName: gp.platform.name,
      platformShort: gp.platform.short_name,
      versionLabel: gp.version_label,
      matchmaking: gp.matchmaking_enabled,
      label: `${gp.game.short_name} · ${gp.platform.short_name}${gp.version_label ? ` (${gp.version_label})` : ""}`,
      _sort: gp.game.sort_order * 1000 + gp.platform.sort_order,
    }))
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...rest }) => { void _sort; return rest; });
}

export async function listPublishedGames() {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("id, slug, name, short_name").eq("status", "published").order("sort_order");
  return data ?? [];
}

export async function listPublishedPlatforms() {
  const supabase = await createClient();
  const { data } = await supabase.from("platforms").select("id, slug, name, short_name").eq("status", "published").order("sort_order");
  return data ?? [];
}

export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    garageBudget: Number(map.get("garage_budget") ?? 10_000_000),
    garageMaxVehicles: Number(map.get("garage_max_vehicles") ?? 5),
    garageMaxPerUser: Number(map.get("garage_max_per_user") ?? 10),
  };
}
