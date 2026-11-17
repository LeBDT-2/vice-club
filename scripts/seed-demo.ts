/**
 * Jeu de données de DÉMONSTRATION, déterministe et clairement signalé (is_demo = true).
 *
 *   pnpm seed:demo            # base locale uniquement
 *   pnpm seed:demo --remove   # supprime toutes les données de démonstration
 *
 * - Refuse de s'exécuter si APP_ENV=production.
 * - Refuse une base distante sauf option explicite --allow-remote (préproduction).
 * - Les images sont de vraies photos sous licence libre (Wikimedia Commons), livrées
 *   avec le dépôt dans scripts/demo-media/ (crédits : credits.json) ; seule la carte
 *   « Où suis-je ? » est dessinée par ce script et tamponnée « DÉMO ». Aucune ressource Rockstar.
 * - Les véhicules portent leur vrai nom de modèle, mais les PRIX, propriétés et lieux sont
 *   FICTIFS : ils servent à tester les moteurs de jeu.
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

type Credit = { file: string; author: string; license: string; sourceUrl: string };
const MEDIA_DIR = path.join(import.meta.dirname, "demo-media");
const CREDITS = JSON.parse(readFileSync(path.join(MEDIA_DIR, "credits.json"), "utf8")) as Record<string, Credit>;

/** Photo de démonstration (WebP déjà redimensionné) et son crédit. */
function demoPhoto(slug: string) {
  const credit = CREDITS[slug];
  if (!credit) fail(`Crédit manquant pour scripts/demo-media/${slug}.webp`);
  return { buffer: readFileSync(path.join(MEDIA_DIR, `${slug}.webp`)), credit };
}

