/**
 * Jeu de données de DÉMONSTRATION, déterministe et clairement signalé (is_demo = true).
 *
 *   pnpm seed:demo            # base locale uniquement
 *   pnpm seed:demo --remove   # supprime toutes les données de démonstration
 *
 * - Refuse de s'exécuter si APP_ENV=production.
 * - Refuse une base distante sauf option explicite --allow-remote (préproduction).
 * - Véhicules de GTA V : vrais noms, marques, catégories et prix en jeu relevés sur GTA Wiki
 *   (gta.fandom.com, page de chaque véhicule citée en source). Images : captures du jeu
 *   (© Rockstar Games) hébergées par GTA Wiki, livrées dans scripts/gta-media/v/ (catalog.json).
 * - « GTA ou réalité ? » : vraies photos de Miami (Wikimedia Commons, scripts/demo-media/) contre
 *   captures officielles de GTA VI (© Rockstar Games, rockstargames.com/VI, scripts/gta-media/vi/).
 *   Visuels Rockstar utilisés avec l'accord du porteur du projet, qui accepte le risque de retrait.
 * - Seule la carte « Où suis-je ? » reste fictive, dessinée par ce script et tamponnée « DÉMO ».
 * - Aucun faux utilisateur, aucun faux score.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import sharp from "sharp";
import { buildMysteryVariants } from "../src/lib/images/mystery";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = new Set(process.argv.slice(2));
const APP_ENV = process.env.APP_ENV ?? "local";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";
const DB_URL = process.env.SEED_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (APP_ENV === "production") fail("APP_ENV=production : les données de démonstration sont interdites en production.");
const isLocal = (u: string) => /(^|@|\/\/)(127\.0\.0\.1|localhost)(:|\/|$)/.test(u);
if ((!isLocal(SUPABASE_URL) || !isLocal(DB_URL)) && !args.has("--allow-remote")) {
  fail("Base distante détectée. Relance avec --allow-remote uniquement pour un environnement de préproduction.");
}
if (!SUPABASE_URL || !SECRET) fail("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis (.env.local).");

const supabase = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });
const db = new pg.Client({ connectionString: DB_URL });

// ------------------------------------------------------------------ utilitaires
const DEMO_SOURCE = "Illustration générée par le script de démonstration VICE CLUB";
const DEMO_AUTHOR = "VICE CLUB (démonstration)";
const DEMO_LICENSE = "Usage interne de démonstration";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoStamp(w: number) {
  return `<g opacity="0.92"><rect x="${w - 150}" y="16" width="134" height="40" rx="8" fill="#ffd166"/><text x="${w - 83}" y="44" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="24" fill="#1a1230">DÉMO</text></g>`;
}

async function upload(bucket: "public-media" | "game-media", folder: string, buffer: Buffer) {
  const path = `demo/${folder}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: "image/webp", upsert: false });
  if (error) fail(`Envoi ${bucket}/${path} : ${error.message}`);
  return path;
}

type Credit = { author: string; license: string; sourceUrl: string; origin: string; justification: string };
const MEDIA_DIR = path.join(import.meta.dirname, "demo-media");
const GTA_DIR = path.join(import.meta.dirname, "gta-media");
const CREDITS = JSON.parse(readFileSync(path.join(MEDIA_DIR, "credits.json"), "utf8")) as Record<string, { author: string; license: string; sourceUrl: string }>;

/** Photo libre de Wikimedia Commons (WebP déjà redimensionné) et son crédit. */
function demoPhoto(slug: string): { buffer: Buffer; credit: Credit } {
  const c = CREDITS[slug];
  if (!c) fail(`Crédit manquant pour scripts/demo-media/${slug}.webp`);
  return {
    buffer: readFileSync(path.join(MEDIA_DIR, `${slug}.webp`)),
    credit: { ...c, origin: "Wikimedia Commons", justification: "Photo sous licence libre." },
  };
}

const ROCKSTAR = "© Rockstar Games / Take-Two Interactive";
const RISK = "Visuel Rockstar repris avec l'accord du porteur du projet, qui accepte le risque d'une demande de retrait.";

/** Capture de GTA V (via GTA Wiki) d'un véhicule du catalogue. */
function gta5Shot(file: string, wikiTitle: string): { buffer: Buffer; credit: Credit } {
  return {
    buffer: readFileSync(path.join(GTA_DIR, "v", `${file}.webp`)),
    credit: { author: "Rockstar Games (capture de jeu)", license: ROCKSTAR, sourceUrl: wikiUrl(wikiTitle), origin: "GTA Wiki", justification: RISK },
  };
}

