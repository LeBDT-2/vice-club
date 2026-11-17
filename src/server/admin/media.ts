import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";

export type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  alt_text: string;
  source: string;
  author: string;
  license: string;
  usage_justification: string;
  is_ai_generated: boolean;
  validation_status: string;
  is_demo: boolean;
  width: number;
  height: number;
  created_at: string;
};

/** URL d'aperçu pour l'administration (signée et courte pour le stockage privé). */
export async function previewUrls(rows: { bucket: string; path: string }[]) {
  const admin = createAdminClient();
  const priv = rows.filter((r) => r.bucket === "game-media").map((r) => r.path);
  const signed = priv.length ? (await admin.storage.from("game-media").createSignedUrls(priv, 300)).data ?? [] : [];
  const map = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return (r: { bucket: string; path: string }) =>
    r.bucket === "public-media" ? `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-media/${r.path}` : (map.get(r.path) ?? null);
}

export async function listMedia(opts: { bucket?: string; status?: string; limit?: number } = {}) {
  let q = createAdminClient()
    .from("media_assets")
    .select("id, bucket, path, alt_text, source, author, license, usage_justification, is_ai_generated, validation_status, is_demo, width, height, created_at")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.bucket) q = q.eq("bucket", opts.bucket);
  if (opts.status) q = q.eq("validation_status", opts.status);
  const { data } = await q;
  return (data ?? []) as MediaRow[];
}

export function mediaLabel(m: Pick<MediaRow, "alt_text" | "path" | "source">) {
  return `${m.alt_text || m.path.split("/").pop()} — ${m.source.slice(0, 40)}`;
}