async function insertMedia(bucket: "public-media" | "game-media", path: string, buffer: Buffer, alt: string, credit?: Credit) {
  const meta = await sharp(buffer).metadata();
  const { rows } = await db.query(
    `insert into public.media_assets (bucket, path, mime_type, width, height, bytes, alt_text, source, author, license,
       usage_justification, is_ai_generated, validation_status, validated_at, is_demo)
     values ($1,$2,'image/webp',$3,$4,$5,$6,$7,$8,$9,$10,false,'approved',now(),true) returning id`,
    credit
      ? [bucket, path, meta.width, meta.height, buffer.byteLength, alt, `Wikimedia Commons : ${credit.sourceUrl}`, credit.author, credit.license, "Photo sous licence libre utilisée pour la démonstration locale."]
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
const VEHICLES: { slug: string; photo: string; name: string; maker: string; category: string; cost: number; price: number | null; priceType?: string }[] = [
  { slug: "countach", photo: "countach-rose", name: "Countach", maker: "Lamborghini", category: "super", cost: 4_100_000, price: 3_400_000, priceType: "standard" },
  { slug: "testarossa", photo: "testarossa-rouge", name: "Testarossa", maker: "Ferrari", category: "super", cost: 3_600_000, price: 2_950_000, priceType: "standard" },
  { slug: "f40", photo: "ferrari-f40", name: "F40", maker: "Ferrari", category: "super", cost: 4_600_000, price: 3_900_000, priceType: "standard" },
  { slug: "911", photo: "porsche-pluie", name: "911", maker: "Porsche", category: "sport", cost: 2_400_000, price: 1_850_000, priceType: "standard" },
  { slug: "f12", photo: "ferrari-noire-pluie", name: "F12berlinetta", maker: "Ferrari", category: "sport", cost: 3_000_000, price: 2_300_000, priceType: "promo" },
  { slug: "corvette-c3", photo: "corvette-c3", name: "Corvette C3", maker: "Chevrolet", category: "sport", cost: 1_500_000, price: 1_100_000, priceType: "standard" },
  { slug: "mustang-67", photo: "ford-mustang", name: "Mustang 1967", maker: "Ford", category: "muscle", cost: 1_300_000, price: 780_000, priceType: "standard" },
  { slug: "eldorado-59", photo: "cadillac-eldorado", name: "Eldorado 1959", maker: "Cadillac", category: "classique", cost: 1_700_000, price: 1_150_000, priceType: "standard" },
  { slug: "dmc-12", photo: "delorean", name: "DMC-12", maker: "DeLorean", category: "classique", cost: 1_900_000, price: 1_350_000, priceType: "standard" },
  { slug: "bronco", photo: "ford-bronco", name: "Bronco", maker: "Ford", category: "tout_terrain", cost: 1_100_000, price: 640_000, priceType: "standard" },
  { slug: "range-rover", photo: "range-rover", name: "Range Rover Classic", maker: "Land Rover", category: "suv", cost: 900_000, price: 600_000, priceType: "standard" },
  { slug: "ninja-h2", photo: "kawasaki-ninja", name: "Ninja H2", maker: "Kawasaki", category: "moto", cost: 450_000, price: 290_000, priceType: "standard" },
  { slug: "softail", photo: "harley-davidson", name: "Softail Springer", maker: "Harley-Davidson", category: "moto", cost: 380_000, price: 210_000, priceType: "promo" },
  { slug: "combi-t1", photo: "vw-combi", name: "Combi T1", maker: "Volkswagen", category: "utilitaire", cost: 250_000, price: null },
];

const PROPERTIES = [
  { slug: "loft-centre", photo: "miami-crepuscule", name: "Loft du Centre", kind: "appartement", location: "Centre", price: 1_200_000 },
  { slug: "villa-collines", photo: "palmiers-orange", name: "Villa des Collines", kind: "maison", location: "Collines", price: 3_100_000 },
  { slug: "garage-marina", photo: "miami-orange", name: "Garage de la Marina", kind: "garage", location: "Marina", price: 640_000 },
  { slug: "club-port", photo: "boulevard-hotel", name: "Club du Port", kind: "club", location: "Port Néon", price: 2_150_000 },
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
  {
    vehicle: "countach",
    photo: "countach-orange",
    hints: ["C'est une supercar italienne.", "Elle a été produite de 1974 à 1990.", "Ses portes s'ouvrent en élytre, vers le haut.", "Son moteur est un V12.", "Son constructeur a un taureau pour emblème."],
    focus: { x: 0.52, y: 0.5 },
  },
  {
    vehicle: "dmc-12",
    photo: "delorean",
    hints: ["Sa carrosserie est en acier inoxydable brossé.", "Ses portes s'ouvrent en ailes de mouette.", "Elle a été fabriquée en Irlande du Nord.", "Sa production s'est arrêtée en 1983.", "Le cinéma l'a rendue célèbre en machine à voyager dans le temps."],
    focus: { x: 0.5, y: 0.62 },
  },
  {
    vehicle: "mustang-67",
    photo: "ford-mustang",
    hints: ["C'est une voiture américaine.", "Elle a lancé la catégorie des « pony cars ».", "Le modèle est apparu en 1964.", "Son emblème est un cheval au galop.", "Son constructeur est Ford."],
    focus: { x: 0.45, y: 0.55 },
  },
];

/** « GTA ou réalité ? » : vraies photos, et photos retouchées façon rendu de jeu. */
const REALITY_REAL = ["ocean-drive-bleu", "ocean-drive-neons", "colony-hotel", "poste-secours", "promeneurs-ocean-drive", "miami-crepuscule"];
const REALITY_STYLIZED = ["ocean-drive-vert", "boulevard-hotel", "miami-orange", "palmiers-orange", "countach-bleue", "testarossa-rouge"];

/** Effet « rendu de jeu » : couleurs saturées et aplats (filtre médian), sans texture photo. */
async function stylize(buffer: Buffer) {
  return sharp(buffer).resize(1280, 720, { fit: "cover" }).median(9).modulate({ saturation: 1.7, brightness: 1.05 }).sharpen({ sigma: 2 }).webp({ quality: 80 }).toBuffer();
}

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
  for (const v of VEHICLES) {
    const { buffer: buf, credit } = demoPhoto(v.photo);
    const path = await upload("public-media", "vehicles", buf);
    const mediaId = await insertMedia("public-media", path, buf, `${v.maker} ${v.name}`, credit);
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
  for (const p of PROPERTIES) {
    const { buffer: buf, credit } = demoPhoto(p.photo);
    const path = await upload("public-media", "properties", buf);
    const mediaId = await insertMedia("public-media", path, buf, `${p.name}, propriété fictive de démonstration (photo d'illustration)`, credit);
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
  for (const m of MYSTERY) {
    const { buffer: photo, credit } = demoPhoto(m.photo);
    const src = await sharp(photo).resize(1200, 750, { fit: "cover" }).png().toBuffer();
    const srcWebp = await sharp(src).webp({ quality: 85 }).toBuffer();
    const srcPath = await upload("game-media", "mystery-src", srcWebp);
    const srcMedia = await insertMedia("game-media", srcPath, srcWebp, "Source de voiture mystère (démo)", credit);
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

  // GTA ou réalité ? — vraies photos (réponse « réalité ») et photos retouchées façon jeu (réponse « GTA »).
  const realityIds: string[] = [];
  const realityPlan = [
    ...REALITY_REAL.map((slug) => ({ slug, answer: "reality" as const })),
    ...REALITY_STYLIZED.map((slug) => ({ slug, answer: "gta" as const })),
  ];
  for (const { slug, answer } of realityPlan) {
    const { buffer: photo, credit } = demoPhoto(slug);
    const buf = answer === "gta" ? await stylize(photo) : await sharp(photo).resize(1280, 720, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    const path = await upload("game-media", "reality", buf);
    const media = await insertMedia("game-media", path, buf, "Image de démonstration", credit);
    const explanation =
      answer === "reality"
        ? `Vraie photo de ${credit.author} (${credit.license}, Wikimedia Commons).`
        : `Contenu de démonstration : photo de ${credit.author} (${credit.license}) retouchée par le script (couleurs saturées, aplats) pour imiter un rendu de jeu. Elle compte comme « capture de jeu » uniquement pour tester le moteur.`;
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