/** Capture officielle de GTA VI (site de Rockstar Games). */
function gta6Shot(file: string): { buffer: Buffer; credit: Credit } {
  return {
    buffer: readFileSync(path.join(GTA_DIR, "vi", `${file}.webp`)),
    credit: { author: "Rockstar Games", license: ROCKSTAR, sourceUrl: "https://www.rockstargames.com/VI", origin: "Site officiel de GTA VI", justification: RISK },
  };
}

const wikiUrl = (title: string) => `https://gta.fandom.com/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;

async function insertMedia(bucket: "public-media" | "game-media", path: string, buffer: Buffer, alt: string, credit?: Credit) {
  const meta = await sharp(buffer).metadata();
  const { rows } = await db.query(
    `insert into public.media_assets (bucket, path, mime_type, width, height, bytes, alt_text, source, author, license,
       usage_justification, is_ai_generated, validation_status, validated_at, is_demo)
     values ($1,$2,'image/webp',$3,$4,$5,$6,$7,$8,$9,$10,false,'approved',now(),true) returning id`,
    credit
      ? [bucket, path, meta.width, meta.height, buffer.byteLength, alt, `${credit.origin} : ${credit.sourceUrl}`, credit.author, credit.license, credit.justification]
      : [bucket, path, meta.width, meta.height, buffer.byteLength, alt, DEMO_SOURCE, DEMO_AUTHOR, DEMO_LICENSE, "Contenu de démonstration généré localement."],
  );
  return rows[0].id as string;
}

// ------------------------------------------------------------------ dessins
const MAP_W = 2000;
const MAP_H = 1500;
function mapSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
  <rect width="${MAP_W}" height="${MAP_H}" fill="#0f2a3a"/>
  <path d="M260 420 C 420 180, 900 120, 1300 200 C 1650 270, 1840 520, 1780 860 C 1720 1180, 1380 1360, 980 1340 C 580 1320, 260 1160, 200 860 C 160 660, 180 540, 260 420 Z" fill="#2a5a4c"/>
  <path d="M520 520 C 700 380, 1050 360, 1250 470 C 1420 560, 1460 760, 1340 920 C 1210 1090, 900 1120, 700 1010 C 520 910, 430 680, 520 520 Z" fill="#3b7a5c"/>
  <path d="M1100 600 C 1180 560, 1260 600, 1280 680 C 1300 760, 1220 820, 1140 800 C 1060 780, 1030 650, 1100 600 Z" fill="#6b8a5a"/>
  <g stroke="#e9d9a8" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.9">
    <path d="M300 800 C 600 760, 900 820, 1200 760 C 1450 710, 1650 760, 1760 820"/>
    <path d="M900 220 C 880 500, 960 800, 940 1320"/>
    <path d="M500 480 C 700 600, 1100 1000, 1500 1180"/>
  </g>
  <g fill="#c7c2e6">
    <rect x="860" y="700" width="160" height="160"/><rect x="1040" y="720" width="90" height="120"/><rect x="760" y="740" width="80" height="90"/>
  </g>
  <rect x="1420" y="300" width="300" height="90" rx="10" fill="#9a96b8"/><rect x="1430" y="330" width="280" height="20" fill="#e9d9a8"/>
  <path d="M300 1100 C 380 1180, 520 1230, 660 1250 L 640 1300 C 480 1280, 330 1220, 260 1140 Z" fill="#e8cf8f"/>
  <circle cx="420" cy="430" r="60" fill="#d24d6a"/><circle cx="1580" cy="1060" r="70" fill="#4d7bd2"/>
  <g font-family="DejaVu Sans, Arial, sans-serif" font-size="40" font-weight="700" fill="#f5f0ff" opacity="0.9">
    <text x="880" y="680">Centre</text><text x="1430" y="280">Aérodrome</text><text x="320" y="1260">Plage Sunset</text>
    <text x="1090" y="580">Collines</text><text x="340" y="360">Port Néon</text><text x="1500" y="980">Marina</text>
  </g>
  <rect x="40" y="40" width="780" height="80" rx="12" fill="#ffd166"/>
  <text x="70" y="96" font-family="DejaVu Sans, Arial, sans-serif" font-size="44" font-weight="900" fill="#1a1230">CARTE DE DÉMONSTRATION FICTIVE</text>
</svg>`;
}

