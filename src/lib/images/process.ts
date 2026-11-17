import "server-only";
import sharp, { type Metadata } from "sharp";

export class ImageRejectedError extends Error {}

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * Valide le TYPE RÉEL d'une image (lecture des octets, pas de confiance dans le
 * type MIME envoyé), refuse SVG/GIF/formats actifs, limite les dimensions, puis
 * ré-encode en WebP (ce qui supprime toutes les métadonnées EXIF/XMP/GPS).
 */
export async function reencodeImage(
  input: Buffer,
  opts: {
    maxBytes: number;
    maxSide: number;
    minSide?: number;
    output: { width: number; height?: number; fit: "cover" | "inside" };
    quality?: number;
  },
): Promise<{ buffer: Buffer; width: number; height: number }> {
  if (input.byteLength === 0) throw new ImageRejectedError("Fichier vide.");
  if (input.byteLength > opts.maxBytes) {
    throw new ImageRejectedError(`Fichier trop lourd (${Math.round(opts.maxBytes / 1024 / 1024)} Mo maximum).`);
  }

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: opts.maxSide * opts.maxSide, failOn: "error" }).metadata();
  } catch {
    throw new ImageRejectedError("Ce fichier n'est pas une image valide.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageRejectedError("Format non accepté. Utilise une image JPEG, PNG ou WebP.");
  }
  if (!meta.width || !meta.height || meta.width > opts.maxSide || meta.height > opts.maxSide) {
    throw new ImageRejectedError(`Dimensions trop grandes (${opts.maxSide} px maximum par côté).`);
  }
  if (opts.minSide && (meta.width < opts.minSide || meta.height < opts.minSide)) {
    throw new ImageRejectedError(`Image trop petite (${opts.minSide} px minimum par côté).`);
  }
  if ((meta.pages ?? 1) > 1) throw new ImageRejectedError("Les images animées ne sont pas acceptées.");

  try {
    const { data, info } = await sharp(input, { limitInputPixels: opts.maxSide * opts.maxSide, failOn: "error" })
      .rotate()
      .resize({
        width: opts.output.width,
        height: opts.output.height,
        fit: opts.output.fit,
        withoutEnlargement: opts.output.fit === "inside",
      })
      .webp({ quality: opts.quality ?? 82 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  } catch {
    throw new ImageRejectedError("Cette image n'a pas pu être traitée.");
  }
}
