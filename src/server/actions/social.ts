"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActive, requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, formToObject, zodFieldErrors } from "@/lib/validation/common";
import { contactRequestSchema, messageSchema, reportSchema } from "@/lib/validation/social";

const ERRORS: Record<string, string> = {
  account_restricted: "Ton compte est restreint : cette action n'est pas disponible.",
  profile_incomplete: "Choisis d'abord ton pseudo.",
  cannot_contact_self: "Tu ne peux pas t'envoyer une demande.",
  recipient_unavailable: "Ce joueur n'est pas joignable.",
  already_contacts: "Vous êtes déjà en contact.",
  request_already_pending: "Une demande est déjà en attente entre vous.",
  request_recently_declined: "Ta demande a été refusée récemment. Réessaie dans quelques jours.",
  invalid_message: "Message invalide.",
  rate_limited: "Tu vas un peu vite. Patiente avant de recommencer.",
  conversation_closed: "Cette conversation est fermée.",
  report_already_open: "Tu as déjà signalé ce contenu ; l'équipe va l'examiner.",
  cannot_report_self: "Tu ne peux pas te signaler toi-même.",
  not_found: "Élément introuvable.",
  request_not_pending: "Cette demande a déjà été traitée.",
};

function rpcError(message: string | undefined): ActionState {
  const key = Object.keys(ERRORS).find((k) => message?.includes(k));
  return { ok: false, message: key ? ERRORS[key] : "L'action a échoué. Réessaie dans un instant." };
}

export async function sendContactRequestAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireActive("/joueurs");
  const parsed = contactRequestSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_contact_request", { p_recipient: parsed.data.recipient_id, p_message: parsed.data.message });
  if (error) return rpcError(error.message);
  revalidatePath("/demandes");
  return { ok: true, message: "Demande envoyée. Tu seras notifié si elle est acceptée." };
}

export async function respondContactRequestAction(form: FormData) {
  await requireActive("/demandes");
  const id = z.uuid().parse(form.get("request_id"));
  const accept = form.get("decision") === "accept";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_contact_request", { p_request: id, p_accept: accept });
  if (error) redirect(`/demandes?erreur=${encodeURIComponent(rpcError(error.message)?.message ?? "")}`);
  revalidatePath("/demandes");
  revalidatePath("/", "layout");
  if (accept && data) redirect(`/messages/${data}`);
}

export async function withdrawContactRequestAction(form: FormData) {
  await requireUser("/demandes");
  const id = z.uuid().parse(form.get("request_id"));
  const supabase = await createClient();
  await supabase.rpc("withdraw_contact_request", { p_request: id });
  revalidatePath("/demandes");
}

export async function blockUserAction(form: FormData) {
  await requireUser("/joueurs");
  const id = z.uuid().parse(form.get("user_id"));
  const back = form.get("back") === "messages" ? "/messages" : "/joueurs";
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_user", { p_user: id });
  if (error) redirect(`${back}?erreur=blocage`);
  revalidatePath("/", "layout");
  redirect(`${back}?bloque=1`);
}

export async function unblockUserAction(form: FormData) {
  await requireUser("/compte/bloques");
  const id = z.uuid().parse(form.get("user_id"));
  const supabase = await createClient();
  await supabase.rpc("unblock_user", { p_user: id });
  revalidatePath("/compte/bloques");
}

export async function reportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("/joueurs");
  const parsed = reportSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_target_type: parsed.data.target_type,
    p_target_id: parsed.data.target_id,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  });
  if (error) return rpcError(error.message);
  return { ok: true, message: "Signalement transmis à l'équipe de modération. Merci." };
}

export async function sendMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireActive("/messages");
  const parsed = messageSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", { p_conversation: parsed.data.conversation_id, p_body: parsed.data.body });
  if (error) return rpcError(error.message);
  revalidatePath(`/messages/${parsed.data.conversation_id}`);
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const viewer = await requireUser("/notifications");
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).is("read_at", null);
  revalidatePath("/", "layout");
}