// ------------------------------------------------------------------ données
/** Prix relevés sur GTA Wiki le 17 novembre 2026 (boutique en jeu indiquée dans la note). */
const PRICE_DATE = "2026-11-17";
type GtaVehicle = { slug: string; wiki: string; name: string; maker: string; category: string; price: number; shop: string };
const LM = "Legendary Motorsport";
const SSASA = "Southern San Andreas Super Autos";
const VEHICLES: GtaVehicle[] = [
  { slug: "adder", wiki: "Adder", name: "Adder", maker: "Truffade", category: "super", price: 1_000_000, shop: `${LM}, GTA V` },
  { slug: "zentorno", wiki: "Zentorno", name: "Zentorno", maker: "Pegassi", category: "super", price: 725_000, shop: `${LM}, GTA V` },
  { slug: "t20", wiki: "T20", name: "T20", maker: "Progen", category: "super", price: 2_200_000, shop: `${LM}, GTA V` },
  { slug: "entity-xf", wiki: "Entity XF", name: "Entity XF", maker: "Överflöd", category: "super", price: 795_000, shop: `${LM}, GTA V` },
  { slug: "osiris", wiki: "Osiris", name: "Osiris", maker: "Pegassi", category: "super", price: 1_950_000, shop: `${LM}, GTA V` },
  { slug: "turismo-r", wiki: "Turismo R", name: "Turismo R", maker: "Grotti", category: "super", price: 500_000, shop: `${LM}, GTA V` },
  { slug: "vacca", wiki: "Vacca", name: "Vacca", maker: "Pegassi", category: "super", price: 240_000, shop: `${LM}, GTA V` },
  { slug: "carbonizzare", wiki: "Carbonizzare", name: "Carbonizzare", maker: "Grotti", category: "sport", price: 195_000, shop: `${LM}, GTA Online` },
  { slug: "massacro", wiki: "Massacro", name: "Massacro", maker: "Dewbauchee", category: "sport", price: 275_000, shop: `${LM}, GTA Online` },
  { slug: "elegy-rh8", wiki: "Elegy RH8", name: "Elegy RH8", maker: "Annis", category: "sport", price: 95_000, shop: "GTA Online" },
  { slug: "z-type", wiki: "Z-Type", name: "Z-Type", maker: "Truffade", category: "classique", price: 10_000_000, shop: `${LM}, GTA V` },
  { slug: "stinger", wiki: "Stinger", name: "Stinger", maker: "Grotti", category: "classique", price: 1_000_000, shop: `${LM}, GTA V` },
  { slug: "jb-700", wiki: "JB 700", name: "JB 700", maker: "Dewbauchee", category: "classique", price: 475_000, shop: `${LM}, GTA V` },
  { slug: "monroe", wiki: "Monroe", name: "Monroe", maker: "Pegassi", category: "classique", price: 490_000, shop: `${LM}, GTA V` },
  { slug: "stirling-gt", wiki: "Stirling GT", name: "Stirling GT", maker: "Benefactor", category: "classique", price: 975_000, shop: `${LM}, GTA V` },
  { slug: "coquette-classic", wiki: "Coquette Classic", name: "Coquette Classic", maker: "Invetero", category: "classique", price: 665_000, shop: `${LM}, GTA Online` },
  { slug: "dominator", wiki: "Dominator", name: "Dominator", maker: "Vapid", category: "muscle", price: 35_000, shop: `${SSASA}, GTA Online` },
  { slug: "gauntlet", wiki: "Gauntlet", name: "Gauntlet", maker: "Bravado", category: "muscle", price: 32_000, shop: `${SSASA}, GTA V` },
  { slug: "bifta", wiki: "Bifta", name: "Bifta", maker: "BF", category: "tout_terrain", price: 75_000, shop: `${SSASA}, GTA V` },
  { slug: "rebel", wiki: "Rebel", name: "Rebel", maker: "Karin", category: "tout_terrain", price: 22_000, shop: `${SSASA}, GTA Online` },
  { slug: "granger", wiki: "Granger", name: "Granger", maker: "Declasse", category: "suv", price: 35_000, shop: `${SSASA}, GTA Online` },
  { slug: "huntley-s", wiki: "Huntley S", name: "Huntley S", maker: "Enus", category: "suv", price: 195_000, shop: `${LM}, GTA Online` },
  { slug: "akuma", wiki: "Akuma", name: "Akuma", maker: "Dinka", category: "moto", price: 9_000, shop: `${SSASA}, GTA V` },
  { slug: "hakuchou", wiki: "Hakuchou", name: "Hakuchou", maker: "Shitzu", category: "moto", price: 82_000, shop: `${SSASA}, GTA Online` },
  { slug: "bati-801", wiki: "Bati 801", name: "Bati 801", maker: "Pegassi", category: "moto", price: 10_000, shop: `${SSASA}, GTA V` },
  { slug: "washington", wiki: "Washington", name: "Washington", maker: "Albany", category: "berline", price: 15_000, shop: `${SSASA}, GTA Online` },
];
const VEHICLE_IMAGE: Record<string, string> = { "bati-801": "bati-800" };

