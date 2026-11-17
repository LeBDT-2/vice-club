import "server-only";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export type CatalogVehicle = {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  gameId: string;
  gameName: string;
  cost: number;
  imageUrl: string | null;
  imagePath: string | null;
  isDemo: boolean;
};

export const CATEGORY_LABEL: Record<string, string> = {
  sport: "Sportive",
  super: "Supercar",
  muscle: "Muscle",
  classique: "Classique",
  tout_terrain: "Tout-terrain",
  berline: "Berline",
  suv: "SUV",
  compacte: "Compacte",
  moto: "Moto",
  utilitaire: "Utilitaire",
  autre: "Autre",
};

export function publicMediaUrl(path: string | null | undefined) {
  return path ? `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-media/${path}` : null;
}

type VehicleRow = {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  game_id: string;
  garage_cost: number;
  is_demo: boolean;
  media_assets: { path: string } | null;
  games: { name: string } | null;
};

function toCatalog(v: VehicleRow): CatalogVehicle {
  return {
    id: v.id,
    name: v.name,
    manufacturer: v.manufacturer,
    category: v.category,
    gameId: v.game_id,
    gameName: v.games?.name ?? "",
    cost: v.garage_cost,
    imageUrl: publicMediaUrl(v.media_assets?.path),
    imagePath: v.media_assets?.path ?? null,
    isDemo: v.is_demo,
  };
}

const VEHICLE_SELECT = "id, name, manufacturer, category, game_id, garage_cost, is_demo, media_assets(path), games(name)";

/** Catalogue publié (lecture publique soumise à la RLS). */
export async function listVehicleCatalog(): Promise<CatalogVehicle[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("vehicles").select(VEHICLE_SELECT).eq("status", "published").order("name").limit(1000);
  return ((data ?? []) as unknown as VehicleRow[]).map(toCatalog);
}

export type GarageSummary = {
  id: string;
  name: string;
  description: string;
  visibility: "private" | "public";
  shareSlug: string;
  hidden: boolean;
  updatedAt: string;
  vehicles: CatalogVehicle[];
  total: number;
};

async function garagesWithVehicles(rows: { id: string; name: string; description: string; visibility: string; share_slug: string; hidden_at: string | null; updated_at: string }[]) {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("garage_vehicles")
    .select(`garage_id, position, vehicles(${VEHICLE_SELECT})`)
    .in("garage_id", rows.map((r) => r.id))
    .order("position");
  const byGarage = new Map<string, CatalogVehicle[]>();
  for (const l of (links ?? []) as unknown as { garage_id: string; vehicles: VehicleRow | null }[]) {
    if (!l.vehicles) continue; // véhicule dépublié depuis
    const list = byGarage.get(l.garage_id) ?? [];
    list.push(toCatalog(l.vehicles));
    byGarage.set(l.garage_id, list);
  }
  return rows.map((g) => {
    const vehicles = byGarage.get(g.id) ?? [];
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      visibility: g.visibility as "private" | "public",
      shareSlug: g.share_slug,
      hidden: Boolean(g.hidden_at),
      updatedAt: g.updated_at,
      vehicles,
      total: vehicles.reduce((a, v) => a + v.cost, 0),
    };
  });
}

export async function myGarages(userId: string): Promise<GarageSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("garages")
    .select("id, name, description, visibility, share_slug, hidden_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  return garagesWithVehicles(data ?? []);
}

export async function getOwnGarage(userId: string, id: string): Promise<GarageSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("garages")
    .select("id, name, description, visibility, share_slug, hidden_at, updated_at")
    .eq("owner_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return (await garagesWithVehicles([data]))[0];
}

/** Garage par lien de partage : la RLS ne renvoie que les garages publics (ou le sien). */
export async function getGarageBySlug(slug: string) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("garages")
    .select("id, owner_id, name, description, visibility, share_slug, hidden_at, updated_at")
    .eq("share_slug", slug)
    .maybeSingle();
  if (!data) return null;
  const [garage] = await garagesWithVehicles([data]);
  const { data: owner } = await supabase.from("profiles").select("username, avatar_path").eq("id", data.owner_id).maybeSingle();
  return { ...garage, ownerId: data.owner_id, owner: owner ?? null };
}

/** Garages publics d'un joueur (page profil). */
export async function publicGaragesOf(userId: string): Promise<GarageSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("garages")
    .select("id, name, description, visibility, share_slug, hidden_at, updated_at")
    .eq("owner_id", userId)
    .eq("visibility", "public")
    .is("hidden_at", null)
    .order("updated_at", { ascending: false })
    .limit(10);
  return garagesWithVehicles(data ?? []);
}
