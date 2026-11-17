"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertStaff } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { plainText, uuid } from "@/lib/validation/common";

/**
 * Modération. Toutes les décisions passent par des fonctions SQL qui revérifient
 * le rôle ET la MFA (private.require_staff), exigent un motif et journalisent.
 */
const ERRORS: Record<string, string> = {
  reason_required: "Indique un motif (3 caractères minimum).",
  forbidden: "Action réservée à un rôle supérieur.",
  mfa_required: "Valide ta double authentification.",
  cannot_sanction_self: "Tu ne peux pas te sanctionner toi-même.",
  cannot_change_own_role: "Tu ne peux pas modifier ton propre rôle.",
  invalid_duration: "Durée invalide (1 h à 1 an).",
  not_found: "Élément introuvable ou déjà traité.",
};

function back(path: string, error?: { message: string }, ok?: string): never {
  const key = error ? Object.keys(ERRORS).find((k) => error.message.includes(k)) : undefined;
  const sp = new URLSearchParams(error ? { erreur: key ? ERRORS[key] : "L'action a échoué." } : { ok: ok ?? "Fait." });
  redirect(`${path}?${sp}`);
}

const reason = plainText(1000, 3);
const backPath = z.string().regex(/^\/admin\/[\w\-/]+$/);

export async function closeReportAction(form: FormData) {
  await assertStaff("moderator");
  const id = uuid.parse(form.get("report_id"));
  const decision = z.enum(["resolved", "dismissed"]).parse(form.get("decision"));
  const note = reason.safeParse(form.get("note"));
  if (!note.success) back(`/admin/signalements/${id}`, { message: "reason_required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_close_report", { p_report: id, p_decision: decision, p_note: note.data });
  if (error) back(`/admin/signalements/${id}`, error);
  revalidatePath("/admin");
  back("/admin/signalements", undefined, decision === "resolved" ? "Signalement traité." : "Signalement classé sans suite.");
}

export async function sanctionUserAction(form: FormData) {
  await assertStaff("moderator");
  const to = backPath.parse(form.get("back"));
  const user = uuid.parse(form.get("user_id"));
  const kind = z.enum(["suspension", "ban"]).parse(form.get("kind"));
  const hours = kind === "suspension" ? z.coerce.number().int().min(1).max(8760).safeParse(form.get("hours")) : { success: true as const, data: null };
  const why = reason.safeParse(form.get("reason"));
  const report = form.get("report_id") ? uuid.parse(form.get("report_id")) : null;
  if (!why.success) back(to, { message: "reason_required" });
  if (!hours.success) back(to, { message: "invalid_duration" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_sanction_user", {
    p_user: user,
    p_kind: kind,
    p_reason: why.data,
    p_duration_hours: (hours.data ?? undefined) as number,
    p_report: (report ?? undefined) as string,
  });
  if (error) back(to, error);
  back(to, undefined, kind === "ban" ? "Compte banni." : "Compte suspendu.");
}

export async function revokeSanctionAction(form: FormData) {
  await assertStaff("moderator");
  const to = backPath.parse(form.get("back"));
  const id = uuid.parse(form.get("sanction_id"));
  const why = reason.safeParse(form.get("reason"));
  if (!why.success) back(to, { message: "reason_required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_revoke_sanction", { p_sanction: id, p_reason: why.data });
  if (error) back(to, error);
  back(to, undefined, "Sanction levée.");
}

export async function setProfileHiddenAction(form: FormData) {
  await assertStaff("moderator");
  const to = backPath.parse(form.get("back"));
  const user = uuid.parse(form.get("user_id"));
  const hidden = form.get("hidden") === "true";
  const why = reason.safeParse(form.get("reason"));
  if (!why.success) back(to, { message: "reason_required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_set_profile_hidden", { p_user: user, p_hidden: hidden, p_reason: why.data });
  if (error) back(to, error);
  back(to, undefined, hidden ? "Profil masqué." : "Profil réaffiché.");
}

export async function setGarageHiddenAction(form: FormData) {
  await assertStaff("moderator");
  const to = backPath.parse(form.get("back"));
  const garage = uuid.parse(form.get("garage_id"));
  const hidden = form.get("hidden") === "true";
  const why = reason.safeParse(form.get("reason"));
  const report = form.get("report_id") ? uuid.parse(form.get("report_id")) : null;
  if (!why.success) back(to, { message: "reason_required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_set_garage_hidden", { p_garage: garage, p_hidden: hidden, p_reason: why.data, p_report: (report ?? undefined) as string });
  if (error) back(to, error);
  back(to, undefined, hidden ? "Garage masqué." : "Garage réaffiché.");
}

export async function hideMessageAction(form: FormData) {
  await assertStaff("moderator");
  const report = uuid.parse(form.get("report_id"));
  const message = z.coerce.number().int().positive().parse(form.get("message_id"));
  const why = reason.safeParse(form.get("reason"));
  if (!why.success) back(`/admin/signalements/${report}`, { message: "reason_required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_hide_message", { p_message: message, p_reason: why.data, p_report: report });
  if (error) back(`/admin/signalements/${report}`, error);
  back(`/admin/signalements/${report}`, undefined, "Message masqué.");
}

export async function setRoleAction(form: FormData) {
  await assertStaff("admin");
  const user = uuid.parse(form.get("user_id"));
  const role = z.enum(["user", "moderator", "admin"]).parse(form.get("role"));
  const why = reason.safeParse(form.get("reason"));
  if (!why.success) back(`/admin/utilisateurs/${user}`, { message: "reason_required" });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: user, p_role: role, p_reason: why.data });
  if (error) back(`/admin/utilisateurs/${user}`, error);
  back(`/admin/utilisateurs/${user}`, undefined, "Rôle mis à jour.");
}