const LOCATIONS = [
  { name: "Carrefour du Centre", desc: "Le croisement principal, au pied des tours.", x: 930, y: 790 },
  { name: "Piste de l'aérodrome", desc: "La piste au nord-est de l'île.", x: 1570, y: 345 },
  { name: "Plage Sunset", desc: "La grande plage du sud-ouest.", x: 470, y: 1230 },
  { name: "Sommet des Collines", desc: "Le point culminant de l'île.", x: 1180, y: 690 },
  { name: "Port Néon", desc: "Le port rouge au nord-ouest.", x: 420, y: 430 },
  { name: "Marina", desc: "Le bassin bleu au sud-est.", x: 1580, y: 1060 },
  { name: "Route du littoral ouest", desc: "La route côtière à l'ouest du centre.", x: 420, y: 790 },
  { name: "Pont sud", desc: "La route qui descend vers le sud.", x: 950, y: 1250 },
];

/** Voiture mystère : vue arrière (différente de la photo du catalogue) et indices du plus vague au plus précis. */
const MYSTERY = [
  {
    vehicle: "zentorno",
    hints: ["C'est une hypercar de la catégorie Super.", "Elle est arrivée avec la mise à jour « High Life ».", "Elle coûte 725 000 $ sur Legendary Motorsport.", "Elle s'inspire de la Lamborghini Sesto Elemento.", "Son constructeur est Pegassi."],
    focus: { x: 0.5, y: 0.55 },
  },
  {
    vehicle: "jb-700",
    hints: ["C'est une sportive classique (Sports Classics).", "Son style est typiquement britannique.", "Elle coûte 475 000 $ sur Legendary Motorsport dans GTA V.", "Elle s'inspire de l'Aston Martin DB5, chère à un célèbre agent secret.", "Son constructeur est Dewbauchee."],
    focus: { x: 0.5, y: 0.55 },
  },
  {
    vehicle: "adder",
    hints: ["C'est une hypercar de la catégorie Super.", "Elle coûte pile 1 000 000 $ sur Legendary Motorsport.", "Son constructeur imite une marque de luxe française.", "Elle s'inspire de la Bugatti Veyron 16.4 Super Sport.", "Son constructeur est Truffade."],
    focus: { x: 0.5, y: 0.55 },
  },
  {
    vehicle: "stirling-gt",
    hints: ["C'est une sportive classique (Sports Classics).", "C'est un coupé grand tourisme des années 1950.", "Elle coûte 975 000 $ sur Legendary Motorsport.", "Elle s'inspire de la Mercedes-Benz 300 SL.", "Son constructeur est Benefactor."],
    focus: { x: 0.5, y: 0.55 },
  },
  {
    vehicle: "monroe",
    hints: ["C'est une sportive classique (Sports Classics).", "Son moteur est placé en position centrale arrière.", "Elle coûte 490 000 $ sur Legendary Motorsport.", "Elle s'inspire de la Lamborghini Miura.", "Son constructeur est Pegassi."],
    focus: { x: 0.5, y: 0.55 },
  },
];

