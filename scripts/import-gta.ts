/**
 * Import du contenu GTA RÉEL dans une base Supabase (préversion ou production).
 *
 *   pnpm import:gta                # base désignée par .env.production.local (ou l'environnement)
 *   pnpm import:gta --dry-run      # affiche ce qui serait importé, sans rien écrire
 *
 * - Passe uniquement par l'API Supabase en HTTPS (clé secrète) : aucun accès direct au port 5432.
 * - Contenu importé (is_demo = false, médias validés) : jeu GTA V et ses plateformes, 26 véhicules
 *   de GTA V avec prix en jeu sourcés (GTA Wiki), 5 voitures mystère, 16 images « GTA ou réalité ? »
 *   et les défis du jour des 7 prochains jours (sauf dates déjà programmées). Pas de carte « Où suis-je ? ».
 * - Idempotent : un véhicule, une voiture mystère ou une image déjà importés (même slug ou même
 *   explication) sont ignorés. Aucun utilisateur, score ni statistique n'est créé.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { buildMysteryVariants } from "../src/lib/images/mystery";
import { MYSTERY, PRICE_DATE, REALITY_GTA6, REALITY_REAL, ROCKSTAR, VEHICLE_IMAGE, VEHICLES, demoPhoto, gta5Shot, gta6Shot, wikiUrl, type Credit } from "./gta-catalog";

for (const f of [".env.production.local", ".env.local"]) {
  if (existsSync(f)) {
    process.loadEnvFile(f);
    console.log(`• Variables lues dans ${f}`);
    break;
  }
}
const DRY = process.argv.includes("--dry-run");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
if (!URL_ || !SECRET) fail("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis (.env.production.local).");
console.log(`• Base cible : ${URL_}`);

const sb = createClient(URL_, SECRET, { auth: { persistSession: false } });
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) fail(`${what} : ${error.message}`);
  return data as T;
}

async function upload(bucket: "public-media" | "game-media", folder: string, buffer: Buffer) {
  const path = `gta/${folder}/${randomUUID()}.webp`;
  const { error } = await sb.storage.from(bucket).upload(path, buffer, { contentType: "image/webp", upsert: false });
  if (error) fail(`Envoi ${bucket}/${path} : ${error.message}`);
  return path;
}

async function media(bucket: "public-media" | "game-media", folder: string, buffer: Buffer, alt: string, credit: Credit, source = `${credit.origin} : ${credit.sourceUrl}`) {
  const path = await upload(bucket, folder, buffer);
  const meta = await sharp(buffer).metadata();
  const row = await q(
    sb
      .from("media_assets")
      .insert({
        bucket, path, mime_type: "image/webp", width: meta.width, height: meta.height, bytes: buffer.byteLength, alt_text: alt,
        source, author: credit.author, license: credit.license,
        usage_justification: credit.justification, is_ai_generated: false, validation_status: "approved", validated_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
    `média ${alt}`,
  );
  return (row as unknown as { id: string }).id;
}

async function ensure(table: "games" | "platforms", slug: string, row: Record<string, unknown>) {
  const found = await q(sb.from(table).select("id").eq("slug", slug).maybeSingle(), `${table} ${slug}`);
  if (found) return { id: (found as unknown as { id: string }).id, created: false };
  const created = await q(sb.from(table).insert({ slug, ...row }).select("id").single(), `${table} ${slug}`);
  return { id: (created as unknown as { id: string }).id, created: true };
}

async function main() {
  if (DRY) {
    console.log(`Importerait : ${VEHICLES.length} véhicules, ${MYSTERY.length} voitures mystère, ${REALITY_REAL.length + REALITY_GTA6.length} images « GTA ou réalité ? », défis du ${today} au ${addDays(today, 6)}.`);
    return;
  }

  const game = await ensure("games", "gta-v", { name: "Grand Theft Auto V", short_name: "GTA V", description: "Grand Theft Auto V et GTA Online, de Rockstar Games.", status: "published", sort_order: 10 });
  const gameId = game.id;
  for (const [slug, name, short_name, sort_order] of [
    ["ps5", "PlayStation 5", "PS5", 10],
    ["xbox-series", "Xbox Series X|S", "Xbox Series", 20],
    ["pc", "PC", "PC", 30],
  ] as const) {
    const p = await ensure("platforms", slug, { name, short_name, status: "published", sort_order });
    const link = await q(sb.from("game_platforms").select("id").eq("game_id", gameId).eq("platform_id", p.id).maybeSingle(), "combinaison");
    if (!link) await q(sb.from("game_platforms").insert({ game_id: gameId, platform_id: p.id, version_label: "", matchmaking_enabled: true, notes: "", status: "published" }).select("id").single(), "combinaison");
  }
  console.log(`✓ Jeu GTA V ${game.created ? "créé" : "déjà présent"}, plateformes PS5, Xbox Series, PC`);

  const vehicleIds = new Map<string, string>();
  let added = 0;
  for (const v of VEHICLES) {
    const found = await q(sb.from("vehicles").select("id").eq("game_id", gameId).eq("slug", v.slug).maybeSingle(), `véhicule ${v.slug}`);
    if (found) {
      vehicleIds.set(v.slug, (found as unknown as { id: string }).id);
      continue;
    }
    const { buffer, credit } = gta5Shot(VEHICLE_IMAGE[v.slug] ?? v.slug, v.wiki);
    const image_id = await media("public-media", "vehicles", buffer, `${v.maker} ${v.name} dans GTA V`, credit);
    const row = await q(
      sb
        .from("vehicles")
        .insert({
          game_id: gameId, slug: v.slug, name: v.name, manufacturer: v.maker, category: v.category, game_price: v.price, game_price_type: "standard",
          game_price_note: v.shop, price_source: `GTA Wiki : ${wikiUrl(v.wiki)}`, price_verified_at: PRICE_DATE, garage_cost: v.price, image_id, status: "published",
        })
        .select("id")
        .single(),
      `véhicule ${v.slug}`,
    );
    vehicleIds.set(v.slug, (row as unknown as { id: string }).id);
    added++;
  }
  console.log(`✓ Véhicules : ${added} ajoutés, ${VEHICLES.length - added} déjà présents`);

  const mysteryIds: string[] = [];
  added = 0;
  for (const m of MYSTERY) {
    const vehicle_id = vehicleIds.get(m.vehicle)!;
    const found = await q(sb.from("mystery_puzzles").select("id").eq("vehicle_id", vehicle_id).limit(1).maybeSingle(), "voiture mystère");
    if (found) {
      mysteryIds.push((found as unknown as { id: string }).id);
      continue;
    }
    const v = VEHICLES.find((x) => x.slug === m.vehicle)!;
    const { buffer, credit } = gta5Shot(`${m.vehicle}-rear`, v.wiki);
    const src = await sharp(buffer).resize(1200, 750, { fit: "cover" }).png().toBuffer();
    const srcWebp = await sharp(src).webp({ quality: 85 }).toBuffer();
    const source_media_id = await media("game-media", "mystery-src", srcWebp, "Source de voiture mystère", credit);
    const { stages, reveal } = await buildMysteryVariants(src, m.focus);
    const stage_paths: string[] = [];
    for (const s of stages) stage_paths.push(await upload("game-media", "mystery", s));
    const reveal_path = await upload("game-media", "mystery", reveal);
    const row = await q(sb.from("mystery_puzzles").insert({ vehicle_id, source_media_id, stage_paths, reveal_path, hints: m.hints, status: "published" }).select("id").single(), "voiture mystère");
    mysteryIds.push((row as unknown as { id: string }).id);
    added++;
  }
  console.log(`✓ Voitures mystère : ${added} ajoutées, ${MYSTERY.length - added} déjà présentes`);

  const realityIds: string[] = [];
  added = 0;
  const plan = [
    ...REALITY_REAL.map((slug) => ({ ...demoPhoto(slug), answer: "reality" as const, label: "" })),
    ...REALITY_GTA6.map(([file, label]) => ({ ...gta6Shot(file), answer: "gta" as const, label })),
  ];
  for (const { buffer, credit, answer, label } of plan) {
    const explanation =
      answer === "reality"
        ? `Vraie photo de Miami, par ${credit.author} (${credit.license}, Wikimedia Commons).`
        : `Capture officielle de GTA VI : ${label}. ${ROCKSTAR}, source : rockstargames.com/VI.`;
    // Déjà importée ? On reconnaît l'image à sa source (une page Commons ou un fichier GTA VI par image).
    const source = `${credit.origin} : ${credit.sourceUrl}${answer === "gta" ? ` (${label})` : ""}`;
    const prev = await q(sb.from("media_assets").select("id").eq("bucket", "game-media").eq("source", source).limit(1).maybeSingle(), "GTA ou réalité");
    const found = prev ? await q(sb.from("reality_items").select("id").eq("media_id", (prev as unknown as { id: string }).id).limit(1).maybeSingle(), "GTA ou réalité") : null;
    if (found) {
      realityIds.push((found as unknown as { id: string }).id);
      continue;
    }
    const buf = await sharp(buffer).resize(1280, 720, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    const media_id = await media("game-media", "reality", buf, answer === "gta" ? "Capture de GTA VI" : "Photo de Miami", credit, source);
    const row = await q(sb.from("reality_items").insert({ media_id, answer, explanation, game_id: gameId, status: "published" }).select("id").single(), "GTA ou réalité");
    realityIds.push((row as unknown as { id: string }).id);
    added++;
  }
  console.log(`✓ « GTA ou réalité ? » : ${added} ajoutées, ${plan.length - added} déjà présentes`);

  // Défis du jour : 7 jours, sans « Où suis-je ? » (pas encore de vraie carte).
  const shuffled = <T,>(arr: T[], seed: number) => [...arr].map((x, i) => ({ x, k: Math.sin(seed * 999 + i) })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const vehicles = [...vehicleIds.values()];
  const pairs = (seed: number) => {
    const s = shuffled(vehicles, seed);
    return Array.from({ length: 10 }, (_, i) => ({ ref_type: "vehicle", ref_id: s[(2 * i) % s.length], ref_b_type: "vehicle", ref_b_id: s[(2 * i + 1) % s.length] }));
  };
  const days = [
    { kind: "mystery", title: "La voiture mystère", items: [{ ref_type: "mystery_puzzle", ref_id: mysteryIds[0] }] },
    { kind: "higher_lower", title: "Plus cher ou moins cher ?", items: pairs(1) },
    { kind: "reality", title: "GTA ou réalité ?", items: shuffled(realityIds, 2).slice(0, 10).map((id) => ({ ref_type: "reality_item", ref_id: id })) },
    { kind: "mystery", title: "La voiture mystère", items: [{ ref_type: "mystery_puzzle", ref_id: mysteryIds[1] }] },
    { kind: "higher_lower", title: "Plus cher ou moins cher ?", items: pairs(3) },
    { kind: "mystery", title: "La voiture mystère", items: [{ ref_type: "mystery_puzzle", ref_id: mysteryIds[2] }] },
    { kind: "reality", title: "GTA ou réalité ?", items: shuffled(realityIds, 4).slice(0, 10).map((id) => ({ ref_type: "reality_item", ref_id: id })) },
  ];
  let scheduled = 0;
  for (const [d, c] of days.entries()) {
    const challenge_date = addDays(today, d);
    const exists = await q(sb.from("daily_challenges").select("id, status").eq("challenge_date", challenge_date).maybeSingle(), "défi");
    if (exists && (exists as unknown as { status: string }).status !== "draft") continue;
    // Un brouillon resté d'un import interrompu est remplacé.
    if (exists) await q(sb.from("daily_challenges").delete().eq("id", (exists as unknown as { id: string }).id).select("id"), "brouillon de défi");
    const ch = await q(sb.from("daily_challenges").insert({ challenge_date, game_kind: c.kind, title: c.title, round_count: c.items.length, status: "draft" }).select("id").single(), "défi");
    const cid = (ch as unknown as { id: string }).id;
    await q(sb.from("daily_challenge_items").insert(c.items.map((it, i) => ({ challenge_id: cid, position: i + 1, ref_b_type: null, ref_b_id: null, ...it }))).select("challenge_id"), "manches du défi");
    await q(sb.from("daily_challenges").update({ status: "published" }).eq("id", cid).select("id"), "publication du défi");
    scheduled++;
  }
  console.log(`✓ Défis du jour programmés : ${scheduled} (dates déjà prises ignorées)`);
  console.log("✓ Import terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
