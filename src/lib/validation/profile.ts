import { z } from "zod";
import { plainText, singleLine, uuid } from "./common";

export const LANGUAGES = {
  fr: "Français",
  en: "Anglais",
  es: "Espagnol",
  de: "Allemand",
  it: "Italien",
  pt: "Portugais",
  nl: "Néerlandais",
  ar: "Arabe",
  pl: "Polonais",
  tr: "Turc",
} as const;

export const PLAY_STYLES = {
  chill: "Chill",
  courses: "Courses",
  exploration: "Exploration",
  braquages: "Braquages",
  missions: "Missions",
  roleplay: "Roleplay",
  photo: "Photo",
  combat: "Combat",
  business: "Business",
} as const;

export const PLAY_SLOTS = {
  matin: "Matin",
  midi: "Midi",
  apres_midi: "Après-midi",
  soir: "Soirée",
  nuit: "Nuit",
} as const;

export const PLAY_DAYS = { semaine: "En semaine", week_end: "Le week-end" } as const;

export const HANDLE_NETWORKS = {
  psn: "PlayStation Network",
  xbox: "Xbox (Gamertag)",
  steam: "Steam",
  rockstar: "Rockstar Social Club",
  discord: "Discord",
  epic: "Epic Games",
} as const;

export const HANDLE_VISIBILITY = {
  public: "Tout le monde",
  contacts: "Mes contacts acceptés",
  private: "Personne",
} as const;

const RESERVED = new Set([
  "admin", "administrateur", "administrator", "moderateur", "moderator", "modo", "staff", "support",
  "viceclub", "vice_club", "rockstar", "rockstargames", "taketwo", "take_two", "system", "systeme",
  "root", "null", "undefined", "anonyme", "anonymous", "compte", "api", "help", "aide", "contact",
]);

/** Pseudo : 3 à 20 caractères [A-Za-z0-9_], unicité insensible à la casse. */
export const username = z
  .string()
  .trim()
  .min(3, "3 caractères minimum.")
  .max(20, "20 caractères maximum.")
  .regex(/^[A-Za-z0-9_]+$/, "Lettres sans accent, chiffres et _ uniquement.")
  .refine((v) => !RESERVED.has(v.toLowerCase()), "Ce pseudo est réservé.");

export function normalizeUsername(v: string) {
  return v.trim().toLowerCase();
}

const enumKeys = <T extends Record<string, string>>(obj: T) => Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]];

export const profileSchema = z.object({
  bio: plainText(300),
  languages: z.array(z.enum(enumKeys(LANGUAGES))).max(6, "6 langues maximum."),
  play_styles: z.array(z.enum(enumKeys(PLAY_STYLES))).max(8),
  play_slots: z.array(z.enum(enumKeys(PLAY_SLOTS))).max(5),
  play_days: z.array(z.enum(enumKeys(PLAY_DAYS))).max(2),
  has_mic: z.enum(["yes", "no", "unknown"]).transform((v) => (v === "yes" ? true : v === "no" ? false : null)),
  timezone: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Fuseau horaire inconnu."),
  show_badges: z.boolean(),
  show_results: z.boolean(),
  game_platform_ids: z.array(uuid).max(12, "12 combinaisons maximum."),
});

export const handleSchema = z.object({
  network: z.enum(enumKeys(HANDLE_NETWORKS)),
  handle: singleLine(40, 2).refine((v) => !/[<>]/.test(v), "Caractères non autorisés."),
  visibility: z.enum(enumKeys(HANDLE_VISIBILITY)),
});

export const availabilitySchema = z
  .object({
    kind: z.enum(["now", "planned"]),
    game_platform_id: z.union([uuid, z.literal("")]).transform((v) => (v === "" ? null : v)),
    duration_minutes: z.coerce.number().int().min(15).max(360),
    starts_at: z.string().optional(),
    note: singleLine(120),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "planned") {
      const t = v.starts_at ? Date.parse(v.starts_at) : NaN;
      if (Number.isNaN(t)) ctx.addIssue({ code: "custom", path: ["starts_at"], message: "Indique une heure de début." });
      else if (t < Date.now() - 5 * 60_000) ctx.addIssue({ code: "custom", path: ["starts_at"], message: "L'heure doit être dans le futur." });
      else if (t > Date.now() + 7 * 86_400_000) ctx.addIssue({ code: "custom", path: ["starts_at"], message: "7 jours maximum à l'avance." });
    }
  });