/** « GTA ou réalité ? » : vraies photos de Miami contre captures officielles de GTA VI (Vice City). */
const REALITY_REAL = ["ocean-drive-bleu", "ocean-drive-neons", "colony-hotel", "poste-secours", "promeneurs-ocean-drive", "miami-crepuscule", "ocean-drive-vert", "boulevard-hotel"];
const REALITY_GTA6: [file: string, label: string][] = [
  ["vice-city-crepuscule", "Vice City au crépuscule"],
  ["vice-city-skyline", "les tours de Vice City"],
  ["plage-voiture-verte", "une plage de Vice City"],
  ["grotti-cheetah", "une Grotti Cheetah devant un immeuble Art déco"],
  ["squalo", "un bateau Squalo devant Vice City"],
  ["vapid-ganado", "un Vapid Ganado au bord de l'océan"],
  ["electric-fang", "le salon de tatouage Electric Fang"],
  ["vapid-stanier", "un taxi Vapid Stanier"],
];

// ------------------------------------------------------------------ nettoyage
async function removeDemo() {
  await db.query("begin");
  // Le verrou des défis publiés n'est levé que pour supprimer leurs manches de démonstration.
  await db.query("set local session_replication_role = replica");
  await db.query(`delete from public.daily_challenge_items where challenge_id in (select id from public.daily_challenges where is_demo)`);
  await db.query("set local session_replication_role = origin");
  // Parties jouées sur des défis ou contenus de démonstration (cascade : manches et résultats).
  await db.query(`delete from public.game_sessions where challenge_id in (select id from public.daily_challenges where is_demo)`);
  await db.query(`delete from public.daily_challenges where is_demo`);
  await db.query(`delete from public.game_sessions s where exists (select 1 from public.game_rounds r where r.session_id = s.id and (
      r.ref_id in (select id from public.geo_locations where is_demo union all select id from public.mystery_puzzles where is_demo
                   union all select id from public.reality_items where is_demo union all select id from public.vehicles where is_demo
                   union all select id from public.properties where is_demo)))`);
  await db.query(`delete from public.garage_vehicles where vehicle_id in (select id from public.vehicles where is_demo)`);
  for (const t of ["geo_locations", "mystery_puzzles", "reality_items", "game_maps", "properties", "vehicles", "game_platforms", "games", "platforms", "media_assets"]) {
    await db.query(`delete from public.${t} where is_demo`);
  }
  await db.query("commit");

  for (const bucket of ["public-media", "game-media"] as const) {
    const { data: folders } = await supabase.storage.from(bucket).list("demo", { limit: 100 });
    for (const f of folders ?? []) {
      for (;;) {
        const { data: files } = await supabase.storage.from(bucket).list(`demo/${f.name}`, { limit: 1000 });
        if (!files?.length) break;
        await supabase.storage.from(bucket).remove(files.map((x) => `demo/${f.name}/${x.name}`));
        if (files.length < 1000) break;
      }
    }
  }
}

