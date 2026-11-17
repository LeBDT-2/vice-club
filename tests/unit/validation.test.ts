import { describe, expect, it } from "vitest";
import { signUpSchema, deleteAccountSchema, changePasswordSchema } from "@/lib/validation/auth";
import { contactMessageSchema } from "@/lib/validation/contact";
import { garageSchema } from "@/lib/validation/garage";
import { handleSchema, username } from "@/lib/validation/profile";
import { messageSchema, reportSchema } from "@/lib/validation/social";
import { plainText } from "@/lib/validation/common";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

describe("Inscription", () => {
  const ok = { email: "Joueur@Example.test", password: "Sup3rSecret!x", password_confirm: "Sup3rSecret!x", age_confirmed: "on", terms_accepted: "on" };
  it("accepte un dossier complet et normalise l'e-mail", () => {
    const r = signUpSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("joueur@example.test");
  });
  it("exige la déclaration 18+ et les conditions", () => {
    expect(signUpSchema.safeParse({ ...ok, age_confirmed: undefined }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, terms_accepted: "" }).success).toBe(false);
  });
  it("refuse un mot de passe faible ou non confirmé", () => {
    expect(signUpSchema.safeParse({ ...ok, password: "court1", password_confirm: "court1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password: "aaaaaaaaaaaa", password_confirm: "aaaaaaaaaaaa" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password_confirm: "autre" }).success).toBe(false);
  });
  it("exige un nouveau mot de passe différent", () => {
    expect(changePasswordSchema.safeParse({ current_password: "Sup3rSecret!x", password: "Sup3rSecret!x", password_confirm: "Sup3rSecret!x" }).success).toBe(false);
  });
  it("exige SUPPRIMER pour supprimer le compte", () => {
    expect(deleteAccountSchema.safeParse({ current_password: "x", confirmation: "supprimer" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ current_password: "x", confirmation: "SUPPRIMER" }).success).toBe(true);
  });
});

describe("Profil", () => {
  it("valide les pseudos", () => {
    expect(username.safeParse("Neo_Vice").success).toBe(true);
    expect(username.safeParse("ab").success).toBe(false);
    expect(username.safeParse("pseudo avec espace").success).toBe(false);
    expect(username.safeParse("Éric").success).toBe(false);
    expect(username.safeParse("admin").success).toBe(false);
  });
  it("refuse le balisage dans un pseudo de plateforme", () => {
    expect(handleSchema.safeParse({ network: "psn", handle: "<script>", visibility: "public" }).success).toBe(false);
  });
  it("refuse les caractères de contrôle", () => {
    expect(plainText(50).safeParse("salut\u0007").success).toBe(false);
    expect(plainText(50).safeParse("  ligne\r\nsuivante ").data).toBe("ligne\nsuivante");
  });
});

describe("Garage", () => {
  const base = { garage_id: "", name: "Ma sélection", description: "", visibility: "private" };
  it("refuse les doublons", () => {
    expect(garageSchema.safeParse({ ...base, vehicle_ids: [U1, U1] }).success).toBe(false);
  });
  it("refuse plus de véhicules que le plafond technique", () => {
    expect(garageSchema.safeParse({ ...base, vehicle_ids: Array.from({ length: 11 }, () => crypto.randomUUID()) }).success).toBe(false);
  });
  it("accepte un garage valide", () => {
    expect(garageSchema.safeParse({ ...base, vehicle_ids: [U1, U2] }).success).toBe(true);
  });
});

describe("Messagerie, signalement et contact", () => {
  it("limite la taille des messages", () => {
    expect(messageSchema.safeParse({ conversation_id: U1, body: "" }).success).toBe(false);
    expect(messageSchema.safeParse({ conversation_id: U1, body: "x".repeat(5000) }).success).toBe(false);
  });
  it("n'accepte que les motifs de signalement connus", () => {
    expect(reportSchema.safeParse({ target_type: "profile", target_id: U1, reason: "inconnu", details: "" }).success).toBe(false);
  });
  it("valide le formulaire de contact et détecte le champ piège", () => {
    const msg = { category: "bug", subject: "Bouton cassé", body: "Le bouton ne répond pas sur mobile.", reply_email: "a@b.test" };
    expect(contactMessageSchema.safeParse(msg).success).toBe(true);
    expect(contactMessageSchema.safeParse({ ...msg, website: "http://spam" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...msg, page_url: "javascript:alert(1)" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...msg, category: "pub" }).success).toBe(false);
  });
});
