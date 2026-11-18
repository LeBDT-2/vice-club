/**
 * Catalogue GTA partagé par le jeu de démonstration (seed-demo) et l'import en ligne (import-gta).
 * Véhicules de GTA V (GTA Wiki), voitures mystère, « GTA ou réalité ? » (Miami contre GTA VI).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

export type Credit = { author: string; license: string; sourceUrl: string; origin: string; justification: string };
export const MEDIA_DIR = path.join(import.meta.dirname, "demo-media");
export const GTA_DIR = path.join(import.meta.dirname, "gta-media");
export const CREDITS = JSON.parse(readFileSync(path.join(MEDIA_DIR, "credits.json"), "utf8")) as Record<string, { author: string; license: string; sourceUrl: string }>;

/** Photo libre de Wikimedia Commons (WebP déjà redimensionné) et son crédit. */
export function demoPhoto(slug: string): { buffer: Buffer; credit: Credit } {
  const c = CREDITS[slug];
  if (!c) fail(`Crédit manquant pour scripts/demo-media/${slug}.webp`);
  return {
    buffer: readFileSync(path.join(MEDIA_DIR, `${slug}.webp`)),
    credit: { ...c, origin: "Wikimedia Commons", justification: "Photo sous licence libre." },
  };
}

export const ROCKSTAR = "© Rockstar Games / Take-Two Interactive";
export const RISK = "Visuel Rockstar repris avec l'accord du porteur du projet, qui accepte le risque d'une demande de retrait.";

/** Capture de GTA V (via GTA Wiki) d'un véhicule du catalogue. */
export function gta5Shot(file: string, wikiTitle: string): { buffer: Buffer; credit: Credit } {
  return {
    buffer: readFileSync(path.join(GTA_DIR, "v", `${file}.webp`)),
    credit: { author: "Rockstar Games (capture de jeu)", license: ROCKSTAR, sourceUrl: wikiUrl(wikiTitle), origin: "GTA Wiki", justification: RISK },
  };
}

/** Capture officielle de GTA VI (site de Rockstar Games). */
export function gta6Shot(file: string): { buffer: Buffer; credit: Credit } {
  return {
    buffer: readFileSync(path.join(GTA_DIR, "vi", `${file}.webp`)),
    credit: { author: "Rockstar Games", license: ROCKSTAR, sourceUrl: "https://www.rockstargames.com/VI", origin: "Site officiel de GTA VI", justification: RISK },
  };
}

export const wikiUrl = (title: string) => `https://gta.fandom.com/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;

/** Prix relevés sur GTA Wiki le 17 novembre 2026 (boutique en jeu indiquée dans la note). */
export const PRICE_DATE = "2026-11-17";
export type GtaVehicle = { slug: string; wiki: string; name: string; maker: string; category: string; price: number; shop: string };
export const LM = "Legendary Motorsport";
export const SSASA = "Southern San Andreas Super Autos";
export const VEHICLES: GtaVehicle[] = [
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
export const VEHICLE_IMAGE: Record<string, string> = { "bati-801": "bati-800" };

/** Voiture mystère : vue arrière (différente de la photo du catalogue) et indices du plus vague au plus précis. */
export const MYSTERY = [
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
export const REALITY_REAL = ["ocean-drive-bleu", "ocean-drive-neons", "colony-hotel", "poste-secours", "promeneurs-ocean-drive", "miami-crepuscule", "ocean-drive-vert", "boulevard-hotel"];
export const REALITY_GTA6: [file: string, label: string][] = [
  ["vice-city-crepuscule", "Vice City au crépuscule"],
  ["vice-city-skyline", "les tours de Vice City"],
  ["plage-voiture-verte", "une plage de Vice City"],
  ["grotti-cheetah", "une Grotti Cheetah devant un immeuble Art déco"],
  ["squalo", "un bateau Squalo devant Vice City"],
  ["vapid-ganado", "un Vapid Ganado au bord de l'océan"],
  ["electric-fang", "le salon de tatouage Electric Fang"],
  ["vapid-stanier", "un taxi Vapid Stanier"],
];
