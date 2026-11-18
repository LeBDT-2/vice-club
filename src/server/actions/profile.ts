"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActive, requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimits, RateLimitError } from "@/lib/security/rate-limit";
import { safeNextPath } from "@/lib/security/redirect";
import { ImageRejectedError, reencodeImage } from "@/lib/images/process";
import { type ActionState, formToObject, zodFieldErrors } from "@/lib/validation/common";
import { availabilitySchema, handleSchema, profileSchema, username as usernameSchema } from "@/lib/validation/profile";
import { z } from "zod";
import { PRESET_PREFIX, readyPresets } from "@/config/avatars";

const GENERIC_ERROR: ActionState = { ok: false, message: "L'enregistrement a échoué. Réessaie dans un instant." };

function dbError(code: string | undefined, message: string | undefined): ActionState {
  if (message?.includes("account_restricted") || code === "42501") {
    return { ok: false, message: "Ton compte est restreint : cette action n'est pas disponible." };
  }
  if (message?.includes("rate_limited")) return { ok: false, message: "Trop d'actions en peu de temps. Patiente un peu." };
  return GENERIC_ERROR;
}

// --------------------------------------------------------------- Pseudo (accueil)
export async function chooseUsernameAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireUser("/bienvenue");
  const parsed = z.object({ username: usernameSchema }).safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const next = safeNextPath(form.get("next"), "/compte/profil?bienvenue=1");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ username: parsed.data.username }).eq("id", viewer.id);
  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { username: ["Ce pseudo est déjà pris."] } };
    if (error.message.includes("username_reserved")) return { ok: false, fieldErrors: { username: ["Ce pseudo est réservé."] } };
    if (error.message.includes("username_change_too_soon")) {
      return { ok: false, fieldErrors: { username: ["Tu as changé de pseudo il y a moins de 30 jours."] } };
    }
    return dbError(error.code, error.message);
  }
  revalidatePath("/", "layout");
  redirect(next);
}

// ---------------------------------------------------------------- Profil complet
export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireActive("/compte/profil");
  const raw = formToObject(form, ["languages", "play_styles", "play_slots", "play_days", "game_platform_ids"]);
  const parsed = profileSchema.safeParse({
    ...raw,
    show_badges: raw.show_badges === "on",
    show_results: raw.show_results === "on",
  });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      bio: d.bio,
      languages: d.languages,
      play_styles: d.play_styles,
      play_slots: d.play_slots,
      play_days: d.play_days,
      has_mic: d.has_mic,
      timezone: d.timezone,
      show_badges: d.show_badges,
      show_results: d.show_results,
    })
    .eq("id", viewer.id);
  if (error) return dbError(error.code, error.message);

  const { data: current } = await supabase.from("profile_games").select("game_platform_id").eq("profile_id", viewer.id);
  const have = new Set((current ?? []).map((r) => r.game_platform_id));
  const want = new Set(d.game_platform_ids);
  const toRemove = [...have].filter((id) => !want.has(id));
  const toAdd = [...want].filter((id) => !have.has(id));
  if (toRemove.length) {
    const { error: e } = await supabase.from("profile_games").delete().eq("profile_id", viewer.id).in("game_platform_id", toRemove);
    if (e) return dbError(e.code, e.message);
  }
  if (toAdd.length) {
    const { error: e } = await supabase.from("profile_games").insert(toAdd.map((id) => ({ profile_id: viewer.id, game_platform_id: id })));
    if (e) return { ok: false, fieldErrors: { game_platform_ids: ["Une des combinaisons choisies n'est pas disponible."] } };
  }
  revalidatePath(`/joueurs/${viewer.username}`);
  return { ok: true, message: "Profil enregistré." };
}

// ------------------------------------------------------------ Pseudos de jeu
export async function saveHandleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireActive("/compte/profil");
  const parsed = handleSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_handles")
    .upsert({ profile_id: viewer.id, ...parsed.data }, { onConflict: "profile_id,network" });
  if (error) return dbError(error.code, error.message);
  revalidatePath("/compte/profil");
  return { ok: true, message: "Pseudo de jeu enregistré." };
}

export async function deleteHandleAction(form: FormData) {
  const viewer = await requireUser("/compte/profil");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("profile_handles").delete().eq("id", id.data).eq("profile_id", viewer.id);
  revalidatePath("/compte/profil");
}

