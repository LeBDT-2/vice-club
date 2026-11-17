import { z } from "zod";
import { email, plainText, singleLine } from "./common";

export const CONTACT_CATEGORIES = {
  question: "Question sur le site",
  signalement: "Signaler un contenu ou un comportement",
  donnees: "Mes données personnelles (accès, rectification, effacement…)",
  droits_auteur: "Droits d'auteur sur un média",
  contestation: "Contester une décision de modération",
  bug: "Signaler un bug ou une faille",
  autre: "Autre",
} as const;

export type ContactCategory = keyof typeof CONTACT_CATEGORIES;

export const contactMessageSchema = z.object({
  category: z.enum(Object.keys(CONTACT_CATEGORIES) as [ContactCategory, ...ContactCategory[]], "Choisis un sujet."),
  subject: singleLine(120, 3),
  body: plainText(3000, 10),
  page_url: z
    .string()
    .trim()
    .max(300, "300 caractères maximum.")
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^https?:\/\//.test(v), "Indique une adresse commençant par http:// ou https://."),
  reply_email: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined))
    .pipe(email.optional()),
  // Champ piège invisible : un humain le laisse vide.
  website: z.string().max(0).optional(),
});
