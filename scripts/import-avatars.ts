/**
 * Ajoute les portraits des avatars tout prêts au site.
 *
 * Usage : pnpm import:avatars <dossier>
 * Le dossier contient des images nommées d'après l'id de l'avatar (m01.png, f03.jpg, …,
 * voir src/config/avatars.ts). Chaque image est recadrée au carré, réduite à 256 px,
 * débarrassée de ses métadonnées et enregistrée en WebP dans public/avatars/presets.
 * La liste AVATAR_READY est ensuite mise à jour pour afficher ces avatars dans le sélecteur.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { AVATAR_PRESETS } from "../src/config/avatars";

const src = process.argv[2];
if (!src) {
  console.error("Indique le dossier des images : pnpm import:avatars C:\\chemin\\vers\\le\\dossier");
  process.exit(1);
}

const OUT = path.join(process.cwd(), "public", "avatars", "presets");
const CONFIG = path.join(process.cwd(), "src", "config", "avatars.ts");
mkdirSync(OUT, { recursive: true });

const ids = new Set(AVATAR_PRESETS.map((a) => a.id));
const done = new Set<string>(readdirSync(OUT).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")));

async function main() {
  for (const file of readdirSync(src)) {
    const ext = path.extname(file).toLowerCase();
    const id = path.basename(file, path.extname(file)).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;
    if (!ids.has(id)) {
      console.log(`• Ignoré : ${file} (nom attendu : m01 à m10 ou f01 à f10)`);
      continue;
    }
    await sharp(readFileSync(path.join(src, file)))
      .rotate()
      .resize(256, 256, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toFile(path.join(OUT, `${id}.webp`));
    done.add(id);
    console.log(`✓ ${id} ajouté`);
  }

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