// -------------------------------------------------------------- Disponibilité
export async function setAvailabilityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireActive("/compte/profil");
  const parsed = availabilitySchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const start = d.kind === "now" ? new Date() : new Date(d.starts_at!);
  const end = new Date(start.getTime() + d.duration_minutes * 60_000);

  const supabase = await createClient();
  if (d.game_platform_id) {
    const { data: owned } = await supabase
      .from("profile_games")
      .select("game_platform_id")
      .eq("profile_id", viewer.id)
      .eq("game_platform_id", d.game_platform_id)
      .maybeSingle();
    if (!owned) return { ok: false, fieldErrors: { game_platform_id: ["Ajoute d'abord ce jeu à ton profil."] } };
  }
  await supabase.from("availabilities").delete().eq("profile_id", viewer.id);
  const { error } = await supabase.from("availabilities").insert({
    profile_id: viewer.id,
    kind: d.kind,
    game_platform_id: d.game_platform_id,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    note: d.note,
  });
  if (error) return dbError(error.code, error.message);
  revalidatePath("/joueurs");
  revalidatePath("/");
  return { ok: true, message: d.kind === "now" ? "Tu apparais comme disponible." : "Disponibilité prévue enregistrée." };
}

export async function clearAvailabilityAction() {
  const viewer = await requireUser("/compte/profil");
  const supabase = await createClient();
  await supabase.from("availabilities").delete().eq("profile_id", viewer.id);
  revalidatePath("/joueurs");
  revalidatePath("/compte/profil");
}

// --------------------------------------------------------------------- Avatar
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export async function uploadAvatarAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireActive("/compte/profil");
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, fieldErrors: { avatar: ["Choisis une image."] } };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, fieldErrors: { avatar: ["Image trop lourde (2 Mo maximum)."] } };

  try {
    await enforceRateLimits([{ key: `avatar:user:${viewer.id}`, max: 10, windowSeconds: 3600 }]);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, message: "Trop d'envois récents. Réessaie plus tard." };
    throw e;
  }

  let processed;
  try {
    processed = await reencodeImage(Buffer.from(await file.arrayBuffer()), {
      maxBytes: AVATAR_MAX_BYTES,
      maxSide: 4096,
      minSide: 64,
      output: { width: 256, height: 256, fit: "cover" },
    });
  } catch (e) {
    if (e instanceof ImageRejectedError) return { ok: false, fieldErrors: { avatar: [e.message] } };
    throw e;
  }

  const admin = createAdminClient();
  const path = `${viewer.id}/${randomUUID()}.webp`;
  const { error: upErr } = await admin.storage.from("avatars").upload(path, processed.buffer, {
    contentType: "image/webp",
    upsert: false,
    cacheControl: "31536000",
  });
  if (upErr) return GENERIC_ERROR;

  const { data: prev } = await admin.from("profiles").select("avatar_path").eq("id", viewer.id).single();
  const { error: updErr } = await admin.from("profiles").update({ avatar_path: path }).eq("id", viewer.id);
  if (updErr) {
    await admin.storage.from("avatars").remove([path]);
    return GENERIC_ERROR;
  }
  if (prev?.avatar_path && prev.avatar_path.startsWith(`${viewer.id}/`)) {
    await admin.storage.from("avatars").remove([prev.avatar_path]);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Avatar mis à jour." };
}

/** Choix d'un avatar tout prêt : seul un id de la liste validée est accepté. */
export async function chooseAvatarPresetAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireActive("/compte/profil");
  const id = form.get("preset");
  const preset = typeof id === "string" ? readyPresets().find((a) => a.id === id) : undefined;
  if (!preset) return { ok: false, fieldErrors: { preset: ["Choisis un personnage dans la liste."] } };

  const admin = createAdminClient();
  const { data: prev } = await admin.from("profiles").select("avatar_path").eq("id", viewer.id).single();
  const { error } = await admin.from("profiles").update({ avatar_path: `${PRESET_PREFIX}${preset.id}` }).eq("id", viewer.id);
  if (error) return GENERIC_ERROR;
  if (prev?.avatar_path?.startsWith(`${viewer.id}/`)) await admin.storage.from("avatars").remove([prev.avatar_path]);
  revalidatePath("/", "layout");
  return { ok: true, message: `Avatar choisi : ${preset.label}.` };
}

export async function removeAvatarAction() {
  const viewer = await requireUser("/compte/profil");
  const admin = createAdminClient();
  const { data: prev } = await admin.from("profiles").select("avatar_path").eq("id", viewer.id).single();
  await admin.from("profiles").update({ avatar_path: null }).eq("id", viewer.id);
  if (prev?.avatar_path?.startsWith(`${viewer.id}/`)) await admin.storage.from("avatars").remove([prev.avatar_path]);
  revalidatePath("/", "layout");
}
