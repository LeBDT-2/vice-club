import { z } from "zod";

 
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Texte brut : supprime les espaces superflus, refuse les caractères de contrôle. */
export const plainText = (max: number, min = 0) =>
  z
    .string()
    .transform((s) => s.replace(/\r\n/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(min, min > 0 ? `Au moins ${min} caractère${min > 1 ? "s" : ""}.` : undefined)
        .max(max, `${max} caractères maximum.`)
        .refine((s) => !CONTROL_CHARS.test(s), "Caractères non autorisés."),
    );

export const singleLine = (max: number, min = 0) =>
  plainText(max, min).refine((s) => !s.includes("\n"), "Une seule ligne.");

export const uuid = z.uuid("Identifiant invalide.");

export const PASSWORD_MIN = 10;
export const password = z
  .string()
  .min(PASSWORD_MIN, `Au moins ${PASSWORD_MIN} caractères.`)
  .max(128, "128 caractères maximum.")
  .refine((s) => /[a-zA-Z]/.test(s) && /[0-9\W_]/.test(s), "Mélange des lettres et au moins un chiffre ou symbole.");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Adresse e-mail invalide.").max(254));

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()])
  .transform((v) => v === "on" || v === "true");

/** Transforme un FormData en objet (valeurs multiples → tableau pour les clés listées). */
export function formToObject(form: FormData, arrays: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = form.getAll(key).filter((v) => typeof v === "string");
    out[key] = arrays.includes(key) ? values : values[0];
  }
  for (const key of arrays) if (!(key in out)) out[key] = [];
  return out;
}

export type FieldErrors = Record<string, string[] | undefined>;
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
} | null;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
