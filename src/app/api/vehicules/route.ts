import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  q: z.string().trim().min(1).max(40),
  jeu: z.uuid().optional(),
});

/** Suggestions de véhicules publiés (lecture publique soumise à la RLS). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "", jeu: url.searchParams.get("jeu") || undefined });
  if (!parsed.success) return NextResponse.json({ items: [] });
  const supabase = await createClient();
  const pattern = `%${parsed.data.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  let query = supabase.from("vehicles").select("id, name, manufacturer").eq("status", "published").ilike("name", pattern).order("name").limit(10);
  if (parsed.data.jeu) query = query.eq("game_id", parsed.data.jeu);
  const { data } = await query;
  return NextResponse.json({ items: data ?? [] }, { headers: { "Cache-Control": "public, max-age=60" } });
}