// ------------------------------------------------------------------ insertion
async function seed() {
  const one = async (sql: string, params: unknown[]) => (await db.query(sql, params)).rows[0].id as string;
  /** Insère une ligne de référence si son slug est libre ; sinon réutilise la ligne existante. */
  const ref = async (table: "games" | "platforms", slug: string, insert: string, params: unknown[]) => {
    const created = await db.query(`${insert} on conflict (slug) do nothing returning id`, params);
    if (created.rowCount) return { id: created.rows[0].id as string, created: true };
    return { id: await one(`select id from public.${table} where slug = $1`, [slug]), created: false };
  };

  const gta = await ref(
    "games",
    "gta-v",
    `insert into public.games (slug, name, short_name, description, status, sort_order, is_demo)
     values ('gta-v', 'Grand Theft Auto V', 'GTA V', 'Grand Theft Auto V et GTA Online, de Rockstar Games.', 'published', 10, true)`,
    [],
  );
  const gameId = gta.id;
  if (gta.created) {
    for (const [slug, name, short, order] of [
      ["ps5", "PlayStation 5", "PS5", 10],
      ["xbox-series", "Xbox Series X|S", "Xbox Series", 20],
      ["pc", "PC", "PC", 30],
    ] as const) {
      const p = await ref(
        "platforms",
        slug,
        `insert into public.platforms (slug, name, short_name, status, sort_order, is_demo) values ($1, $2, $3, 'published', $4, true)`,
        [slug, name, short, order],
      );
      await db.query(
        `insert into public.game_platforms (game_id, platform_id, version_label, matchmaking_enabled, notes, status, is_demo)
         values ($1, $2, '', true, '', 'published', true) on conflict do nothing`,
        [gameId, p.id],
      );
    }
  }

  // Véhicules de GTA V : prix réels en jeu, source citée (page GTA Wiki du véhicule).
  const vehicleIds = new Map<string, string>();
  for (const v of VEHICLES) {
    const { buffer: buf, credit } = gta5Shot(VEHICLE_IMAGE[v.slug] ?? v.slug, v.wiki);
    const path = await upload("public-media", "vehicles", buf);
    const mediaId = await insertMedia("public-media", path, buf, `${v.maker} ${v.name} dans GTA V`, credit);
    const id = await one(
      `insert into public.vehicles (game_id, slug, name, manufacturer, category, game_price, game_price_type, game_price_note,
         price_source, price_verified_at, garage_cost, image_id, status, is_demo)
       values ($1,$2,$3,$4,$5,$6,'standard',$7,$8,$9,$10,$11,'published',true) returning id`,
      [gameId, v.slug, v.name, v.maker, v.category, v.price, v.shop, `GTA Wiki : ${wikiUrl(v.wiki)}`, PRICE_DATE, v.price, mediaId],
    );
    vehicleIds.set(v.slug, id);
  }

  // Carte + lieux (Où suis-je ?)
  const mapPng = await sharp(Buffer.from(mapSvg())).png().toBuffer();
  const mapWebp = await sharp(mapPng).resize(1600).webp({ quality: 80 }).toBuffer();
  const mapPath = await upload("public-media", "maps", mapWebp);
  const mapMedia = await insertMedia("public-media", mapPath, mapWebp, "Carte fictive de démonstration");
  const mapId = await one(
    `insert into public.game_maps (game_id, name, image_id, width, height, scale_verified, status, is_demo)
     values ($1, 'Île de démonstration', $2, $3, $4, false, 'published', true) returning id`,
    [gameId, mapMedia, MAP_W, MAP_H],
  );
  const locationIds: string[] = [];
  for (const loc of LOCATIONS) {
    const cw = 520;
    const ch = 292;
    const left = Math.round(Math.min(Math.max(loc.x - cw / 2, 0), MAP_W - cw));
    const top = Math.round(Math.min(Math.max(loc.y - ch / 2, 0), MAP_H - ch));
    const crop = await sharp(mapPng).extract({ left, top, width: cw, height: ch }).resize(1280, 720).png().toBuffer();
    const shot = await sharp(crop)
      .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${demoStamp(1280)}</svg>`) }])
      .webp({ quality: 80 })
      .toBuffer();
    const path = await upload("game-media", "geo", shot);
    const media = await insertMedia("game-media", path, shot, "Capture de démonstration");
    locationIds.push(
      await one(
        `insert into public.geo_locations (map_id, name, description, screenshot_id, x, y, status, is_demo)
         values ($1,$2,$3,$4,$5,$6,'published',true) returning id`,
        [mapId, loc.name, loc.desc, media, loc.x, loc.y],
      ),
    );
  }

  // Voiture mystère : image source SANS nom, variantes générées côté serveur.
  const mysteryIds: string[] = [];
  for (const m of MYSTERY) {
    const v = VEHICLES.find((x) => x.slug === m.vehicle)!;
    const { buffer: photo, credit } = gta5Shot(`${m.vehicle}-rear`, v.wiki);
    const src = await sharp(photo).resize(1200, 750, { fit: "cover" }).png().toBuffer();
    const srcWebp = await sharp(src).webp({ quality: 85 }).toBuffer();
    const srcPath = await upload("game-media", "mystery-src", srcWebp);
    const srcMedia = await insertMedia("game-media", srcPath, srcWebp, "Source de voiture mystère", credit);
    const { stages, reveal } = await buildMysteryVariants(src, m.focus);
    const stagePaths: string[] = [];
    for (const s of stages) stagePaths.push(await upload("game-media", "mystery", s));
    const revealPath = await upload("game-media", "mystery", reveal);
    mysteryIds.push(
      await one(
        `insert into public.mystery_puzzles (vehicle_id, source_media_id, stage_paths, reveal_path, hints, status, is_demo)
         values ($1,$2,$3,$4,$5,'published',true) returning id`,
        [vehicleIds.get(m.vehicle), srcMedia, stagePaths, revealPath, m.hints],
      ),
    );
  }

  // GTA ou réalité ? — vraies photos de Miami (réponse « réalité ») et captures officielles de GTA VI (réponse « GTA »).
  const realityIds: string[] = [];
  const realityPlan = [
    ...REALITY_REAL.map((slug) => ({ ...demoPhoto(slug), answer: "reality" as const, label: "" })),
    ...REALITY_GTA6.map(([file, label]) => ({ ...gta6Shot(file), answer: "gta" as const, label })),
  ];
  for (const { buffer: photo, credit, answer, label } of realityPlan) {
    const buf = await sharp(photo).resize(1280, 720, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    const path = await upload("game-media", "reality", buf);
    const media = await insertMedia("game-media", path, buf, answer === "gta" ? "Capture de GTA VI" : "Photo de Miami", credit);
    const explanation =
      answer === "reality"
        ? `Vraie photo de Miami, par ${credit.author} (${credit.license}, Wikimedia Commons).`
        : `Capture officielle de GTA VI : ${label}. ${ROCKSTAR}, source : rockstargames.com/VI.`;
    realityIds.push(
      await one(
        `insert into public.reality_items (media_id, answer, explanation, game_id, status, is_demo) values ($1,$2,$3,$4,'published',true) returning id`,
        [media, answer, explanation, gameId],
      ),
    );
  }

  // Défis du jour de démonstration : aujourd'hui et les 6 jours suivants.
  const r = rng(42);
  const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => r() - 0.5).slice(0, n);
  const priced = [
    ...VEHICLES.map((v) => ({ type: "vehicle", id: vehicleIds.get(v.slug)! })),
  ];
  const plan: { kind: string; title: string; items: { ref_type: string; ref_id: string; ref_b_type?: string; ref_b_id?: string }[] }[] = [
    { kind: "mystery", title: "La voiture mystère", items: [{ ref_type: "mystery_puzzle", ref_id: mysteryIds[0] }] },
    { kind: "where", title: "Où suis-je ?", items: pick(locationIds, 5).map((id) => ({ ref_type: "geo_location", ref_id: id })) },
    {
      kind: "higher_lower",
      title: "Plus cher ou moins cher ?",
      items: Array.from({ length: 10 }, () => {
        const [a, b] = pick(priced, 2);
        return { ref_type: a.type, ref_id: a.id, ref_b_type: b.type, ref_b_id: b.id };
      }),
    },
    { kind: "reality", title: "GTA ou réalité ?", items: pick(realityIds, 10).map((id) => ({ ref_type: "reality_item", ref_id: id })) },
    { kind: "mystery", title: "La voiture mystère", items: [{ ref_type: "mystery_puzzle", ref_id: mysteryIds[1] }] },
    { kind: "reality", title: "GTA ou réalité ?", items: pick(realityIds, 10).map((id) => ({ ref_type: "reality_item", ref_id: id })) },
    { kind: "mystery", title: "La voiture mystère", items: [{ ref_type: "mystery_puzzle", ref_id: mysteryIds[2] }] },
  ];
  for (const [d, c] of plan.entries()) {
    const date = addDays(today, d);
    const exists = await db.query(`select 1 from public.daily_challenges where challenge_date = $1`, [date]);
    if (exists.rowCount) {
      console.log(`  défi du ${date} déjà programmé (non démo) : ignoré`);
      continue;
    }
    const cid = await one(
      `insert into public.daily_challenges (challenge_date, game_kind, title, round_count, status, is_demo) values ($1,$2,$3,$4,'draft',true) returning id`,
      [date, c.kind, c.kind === "where" ? `${c.title} (démo)` : c.title, c.items.length],
    );
    for (const [i, it] of c.items.entries()) {
      await db.query(
        `insert into public.daily_challenge_items (challenge_id, position, ref_type, ref_id, ref_b_type, ref_b_id) values ($1,$2,$3,$4,$5,$6)`,
        [cid, i + 1, it.ref_type, it.ref_id, it.ref_b_type ?? null, it.ref_b_id ?? null],
      );
    }
    await db.query(`update public.daily_challenges set status = 'published' where id = $1`, [cid]);
  }
}

async function main() {
  await db.connect();
  try {
    console.log("• Suppression des données de démonstration existantes…");
    await removeDemo();
    if (args.has("--remove")) {
      console.log("✓ Données de démonstration supprimées.");
      return;
    }
    console.log("• Insertion du jeu de démonstration…");
    await seed();
    const { rows } = await db.query(`select * from public.demo_content_report()`);
    console.table(rows);
    console.log("✓ Données de démonstration prêtes (toutes marquées is_demo).");
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
