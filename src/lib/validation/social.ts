import { z } from "zod";
import { plainText, uuid } from "./common";

export const contactRequestSchema = z.object({
  recipient_id: uuid,
  message: plainText(280),
});

export const messageSchema = z.object({
  conversation_id: uuid,
  body: plainText(2000, 1),
});

export const REPORT_REASONS = {
  harcelement: "Harcèlement ou intimidation",
  haine: "Propos haineux ou discriminatoires",
  spam: "Spam ou publicité",
  arnaque: "Arnaque, phishing, demande d'identifiants",
  contenu_sexuel: "Contenu sexuel",
  mineur: "Possible personne mineure",
  usurpation: "Usurpation d'identité",
  triche: "Triche ou vente de services illicites",
  autre: "Autre",
} as const;

export const reportSchema = z.object({
  target_type: z.enum(["profile", "message", "garage"]),
  target_id: z.string().min(1).max(64).regex(/^[0-9a-f-]+$/i),
  reason: z.enum(Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS, ...(keyof typeof REPORT_REASONS)[]]),
  details: plainText(1000),
});
