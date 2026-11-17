/**
 * Jeu de données de DÉMONSTRATION, déterministe et clairement signalé (is_demo = true).
 *
 *   pnpm seed:demo            # base locale uniquement
 *   pnpm seed:demo --remove   # supprime toutes les données de démonstration
 *
 * - Refuse de s'exécuter si APP_ENV=production.
 * - Refuse une base distante sauf option explicite --allow-remote (préproduction).
 * - Toutes les images sont dessinées par ce script (aucune ressource téléchargée,
 *   aucune ressource Rockstar) et portent la mention « DÉMO ».
 * - Les noms, prix et lieux sont FICTIFS : ils servent à tester les moteurs de jeu.
 * - Aucun faux utilisateur, aucun faux score.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
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

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function demoStamp(w: number) {
  return `<g opacity="0.92"><rect x="${w - 150}" y="16" width="134" height="40" rx="8" fill="#ffd166"/><text x="${w - 83}" y="44" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="24" fill="#1a1230">DÉMO</text></g>`;
}

async function svgToWebp(svg: string, quality = 82) {
  return sharp(Buffer.from(svg)).webp({ quality }).toBuffer();
}

async function upload(bucket: "public-media" | "game-media", folder: string, buffer: Buffer) {
  const path = `demo/${folder}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: "image/webp", upsert: false });
  if (error) fail(`Envoi ${bucket}/${path} : ${error.message}`);
  return path;
}

async function insertMedia(bucket: "public-media" | "game-media", path: string, buffer: Buffer, alt: string) {
  const meta = await sharp(buffer).metadata();
  const { rows } = await db.query(
    `insert into public.media_assets (bucket, path, mime_type, width, height, bytes, alt_text, source, author, license,
       usage_justification, is_ai_generated, validation_status, validated_at, is_demo)
     values ($1,$2,'image/webp',$3,$4,$5,$6,$7,$8,$9,$10,false,'approved',now(),true) returning id`,
    [bucket, path, meta.width, meta.height, buffer.byteLength, alt, DEMO_SOURCE, DEMO_AUTHOR, DEMO_LICENSE, "Contenu de démonstration généré localement."],
  );
  return rows[0].id as string;
}

// ------------------------------------------------------------------ dessins
type Shape = "coupe" | "muscle" | "suv" | "moto";

function vehicleSvg(o: { shape: Shape; body: string; sky: [string, string]; label?: string; w?: number; h?: number }) {
  const w = o.w ?? 960;
  const h = o.h ?? 600;
  const bodies: Record<Shape, string> = {
    coupe: `<path d="M120 400 C 150 330, 260 300, 380 290 C 450 230, 560 220, 650 260 C 730 270, 820 300, 850 360 L 860 410 L 120 410 Z" fill="${o.body}"/><path d="M400 292 C 460 240, 560 236, 640 268 L 600 300 L 420 300 Z" fill="#14112a" opacity="0.85"/>`,
    muscle: `<path d="M100 410 L 110 340 C 200 320, 300 310, 360 300 L 420 240 L 640 240 L 700 300 C 780 305, 850 320, 870 350 L 870 410 Z" fill="${o.body}"/><path d="M430 250 L 630 250 L 680 300 L 400 300 Z" fill="#14112a" opacity="0.85"/><rect x="100" y="360" width="770" height="10" fill="#000" opacity="0.25"/>`,
    suv: `<path d="M110 420 L 110 320 C 140 300, 220 290, 280 285 L 340 200 L 700 200 C 760 210, 800 260, 830 300 C 860 310, 880 340, 880 380 L 880 420 Z" fill="${o.body}"/><path d="M350 212 L 690 212 L 740 290 L 300 290 Z" fill="#14112a" opacity="0.85"/><line x1="520" y1="212" x2="520" y2="290" stroke="${o.body}" stroke-width="10"/>`,
    moto: `<path d="M330 380 L 420 300 L 560 300 L 640 360 L 600 380 Z" fill="${o.body}"/><path d="M420 300 L 470 250 L 540 250 L 560 300 Z" fill="#14112a"/><line x1="610" y1="300" x2="660" y2="240" stroke="#ddd" stroke-width="10"/>`,
  };
  const wheels =
    o.shape === "moto"
      ? `<circle cx="330" cy="420" r="70" fill="#07050d"/><circle cx="330" cy="420" r="30" fill="#9a9ab8"/><circle cx="660" cy="420" r="70" fill="#07050d"/><circle cx="660" cy="420" r="30" fill="#9a9ab8"/>`
      : `<circle cx="270" cy="420" r="62" fill="#07050d"/><circle cx="270" cy="420" r="28" fill="#9a9ab8"/><circle cx="720" cy="420" r="62" fill="#07050d"/><circle cx="720" cy="420" r="28" fill="#9a9ab8"/>`;
  const label = o.label
    ? `<rect x="0" y="${h - 90}" width="${w}" height="90" fill="#0a0f1f" opacity="0.75"/><text x="40" y="${h - 35}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-style="italic" font-size="44" fill="#f5f0ff">${esc(o.label)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 960 600">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient></defs>
  <rect width="960" height="600" fill="url(#s)"/>
  <circle cx="760" cy="200" r="110" fill="#ff9a4d" opacity="0.55"/>
  <rect y="430" width="960" height="170" fill="#120d24"/>
  <line x1="0" y1="430" x2="960" y2="430" stroke="#2de2d0" stroke-width="3" opacity="0.5"/>
  ${bodies[o.shape]}${wheels}
  <ellipse cx="840" cy="350" rx="18" ry="10" fill="#fff6d6"/><rect x="110" y="350" width="26" height="12" fill="#ff3e8a"/>
  ${label}${demoStamp(960)}
</svg>`;
}

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

function realitySvg(i: number, style: "photo" | "jeu") {
  const r = rng(1000 + i);
  const hue = Math.floor(r() * 360);
  const sky = `hsl(${hue} 60% 55%)`;
  const ground = `hsl(${(hue + 40) % 360} 35% 30%)`;
  const shapes = Array.from({ length: 7 }, () => {
    const x = Math.floor(r() * 900);
    const bw = 60 + Math.floor(r() * 120);
    const bh = 120 + Math.floor(r() * 260);
    return style === "jeu"
      ? `<rect x="${x}" y="${430 - bh}" width="${bw}" height="${bh}" fill="hsl(${hue} 20% ${20 + Math.floor(r() * 30)}%)" stroke="#000" stroke-width="4"/>`
      : `<rect x="${x}" y="${430 - bh}" width="${bw}" height="${bh}" rx="6" fill="hsl(${hue} 15% ${25 + Math.floor(r() * 25)}%)" opacity="0.85"/>`;
  }).join("");
  const filter = style === "photo" ? `<filter id="b"><feGaussianBlur stdDeviation="1.4"/></filter>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 960 540">
  <defs>${filter}<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="#20142e"/></linearGradient></defs>
  <g ${style === "photo" ? 'filter="url(#b)"' : ""}><rect width="960" height="540" fill="url(#g)"/>${shapes}<rect y="430" width="960" height="110" fill="${ground}"/></g>
  <text x="30" y="510" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="#fff" opacity="0.8">Image de démonstration n° ${i + 1}</text>
  ${demoStamp(960)}
</svg>`;
}

// ------------------------------------------------------------------ données
const VEHICLES: { slug: string; name: string; maker: string; category: string; shape: Shape; body: string; cost: number; price: number | null; priceType?: string }[] = [
  { slug: "vespera-gt", name: "Vespera GT", maker: "Solano", category: "sport", shape: "coupe", body: "#c21d4f", cost: 2_400_000, price: 1_850_000, priceType: "standard" },
  { slug: "tidal-rs", name: "Tidal RS", maker: "Marea", category: "super", shape: "coupe", body: "#2de2d0", cost: 3_600_000, price: 2_950_000, priceType: "standard" },
  { slug: "neon-runner", name: "Neon Runner", maker: "Solano", category: "super", shape: "coupe", body: "#ff7fb3", cost: 4_100_000, price: 3_400_000, priceType: "standard" },
  { slug: "bayside-v8", name: "Bayside V8", maker: "Corsaro", category: "muscle", shape: "muscle", body: "#ff9a4d", cost: 1_300_000, price: 780_000, priceType: "standard" },
  { slug: "hurricane-70", name: "Hurricane 70", maker: "Corsaro", category: "classique", shape: "muscle", body: "#ffd166", cost: 1_700_000, price: 1_150_000, priceType: "standard" },
  { slug: "dune-ranger", name: "Dune Ranger", maker: "Atoll", category: "tout_terrain", shape: "suv", body: "#a8743a", cost: 1_100_000, price: 640_000, priceType: "standard" },
  { slug: "palmetto-xl", name: "Palmetto XL", maker: "Atoll", category: "suv", shape: "suv", body: "#4d7bd2", cost: 900_000, price: 640_000, priceType: "standard" },
  { slug: "lagoon-s", name: "Lagoon S", maker: "Marea", category: "berline", shape: "coupe", body: "#7a6cff", cost: 700_000, price: 420_000, priceType: "standard" },
  { slug: "flash-600", name: "Flash 600", maker: "Rivo", category: "moto", shape: "moto", body: "#ff3e8a", cost: 450_000, price: 290_000, priceType: "standard" },
  { slug: "coral-cruiser", name: "Coral Cruiser", maker: "Rivo", category: "moto", shape: "moto", body: "#12b3a4", cost: 380_000, price: 210_000, priceType: "promo" },
  { slug: "midnight-pulse", name: "Midnight Pulse", maker: "Solano", category: "sport", shape: "coupe", body: "#3a2a8a", cost: 2_000_000, price: 1_500_000, priceType: "promo" },
  { slug: "harbor-van", name: "Harbor Van", maker: "Atoll", category: "utilitaire", shape: "suv", body: "#9a96b8", cost: 250_000, price: null },
];

const PROPERTIES = [
  { slug: "loft-centre", name: "Loft du Centre", kind: "appartement", location: "Centre", price: 1_200_000 },
  { slug: "villa-collines", name: "Villa des Collines", kind: "maison", location: "Collines", price: 3_100_000 },
  { slug: "garage-marina", name: "Garage de la Marina", kind: "garage", location: "Marina", price: 640_000 },
  { slug: "club-port", name: "Club du Port", kind: "club", location: "Port Néon", price: 2_150_000 },
];

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

const MYSTERY = [
  { vehicle: "vespera-gt", hints: ["C'est une sportive.", "Son constructeur fictif : Solano.", "Son nom évoque le soir en italien.", "Carrosserie rouge.", "Elle coûte 1,85 M$ dans le jeu de démonstration."], focus: { x: 0.3, y: 0.62 } },
  { vehicle: "dune-ranger", hints: ["Elle aime sortir des routes.", "Son constructeur fictif : Atoll.", "Le désert est son terrain de jeu.", "Carrosserie couleur sable.", "Son nom contient « Ranger »."], focus: { x: 0.7, y: 0.5 } },
  { vehicle: "bayside-v8", hints: ["C'est une muscle car.", "Son constructeur fictif : Corsaro.", "Elle porte un V8 dans son nom.", "Carrosserie orange.", "Son nom évoque la baie."], focus: { x: 0.25, y: 0.55 } },
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

  const gameId = await one(
    `insert into public.games (slug, name, short_name, description, status, sort_order, is_demo)
     values ('demo-vice', 'Jeu de démonstration', 'Démo', 'Jeu fictif servant uniquement à tester VICE CLUB en local.', 'published', 999, true) returning id`,
    [],
  );
  const consoleId = await one(`insert into public.platforms (slug, name, short_name, status, sort_order, is_demo) values ('demo-console', 'Console (démo)', 'Console démo', 'published', 998, true) returning id`, []);
  const pcId = await one(`insert into public.platforms (slug, name, short_name, status, sort_order, is_demo) values ('demo-pc', 'PC (démo)', 'PC démo', 'published', 999, true) returning id`, []);
  for (const p of [consoleId, pcId]) {
    await db.query(
      `insert into public.game_platforms (game_id, platform_id, version_label, matchmaking_enabled, notes, status, is_demo)
       values ($1, $2, '', true, 'Combinaison fictive de démonstration.', 'published', true)`,
      [gameId, p],
    );
  }

  // Véhicules
  const vehicleIds = new Map<string, string>();
  const skies: [string, string][] = [["#3a1250", "#ff8a5c"], ["#0d1d3a", "#ff3e8a"], ["#140b33", "#ff7a6a"], ["#1c0f3a", "#2de2d0"]];
  for (const [i, v] of VEHICLES.entries()) {
    const buf = await svgToWebp(vehicleSvg({ shape: v.shape, body: v.body, sky: skies[i % skies.length], label: v.name }));
    const path = await upload("public-media", "vehicles", buf);
    const mediaId = await insertMedia("public-media", path, buf, `${v.name}, véhicule fictif de démonstration`);
    const id = await one(
      `insert into public.vehicles (game_id, slug, name, manufacturer, category, game_price, game_price_type, game_price_note,
         price_source, price_verified_at, garage_cost, image_id, status, is_demo)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',true) returning id`,
      [
        gameId, v.slug, v.name, v.maker, v.category, v.price, v.price === null ? null : v.priceType,
        v.priceType === "promo" ? "Prix promotionnel fictif" : "",
        v.price === null ? null : "Prix fictifs du jeu de démonstration", v.price === null ? null : today, v.cost, mediaId,
      ],
    );
    vehicleIds.set(v.slug, id);
  }

  // Propriétés
  const propertyIds: string[] = [];
  for (const [i, p] of PROPERTIES.entries()) {
    const buf = await svgToWebp(realitySvg(50 + i, "jeu").replace(/Image de démonstration n° \d+/, esc(p.name)));
    const path = await upload("public-media", "properties", buf);
    const mediaId = await insertMedia("public-media", path, buf, `${p.name}, propriété fictive de démonstration`);
    propertyIds.push(
      await one(
        `insert into public.properties (game_id, slug, name, kind, location_label, game_price, game_price_type, price_source, price_verified_at, image_id, status, is_demo)
         values ($1,$2,$3,$4,$5,$6,'standard','Prix fictifs du jeu de démonstration',$7,$8,'published',true) returning id`,
        [gameId, p.slug, p.name, p.kind, p.location, p.price, today, mediaId],
      ),
    );
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
  for (const [i, m] of MYSTERY.entries()) {
    const v = VEHICLES.find((x) => x.slug === m.vehicle)!;
    const src = await sharp(Buffer.from(vehicleSvg({ shape: v.shape, body: v.body, sky: skies[(i + 1) % skies.length], w: 1200, h: 750 })))
      .png()
      .toBuffer();
    const srcWebp = await sharp(src).webp({ quality: 85 }).toBuffer();
    const srcPath = await upload("game-media", "mystery-src", srcWebp);
    const srcMedia = await insertMedia("game-media", srcPath, srcWebp, "Source de voiture mystère (démo)");
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

  // GTA ou réalité ? — images fictives, réponse arbitraire assumée et expliquée.
  const realityIds: string[] = [];
  for (let i = 0; i < 12; i++) {
    const style = i % 3 === 0 ? "photo" : "jeu";
    const answer = i % 2 === 0 ? "gta" : "reality";
    const buf = await sharp(Buffer.from(realitySvg(i, style))).webp({ quality: 80 }).toBuffer();
    const path = await upload("game-media", "reality", buf);
    const media = await insertMedia("game-media", path, buf, "Image de démonstration");
    realityIds.push(
      await one(
        `insert into public.reality_items (media_id, answer, explanation, game_id, status, is_demo) values ($1,$2,$3,$4,'published',true) returning id`,
        [
          media,
          answer,
          `Contenu de démonstration : cette image a été dessinée par le script de démonstration. La réponse « ${answer === "gta" ? "capture de jeu" : "photo réelle"} » est attribuée arbitrairement pour tester le moteur.`,
          gameId,
        ],
      ),
    );
  }

  // Défis du jour de démonstration : aujourd'hui et les 6 jours suivants.
  const r = rng(42);
  const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => r() - 0.5).slice(0, n);
  const priced = [
    ...VEHICLES.filter((v) => v.price !== null && v.priceType === "standard").map((v) => ({ type: "vehicle", id: vehicleIds.get(v.slug)! })),
    ...propertyIds.map((id) => ({ type: "property", id })),
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
    { kind: "where", title: "Où suis-je ?", items: pick(locationIds, 5).map((id) => ({ ref_type: "geo_location", ref_id: id })) },
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
      [date, c.kind, `${c.title} (démo)`, c.items.length],
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
