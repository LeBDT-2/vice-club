"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertStaff, getViewer } from "@/lib/auth/viewer";
import { RateLimitError, enforceRateLimits } from "@/lib/security/rate-limit";
import { clientIpFingerprint } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ActionState, formToObject, plainText, uuid, zodFieldErrors } from "@/lib/validation/common";
import { contactMessageSchema } from "@/lib/validation/contact";

export async function sendContactMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = contactMessageSchema.safeParse(formToObject(form));
  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error);
    // Robot détecté par le champ piège : réponse identique à un succès, rien n'est enregistré.
    if (fieldErrors.website) return { ok: true, message: "Message envoyé. L'équipe te répondra dès que possible." };
    return { ok: false, fieldErrors };
  }
  const viewer = await getViewer();
  if (!viewer && !parsed.data.reply_email) {
    return { ok: false, fieldErrors: { reply_email: ["Indique une adresse pour qu'on puisse te répondre."] } };
  }

  try {
    const ip = await clientIpFingerprint();
    await enforceRateLimits([
      { key: `contact:ip:${ip}`, max: 5, windowSeconds: 3600 },
      { key: `contact:ip:day:${ip}`, max: 15, windowSeconds: 86400 },
      ...(viewer ? [{ key: `contact:user:${viewer.id}`, max: 10, windowSeconds: 86400 }] : []),
    ]);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, message: "Trop de messages envoyés. Réessaie dans une heure." };
    throw e;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    user_id: viewer?.id ?? null,
    reply_email: parsed.data.reply_email ?? null,
    category: parsed.data.category,
    subject: parsed.data.subject,
    body: parsed.data.body,
    page_url: parsed.data.page_url ?? null,
  });
  if (error) {
    console.error("[contact] insert", { code: error.code });
    return { ok: false, message: "L'envoi a échoué. Réessaie dans un instant." };
  }
  return { ok: true, message: "Message envoyé. L'équipe te répondra dès que possible." };
}

const closeSchema = z.object({ id: uuid, note: plainText(1000).optional(), reopen: z.literal("1").optional() });

export async function setContactMessageStatusAction(form: FormData) {
  const viewer = await assertStaff("moderator");
  const parsed = closeSchema.safeParse(formToObject(form));
  if (!parsed.success) redirect("/admin/contact?erreur=Donn%C3%A9es%20invalides.");
  const admin = createAdminClient();
  const reopen = parsed.data.reopen === "1";
  const { error } = await admin
    .from("contact_messages")
    .update(
      reopen
        ? { status: "open", handled_by: null, handled_at: null }
        : { status: "closed", handled_by: viewer.id, handled_at: new Date().toISOString(), staff_note: parsed.data.note || null },
    )
    .eq("id", parsed.data.id);
  if (!error) {
    await admin.rpc("write_audit", {
      p_actor: viewer.id,
      p_action: reopen ? "contact.reopen" : "contact.close",
      p_target_type: "contact_message",
      p_target_id: parsed.data.id,
      p_metadata: {},
    });
  }
  revalidatePath("/admin/contact");
  redirect(`/admin/contact?${error ? "erreur=Mise%20%C3%A0%20jour%20impossible." : `ok=${reopen ? "Message%20rouvert." : "Message%20trait%C3%A9."}`}`);
}
