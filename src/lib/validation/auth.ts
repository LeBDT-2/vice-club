import { z } from "zod";
import { checkbox, email, password } from "./common";

export const TERMS_VERSION = "2026-11-17";

export const signUpSchema = z
  .object({
    email,
    password,
    password_confirm: z.string(),
    age_confirmed: checkbox.refine((v) => v, "Tu dois déclarer avoir 18 ans ou plus."),
    terms_accepted: checkbox.refine((v) => v, "Tu dois accepter les conditions d'utilisation."),
  })
  .refine((v) => v.password === v.password_confirm, { path: ["password_confirm"], message: "Les mots de passe ne correspondent pas." });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

export const forgotSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, password_confirm: z.string() })
  .refine((v) => v.password === v.password_confirm, { path: ["password_confirm"], message: "Les mots de passe ne correspondent pas." });

export const changePasswordSchema = z
  .object({ current_password: z.string().min(1, "Mot de passe actuel requis.").max(128), password, password_confirm: z.string() })
  .refine((v) => v.password === v.password_confirm, { path: ["password_confirm"], message: "Les mots de passe ne correspondent pas." })
  .refine((v) => v.password !== v.current_password, { path: ["password"], message: "Choisis un mot de passe différent de l'actuel." });

export const changeEmailSchema = z.object({ email, current_password: z.string().min(1, "Mot de passe requis.").max(128) });

export const deleteAccountSchema = z.object({
  current_password: z.string().min(1, "Mot de passe requis.").max(128),
  confirmation: z.literal("SUPPRIMER", { error: "Tape SUPPRIMER pour confirmer." }),
});
