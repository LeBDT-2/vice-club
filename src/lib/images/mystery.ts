import sharp from "sharp";

/**
 * Génère les 6 variantes de « Voiture mystère » + l'image de révélation.
 *
 * Chaque variante est un NOUVEAU fichier dont les pixels cachés ont été détruits
 * (recadrage serré sur un détail puis pixellisation forte). Le navigateur ne reçoit
 * jamais l'image complète avant la fin de la manche : un flou CSS serait réversible.
 */
export const MYSTERY_STAGES = [
  { crop: 0.2, block: 22 },
  { crop: 0.3, block: 16 },
  { crop: 0.45, block: 11 },
  { crop: 0.6, block: 7 },
  { crop: 0.8, block: 4 },
  { crop: 1, block: 2 },
] as const;

const OUT_W = 960;
const OUT_H = 600;

export async function buildMysteryVariants(
  source: Buffer,
  focus: { x: number; y: number } = { x: 0.5, y: 0.55 },
): Promise<{ stages: Buffer[]; reveal: Buffer }> {
  const base = await sharp(source, { failOn: "error", limitInputPixels: 8000 * 8000 })
    .rotate()
    .resize(1200, 750, { fit: "cover" })
    .removeAlpha()
    .toBuffer();
  const W = 1200;
  const H = 750;
  const fx = Math.min(Math.max(focus.x, 0), 1);
  const fy = Math.min(Math.max(focus.y, 0), 1);

  const stages: Buffer[] = [];
  for (const { crop, block } of MYSTERY_STAGES) {
    const w = Math.round(W * crop);
    const h = Math.round(H * crop);
    const left = Math.round(Math.min(Math.max(fx * W - w / 2, 0), W - w));
    const top = Math.round(Math.min(Math.max(fy * H - h / 2, 0), H - h));
    const small = await sharp(base)
      .extract({ left, top, width: w, height: h })
      .resize(Math.max(8, Math.round(OUT_W / block)), Math.max(5, Math.round(OUT_H / block)), { fit: "fill" })
      .toBuffer();
    stages.push(await sharp(small).resize(OUT_W, OUT_H, { fit: "fill", kernel: "nearest" }).webp({ quality: 80 }).toBuffer());
  }
  const reveal = await sharp(base).resize(OUT_W, OUT_H).webp({ quality: 84 }).toBuffer();
  return { stages, reveal };
}
