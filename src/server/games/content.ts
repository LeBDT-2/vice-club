import "server-only";
import { randomInt } from "node:crypto";
import type { AdminClient } from "@/lib/supabase/admin";
import type { GameKind } from "@/lib/games/scoring";

/**
 * Accès aux contenus SECRETS des jeux (solutions). Uniquement via le client
 * privilégié, depuis le moteur de jeu. Ne jamais renvoyer ces objets tels quels
 * au navigateur.
 */

export type RoundRef = { ref_type: string; ref_id: string; ref_b_type?: string | null; ref_b_id?: string | null; max_attempts: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class NotEnoughContentError extends Error {
  constructor() {
    super("not_enough_content");
  }
}

export async function pickTrainingRounds(admin: AdminClient, kind: GameKind, count: number): Promise<RoundRef[]> {
  if (kind === "where") {
    const { data } = await admin.from("geo_locations").select("id, game_maps!inner(status)").eq("status", "published").eq("game_maps.status", "published").limit(500);
    const ids = shuffle((data ?? []).map((r) => r.id)).slice(0, count);
    if (ids.length < Math.min(count, 3)) throw new NotEnoughContentError();
    return ids.map((id) => ({ ref_type: "geo_location", ref_id: id, max_attempts: 1 }));
  }
  if (kind === "mystery") {
    const { data } = await admin.from("mystery_puzzles").select("id").eq("status", "published").limit(500);
    const ids = shuffle((data ?? []).map((r) => r.id)).slice(0, count);
    if (ids.length < count) throw new NotEnoughContentError();
    return ids.map((id) => ({ ref_type: "mystery_puzzle", ref_id: id, max_attempts: 6 }));
  }
  if (kind === "reality") {
    const { data } = await admin.from("reality_items").select("id").eq("status", "published").limit(1000);
    const ids = shuffle((data ?? []).map((r) => r.id)).slice(0, count);
    if (ids.length < Math.min(count, 5)) throw new NotEnoughContentError();
    return ids.map((id) => ({ ref_type: "reality_item", ref_id: id, max_attempts: 1 }));
  }
  const pair = await pickPricePair(admin, []);
  if (!pair) throw new NotEnoughContentError();
  return [pair];
}

type PriceItem = { type: "vehicle" | "property"; id: string; gameId: string; priceType: string };

async function pricePool(admin: AdminClient): Promise<PriceItem[]> {
  const [{ data: v }, { data: p }] = await Promise.all([
    admin.from("vehicles").select("id, game_id, game_price_type").eq("status", "published").not("game_price", "is", null).limit(2000),
    admin.from("properties").select("id, game_id, game_price_type").eq("status", "published").limit(2000),
  ]);
  return [
    ...(v ?? []).map((r) => ({ type: "vehicle" as const, id: r.id, gameId: r.game_id, priceType: r.game_price_type ?? "" })),
    ...(p ?? []).map((r) => ({ type: "property" as const, id: r.id, gameId: r.game_id, priceType: r.game_price_type })),
  ].filter((i) => i.priceType);
}

/** Paire comparable : même jeu, même type de prix (standard/promo/échange). */
export async function pickPricePair(admin: AdminClient, usedIds: string[]): Promise<RoundRef | null> {
  const pool = await pricePool(admin);
  const used = new Set(usedIds);
  const fresh = pool.filter((i) => !used.has(i.id));
  const candidates = fresh.length >= 2 ? fresh : pool;
  for (let attempt = 0; attempt < 20; attempt++) {
    const a = candidates[randomInt(candidates.length || 1)];
    if (!a) return null;
    const mates = candidates.filter((b) => b.id !== a.id && b.gameId === a.gameId && b.priceType === a.priceType);
    if (mates.length === 0) continue;
    const b = mates[randomInt(mates.length)];
    return { ref_type: a.type, ref_id: a.id, ref_b_type: b.type, ref_b_id: b.id, max_attempts: 1 };
  }
  return null;
}

export type PriceItemDetail = {
  type: "vehicle" | "property";
  id: string;
  name: string;
  subtitle: string;
  price: number;
  priceType: string;
  priceNote: string;
  source: string;
  verifiedAt: string;
  imagePath: string | null;
  gameName: string;
  isDemo: boolean;
};

export async function loadPriceItem(admin: AdminClient, type: string, id: string): Promise<PriceItemDetail | null> {
  if (type === "vehicle") {
    const { data } = await admin
      .from("vehicles")
      .select("id, name, manufacturer, category, game_price, game_price_type, game_price_note, price_source, price_verified_at, is_demo, media_assets(path), games(name)")
      .eq("id", id)
      .maybeSingle();
    if (!data || data.game_price === null) return null;
    return {
      type: "vehicle",
      id: data.id,
      name: data.name,
      subtitle: [data.manufacturer, "Véhicule"].filter(Boolean).join(" · "),
      price: Number(data.game_price),
      priceType: data.game_price_type ?? "standard",
      priceNote: data.game_price_note,
      source: data.price_source ?? "",
      verifiedAt: data.price_verified_at ?? "",
      imagePath: data.media_assets?.path ?? null,
      gameName: data.games?.name ?? "",
      isDemo: data.is_demo,
    };
  }
  const { data } = await admin
    .from("properties")
    .select("id, name, kind, location_label, game_price, game_price_type, game_price_note, price_source, price_verified_at, is_demo, media_assets(path), games(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    type: "property",
    id: data.id,
    name: data.name,
    subtitle: ["Propriété", data.location_label].filter(Boolean).join(" · "),
    price: Number(data.game_price),
    priceType: data.game_price_type,
    priceNote: data.game_price_note,
    source: data.price_source,
    verifiedAt: data.price_verified_at,
    imagePath: data.media_assets?.path ?? null,
    gameName: data.games?.name ?? "",
    isDemo: data.is_demo,
  };
}

export async function loadGeoLocation(admin: AdminClient, id: string) {
  const { data } = await admin
    .from("geo_locations")
    .select("id, name, description, x, y, is_demo, screenshot:media_assets!geo_locations_screenshot_id_fkey(path, alt_text, source, author, license), game_maps(id, name, width, height, scale_verified, meters_per_unit, is_demo, image:media_assets(path, source, author, license))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function loadMysteryPuzzle(admin: AdminClient, id: string) {
  const { data } = await admin
    .from("mystery_puzzles")
    .select("id, vehicle_id, stage_paths, reveal_path, hints, is_demo, source:media_assets(source, author, license), vehicles(id, name, manufacturer, category, game_id)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function loadRealityItem(admin: AdminClient, id: string) {
  const { data } = await admin
    .from("reality_items")
    .select("id, answer, explanation, is_demo, media:media_assets(path, alt_text, source, author, license, is_ai_generated)")
    .eq("id", id)
    .maybeSingle();
  return data;
}
