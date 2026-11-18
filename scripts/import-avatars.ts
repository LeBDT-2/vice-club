/**
 * Ajoute les portraits des avatars tout prêts au site.
 *
 * Usage : pnpm import:avatars <dossier>
 *    ou : pnpm import:avatars --grille <image>   (une seule image de 5 colonnes × 4 lignes :
 *         lignes 1 et 2 = hommes m01 à m10, lignes 3 et 4 = femmes f01 à f10, de gauche à droite)
 * Le dossier contient des images nommées avatar-01.png à avatar-20.png (1 à 10 = hommes m01-m10,
 * 11 à 20 = femmes f01-f10), ou directement d'après l'id (m01.png, f03.jpg…, voir src/config/avatars.ts). Chaque image est recadrée au carré, réduite à 256 px,
 * débarrassée de ses métadonnées et enregistrée en WebP dans public/avatars/presets.
 * La liste AVATAR_READY est ensuite mise à jour pour afficher ces avatars dans le sélecteur.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { AVATAR_PRESETS } from "../src/config/avatars";

const gridMode = process.argv[2] === "--grille";
const src = gridMode ? process.argv[3] : process.argv[2];
if (!src) {
  console.error("Indique le dossier des images (pnpm import:avatars C:\\dossier) ou l'image en grille (pnpm import:avatars --grille C:\\grille.png).");
  process.exit(1);
}
const GRID_COLS = 5;
const GRID_ROWS = 4;

const OUT = path.join(process.cwd(), "public", "avatars", "presets");
const CONFIG = path.join(process.cwd(), "src", "config", "avatars.ts");
mkdirSync(OUT, { recursive: true });

const ids = new Set(AVATAR_PRESETS.map((a) => a.id));
const done = new Set<string>(readdirSync(OUT).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")));

async function save(input: Buffer, id: string) {
  await sharp(input)
    .rotate()
    .resize(256, 256, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, `${id}.webp`));
  done.add(id);
  console.log(`✓ ${id} ajouté`);
}

/** Découpe une image en grille 5 × 4, dans l'ordre m01…m10 puis f01…f10. */
async function importGrid(file: string) {
  const image = sharp(readFileSync(file)).rotate();
  const { width = 0, height = 0 } = await image.metadata();
  const cw = Math.floor(width / GRID_COLS);
  const ch = Math.floor(height / GRID_ROWS);
  const order = [...AVATAR_PRESETS.filter((a) => a.group === "homme"), ...AVATAR_PRESETS.filter((a) => a.group === "femme")];
  for (let i = 0; i < order.length; i++) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    // Petite marge intérieure pour ne pas garder les bordures entre les cases.
    const m = Math.round(Math.min(cw, ch) * 0.03);
    const cell = await sharp(readFileSync(file))
      .rotate()
      .extract({ left: col * cw + m, top: row * ch + m, width: cw - 2 * m, height: ch - 2 * m })
      .toBuffer();
    await save(cell, order[i].id);
  }
}

async function main() {
  if (gridMode) {
    await importGrid(src);
    return finish();
  }
  for (const file of readdirSync(src)) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, path.extname(file)).toLowerCase();
    // Accepte aussi avatar-01 … avatar-20 (01-10 = hommes, 11-20 = femmes).
    const n = /^avatar[-_ ]?(\d{1,2})$/.exec(base)?.[1];
    const id = n ? (Number(n) <= 10 ? `m${String(Number(n)).padStart(2, "0")}` : `f${String(Number(n) - 10).padStart(2, "0")}`) : base;
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;
    if (!ids.has(id)) {
      console.log(`• Ignoré : ${file} (nom attendu : avatar-01 à avatar-20)`);
      continue;
    }
    await save(readFileSync(path.join(src, file)), id);
  }
  finish();
}

function finish() {
  const ready = AVATAR_PRESETS.map((a) => a.id).filter((id) => done.has(id));
  const cfg = readFileSync(CONFIG, "utf8").replace(
    /export const AVATAR_READY: readonly string\[\] = \[[^\]]*\];/,
    `export const AVATAR_READY: readonly string[] = [${ready.map((id) => JSON.stringify(id)).join(", ")}];`,
  );
  writeFileSync(CONFIG, cfg);
  const missing = AVATAR_PRESETS.filter((a) => !done.has(a.id)).map((a) => a.id);
  console.log(`\n✓ ${ready.length} avatar(s) prêts.${missing.length ? ` Manquants : ${missing.join(", ")}.` : ""}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
