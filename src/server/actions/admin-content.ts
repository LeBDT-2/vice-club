"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertStaff } from "@/lib/auth/viewer";
import { buildMysteryVariants } from "@/lib/images/mystery";
import { ImageRejectedError, reencodeImage } from "@/lib/images/process";
import { createAdminClient } from "@/lib/supabase/admin";
import { plainText, singleLine, uuid } from "@/lib/validation/common";
import { parisDate } from "@/lib/utils/paris-time";
import { pickPricePair, pickTrainingRounds } from "@/server/games/content";

/**
 * Back-office de contenu. Chaque action :
 *  1. exige le rôle administrateur ET une session MFA (aal2) — assertStaff('admin') ;
 *  2. valide les entrées (Zod) ;
 *  3. écrit avec le client privilégié (les tables de contenu n'ont aucun droit d'écriture client) ;
 *  4. journalise l'opération (audit_log).
 * Les règles de publication (média validé, coordonnées dans la carte, défi complet…)
 * sont appliquées par des déclencheurs en base, quel que soit le chemin d'écriture.
 */

const DB_ERRORS: Record<string, string> = {
  publish_media_not_approved: "Le média associé doit être validé avant publication.",
  publish_map_not_published: "La carte doit être publiée avant ses lieux.",
  publish_coordinates_out_of_map: "Les coordonnées sortent de la carte.",
  publish_variants_missing: "Les variantes d'image de la voiture mystère sont manquantes.",
  publish_vehicle_not_published: "Le véhicule de la voiture mystère doit être publié.",
  vehicles_price_documented: "Un prix dans le jeu exige son type, sa source et sa date de vérification.",
  game_maps_scale: "Une échelle vérifiée exige une valeur et une source.",
  challenge_incomplete: "Le défi n'a pas le bon nombre de manches.",
  challenge_item_invalid: "Une manche du défi référence un contenu non publié ou incohérent.",
  challenge_bad_round_count: "Nombre de manches non valide pour ce jeu.",
  challenge_in_past: "Impossible de publier un défi dans le passé.",
  challenge_already_live: "Ce défi est déjà en ligne : il ne peut plus être modifié.",
  challenge_published_locked: "Dépublie le défi (s'il n'est pas encore en ligne) avant de modifier ses manches.",
  duplicate: "Cet identifiant (slug) existe déjà.",
  foreign_key: "Cet élément est encore utilisé ailleurs : archive-le plutôt que de le supprimer.",
};

function dbMessage(error: { message: string; code?: string }) {
  if (error.code === "23505") return DB_ERRORS.duplicate;
  if (error.code === "23503") return DB_ERRORS.foreign_key;
  const key = Object.keys(DB_ERRORS).find((k) => error.message.includes(k));
  return key ? DB_ERRORS[key] : "L'opération a échoué. Vérifie les champs et réessaie.";
}

function back(path: string, result: { ok?: string; error?: string }): never {
  const sp = new URLSearchParams();
  if (result.ok) sp.set("ok", result.ok);
  if (result.error) sp.set("erreur", result.error);
  redirect(`${path}${path.includes("?") ? "&" : "?"}${sp.toString()}`);
}

async function audit(actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await createAdminClient().rpc("write_audit", { p_actor: actor, p_action: action, p_target_type: targetType, p_target_id: targetId, p_metadata: metadata as never });
}

const statusSchema = z.enum(["draft", "published", "archived"]);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, "Slug : lettres minuscules, chiffres et tirets.");
const optionalUuid = z.union([uuid, z.literal("")]).transform((v) => (v === "" ? null : v));
const intField = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const optionalInt = z.union([z.literal(""), z.coerce.number().int().min(0).max(1e13)]).transform((v) => (v === "" ? null : v));
const dateField = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((v) => (v === "" ? null : v));
const bool = z.union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()]).transform((v) => v === "on" || v === "true");

function fields(form: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) o[k] = v;
  return o;
}

// ------------------------------------------------------------------ Statut générique
const STATUS_TABLES = ["games", "platforms", "game_platforms", "vehicles", "properties", "game_maps", "geo_locations", "mystery_puzzles", "reality_items"] as const;

export async function setContentStatusAction(form: FormData) {
  const staff = await assertStaff("admin");
  const table = z.enum(STATUS_TABLES).parse(form.get("table"));
  const id = uuid.parse(form.get("id"));
  const status = statusSchema.parse(form.get("status"));
  const backTo = z.string().regex(/^\/admin[\w\-/?=&]*$/).parse(form.get("back"));
  const { error } = await createAdminClient().from(table).update({ status }).eq("id", id);
  if (error) back(backTo, { error: dbMessage(error) });
  await audit(staff.id, `content.${status}`, table, id);
  revalidatePath("/", "layout");
  back(backTo, { ok: status === "published" ? "Publié." : status === "archived" ? "Archivé." : "Repassé en brouillon." });
}

// ------------------------------------------------------------------ Jeux, plateformes
export async function saveGameAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({ id: optionalUuid, slug, name: singleLine(80, 2), short_name: singleLine(24, 2), description: plainText(500), sort_order: intField(0, 10000) })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/jeux", { error: parsed.error.issues[0].message });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id ? await admin.from("games").update(row).eq("id", id).select("id").single() : await admin.from("games").insert(row).select("id").single();
  if (error) back("/admin/contenu/jeux", { error: dbMessage(error) });
  await audit(staff.id, id ? "game.update" : "game.create", "game", data!.id);
  back("/admin/contenu/jeux", { ok: "Jeu enregistré (brouillon tant qu'il n'est pas publié)." });
}

export async function savePlatformAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z.object({ id: optionalUuid, slug, name: singleLine(60, 2), short_name: singleLine(16, 2), sort_order: intField(0, 10000) }).safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/jeux", { error: parsed.error.issues[0].message });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id ? await admin.from("platforms").update(row).eq("id", id).select("id").single() : await admin.from("platforms").insert(row).select("id").single();
  if (error) back("/admin/contenu/jeux", { error: dbMessage(error) });
  await audit(staff.id, id ? "platform.update" : "platform.create", "platform", data!.id);
  back("/admin/contenu/jeux", { ok: "Plateforme enregistrée." });
}

export async function saveGamePlatformAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      id: optionalUuid,
      game_id: uuid,
      platform_id: uuid,
      version_label: singleLine(60),
      matchmaking_enabled: bool,
      crossplay_group: z.union([z.literal(""), z.string().regex(/^[a-z0-9-]{2,40}$/, "Groupe : minuscules, chiffres, tirets.")]).transform((v) => (v === "" ? null : v)),
      notes: plainText(500),
    })
    .safeParse({ ...fields(form), matchmaking_enabled: form.get("matchmaking_enabled") ?? "" });
  if (!parsed.success) back("/admin/contenu/jeux", { error: parsed.error.issues[0].message });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id
    ? await admin.from("game_platforms").update(row).eq("id", id).select("id").single()
    : await admin.from("game_platforms").insert(row).select("id").single();
  if (error) back("/admin/contenu/jeux", { error: dbMessage(error) });
  await audit(staff.id, id ? "game_platform.update" : "game_platform.create", "game_platform", data!.id, { matchmaking: row.matchmaking_enabled });
  back("/admin/contenu/jeux", { ok: "Combinaison enregistrée." });
}

// ------------------------------------------------------------------ Médias
const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadMediaAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      bucket: z.enum(["public-media", "game-media"]),
      alt_text: plainText(300),
      source: singleLine(500, 2),
      author: singleLine(200, 2),
      license: singleLine(200, 2),
      usage_justification: plainText(1000),
      is_ai_generated: bool,
    })
    .safeParse({ ...fields(form), is_ai_generated: form.get("is_ai_generated") ?? "" });
  if (!parsed.success) back("/admin/contenu/medias", { error: parsed.error.issues[0].message });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) back("/admin/contenu/medias", { error: "Choisis un fichier." });
  let processed;
  try {
    processed = await reencodeImage(Buffer.from(await (file as File).arrayBuffer()), {
      maxBytes: MEDIA_MAX_BYTES,
      maxSide: 6000,
      minSide: 200,
      output: { width: 1920, height: 1920, fit: "inside" },
      quality: 84,
    });
  } catch (e) {
    if (e instanceof ImageRejectedError) back("/admin/contenu/medias", { error: e.message });
    throw e;
  }
  const admin = createAdminClient();
  // Nom généré aléatoirement : il ne révèle ni le contenu ni la réponse.
  const path = `${new Date().getUTCFullYear()}/${randomUUID()}.webp`;
  const { error: upErr } = await admin.storage.from(parsed.data.bucket).upload(path, processed.buffer, { contentType: "image/webp", upsert: false });
  if (upErr) back("/admin/contenu/medias", { error: "Envoi impossible vers le stockage." });
  const { data, error } = await admin
    .from("media_assets")
    .insert({
      ...parsed.data,
      path,
      mime_type: "image/webp",
      width: processed.width,
      height: processed.height,
      bytes: processed.buffer.byteLength,
      validation_status: "pending",
      created_by: staff.id,
    })
    .select("id")
    .single();
  if (error) {
    await admin.storage.from(parsed.data.bucket).remove([path]);
    back("/admin/contenu/medias", { error: dbMessage(error) });
  }
  await audit(staff.id, "media.upload", "media", data!.id, { bucket: parsed.data.bucket });
  back("/admin/contenu/medias", { ok: "Média importé. Vérifie sa provenance puis valide-le." });
}

export async function reviewMediaAction(form: FormData) {
  const staff = await assertStaff("admin");
  const id = uuid.parse(form.get("id"));
  const decision = z.enum(["approved", "rejected", "pending"]).parse(form.get("decision"));
  const { error } = await createAdminClient()
    .from("media_assets")
    .update({ validation_status: decision, validated_by: decision === "pending" ? null : staff.id, validated_at: decision === "pending" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) back("/admin/contenu/medias", { error: dbMessage(error) });
  await audit(staff.id, `media.${decision}`, "media", id);
  back("/admin/contenu/medias", { ok: decision === "approved" ? "Média validé." : decision === "rejected" ? "Média refusé." : "Média remis en attente." });
}

// ------------------------------------------------------------------ Véhicules, propriétés
const CATEGORIES = ["sport", "super", "muscle", "classique", "tout_terrain", "berline", "suv", "compacte", "moto", "utilitaire", "autre"] as const;
const PRICE_TYPES = ["standard", "promo", "echange"] as const;

export async function saveVehicleAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      id: optionalUuid,
      game_id: uuid,
      slug,
      name: singleLine(80, 1),
      manufacturer: singleLine(60),
      category: z.enum(CATEGORIES),
      game_price: optionalInt,
      game_price_type: z.union([z.literal(""), z.enum(PRICE_TYPES)]).transform((v) => (v === "" ? null : v)),
      game_price_note: singleLine(200),
      price_source: z.string().trim().max(500).transform((v) => (v === "" ? null : v)),
      price_verified_at: dateField,
      garage_cost: intField(1, 100_000_000),
      image_id: optionalUuid,
    })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/vehicules", { error: `${parsed.error.issues[0].path.join(".")} : ${parsed.error.issues[0].message}` });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id ? await admin.from("vehicles").update(row).eq("id", id).select("id").single() : await admin.from("vehicles").insert(row).select("id").single();
  if (error) back(`/admin/contenu/vehicules${id ? `?modifier=${id}` : ""}`, { error: dbMessage(error) });
  await audit(staff.id, id ? "vehicle.update" : "vehicle.create", "vehicle", data!.id);
  back("/admin/contenu/vehicules", { ok: "Véhicule enregistré." });
}

export async function savePropertyAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      id: optionalUuid,
      game_id: uuid,
      slug,
      name: singleLine(80, 1),
      kind: z.enum(["appartement", "maison", "garage", "bureau", "entreprise", "club", "autre"]),
      location_label: singleLine(80),
      game_price: z.coerce.number().int().min(0).max(1e13),
      game_price_type: z.enum(PRICE_TYPES),
      game_price_note: singleLine(200),
      price_source: singleLine(500, 2),
      price_verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de vérification requise."),
      image_id: optionalUuid,
    })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/proprietes", { error: `${parsed.error.issues[0].path.join(".")} : ${parsed.error.issues[0].message}` });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id ? await admin.from("properties").update(row).eq("id", id).select("id").single() : await admin.from("properties").insert(row).select("id").single();
  if (error) back("/admin/contenu/proprietes", { error: dbMessage(error) });
  await audit(staff.id, id ? "property.update" : "property.create", "property", data!.id);
  back("/admin/contenu/proprietes", { ok: "Propriété enregistrée." });
}

// ------------------------------------------------------------------ Cartes et lieux
export async function saveMapAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      id: optionalUuid,
      game_id: uuid,
      name: singleLine(80, 2),
      image_id: optionalUuid,
      width: z.coerce.number().positive().max(1e7),
      height: z.coerce.number().positive().max(1e7),
      scale_verified: bool,
      meters_per_unit: z.union([z.literal(""), z.coerce.number().positive()]).transform((v) => (v === "" ? null : v)),
      scale_source: z.string().trim().max(500).transform((v) => (v === "" ? null : v)),
    })
    .safeParse({ ...fields(form), scale_verified: form.get("scale_verified") ?? "" });
  if (!parsed.success) back("/admin/contenu/cartes", { error: parsed.error.issues[0].message });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id ? await admin.from("game_maps").update(row).eq("id", id).select("id").single() : await admin.from("game_maps").insert(row).select("id").single();
  if (error) back("/admin/contenu/cartes", { error: dbMessage(error) });
  await audit(staff.id, id ? "map.update" : "map.create", "map", data!.id);
  back("/admin/contenu/cartes", { ok: "Carte enregistrée." });
}

export async function saveLocationAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      id: optionalUuid,
      map_id: uuid,
      name: singleLine(120, 2),
      description: plainText(500),
      screenshot_id: optionalUuid,
      x: z.coerce.number().min(0),
      y: z.coerce.number().min(0),
      difficulty: intField(1, 3),
    })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/cartes", { error: parsed.error.issues[0].message });
  const { id, ...row } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = id ? await admin.from("geo_locations").update(row).eq("id", id).select("id").single() : await admin.from("geo_locations").insert(row).select("id").single();
  if (error) back("/admin/contenu/cartes", { error: dbMessage(error) });
  await audit(staff.id, id ? "location.update" : "location.create", "geo_location", data!.id);
  back("/admin/contenu/cartes", { ok: "Lieu enregistré." });
}

// ------------------------------------------------------------------ Voiture mystère
const hintsSchema = z
  .string()
  .transform((s) => s.split("\n").map((h) => h.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(160, "Indice trop long (160 caractères).")).max(5, "5 indices maximum."));

export async function createMysteryAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      vehicle_id: uuid,
      source_media_id: uuid,
      focus_x: z.coerce.number().min(0).max(100),
      focus_y: z.coerce.number().min(0).max(100),
      hints: hintsSchema,
    })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/mystere", { error: parsed.error.issues[0].message });
  const admin = createAdminClient();
  const { data: media } = await admin.from("media_assets").select("bucket, path").eq("id", parsed.data.source_media_id).maybeSingle();
  if (!media || media.bucket !== "game-media") back("/admin/contenu/mystere", { error: "La source doit être un média du stockage privé (game-media)." });
  const { data: file } = await admin.storage.from("game-media").download(media!.path);
  if (!file) back("/admin/contenu/mystere", { error: "Image source introuvable." });
  const { stages, reveal } = await buildMysteryVariants(Buffer.from(await file!.arrayBuffer()), { x: parsed.data.focus_x / 100, y: parsed.data.focus_y / 100 });
  const paths: string[] = [];
  for (const buf of [...stages, reveal]) {
    const path = `mystery/${randomUUID()}.webp`;
    const { error } = await admin.storage.from("game-media").upload(path, buf, { contentType: "image/webp" });
    if (error) {
      await admin.storage.from("game-media").remove(paths);
      back("/admin/contenu/mystere", { error: "Génération des variantes impossible." });
    }
    paths.push(path);
  }
  const { data, error } = await admin
    .from("mystery_puzzles")
    .insert({ vehicle_id: parsed.data.vehicle_id, source_media_id: parsed.data.source_media_id, stage_paths: paths.slice(0, 6), reveal_path: paths[6], hints: parsed.data.hints })
    .select("id")
    .single();
  if (error) {
    await admin.storage.from("game-media").remove(paths);
    back("/admin/contenu/mystere", { error: dbMessage(error) });
  }
  await audit(staff.id, "mystery.create", "mystery_puzzle", data!.id);
  back("/admin/contenu/mystere", { ok: "Voiture mystère créée en brouillon (6 variantes générées)." });
}

export async function updateMysteryHintsAction(form: FormData) {
  const staff = await assertStaff("admin");
  const id = uuid.parse(form.get("id"));
  const hints = hintsSchema.safeParse(form.get("hints") ?? "");
  if (!hints.success) back("/admin/contenu/mystere", { error: hints.error.issues[0].message });
  const { error } = await createAdminClient().from("mystery_puzzles").update({ hints: hints.data }).eq("id", id);
  if (error) back("/admin/contenu/mystere", { error: dbMessage(error) });
  await audit(staff.id, "mystery.update", "mystery_puzzle", id);
  back("/admin/contenu/mystere", { ok: "Indices mis à jour." });
}

// ------------------------------------------------------------------ GTA ou réalité ?
export async function saveRealityAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({ id: optionalUuid, media_id: uuid, answer: z.enum(["gta", "reality"]), explanation: plainText(1000, 10), game_id: optionalUuid })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/contenu/realite", { error: parsed.error.issues[0].message });
  const admin = createAdminClient();
  // Jamais d'image générée par IA présentée comme une photo réelle.
  const { data: media } = await admin.from("media_assets").select("bucket, is_ai_generated").eq("id", parsed.data.media_id).maybeSingle();
  if (!media || media.bucket !== "game-media") back("/admin/contenu/realite", { error: "L'image doit être dans le stockage privé (game-media)." });
  if (media!.is_ai_generated && parsed.data.answer === "reality") back("/admin/contenu/realite", { error: "Une image générée par IA ne peut pas être présentée comme une photo réelle." });
  const { id, ...row } = parsed.data;
  const { data, error } = id ? await admin.from("reality_items").update(row).eq("id", id).select("id").single() : await admin.from("reality_items").insert(row).select("id").single();
  if (error) back("/admin/contenu/realite", { error: dbMessage(error) });
  await audit(staff.id, id ? "reality.update" : "reality.create", "reality_item", data!.id);
  back("/admin/contenu/realite", { ok: "Image enregistrée." });
}

// ------------------------------------------------------------------ Défis du jour
const ROUNDS: Record<string, number> = { where: 5, mystery: 1, higher_lower: 10, reality: 10 };

export async function createChallengeAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({
      challenge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      game_kind: z.enum(["where", "mystery", "higher_lower", "reality"]),
      title: singleLine(80),
    })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/defis", { error: parsed.error.issues[0].message });
  if (parsed.data.challenge_date < parisDate()) back("/admin/defis", { error: "La date est déjà passée." });
  const { data, error } = await createAdminClient()
    .from("daily_challenges")
    .insert({ ...parsed.data, round_count: ROUNDS[parsed.data.game_kind], created_by: staff.id })
    .select("id")
    .single();
  if (error) back("/admin/defis", { error: error.code === "23505" ? "Un défi existe déjà à cette date." : dbMessage(error) });
  await audit(staff.id, "challenge.create", "daily_challenge", data!.id, parsed.data);
  back(`/admin/defis/${data!.id}`, { ok: "Défi créé en brouillon. Choisis son contenu." });
}

/** Tire au hasard le contenu publié du défi (remplace les manches existantes). */
export async function drawChallengeItemsAction(form: FormData) {
  const staff = await assertStaff("admin");
  const id = uuid.parse(form.get("id"));
  const admin = createAdminClient();
  const { data: ch } = await admin.from("daily_challenges").select("id, game_kind, round_count, status").eq("id", id).maybeSingle();
  if (!ch) back("/admin/defis", { error: "Défi introuvable." });
  if (ch!.status === "published") back(`/admin/defis/${id}`, { error: DB_ERRORS.challenge_published_locked });
  let items: { ref_type: string; ref_id: string; ref_b_type?: string | null; ref_b_id?: string | null }[] = [];
  try {
    if (ch!.game_kind === "higher_lower") {
      const used: string[] = [];
      for (let i = 0; i < ch!.round_count; i++) {
        const pair = await pickPricePair(admin, used);
        if (!pair) break;
        used.push(pair.ref_id, pair.ref_b_id ?? "");
        items.push(pair);
      }
    } else {
      items = await pickTrainingRounds(admin, ch!.game_kind as "where" | "mystery" | "reality", ch!.round_count);
    }
  } catch {
    items = [];
  }
  if (items.length !== ch!.round_count) back(`/admin/defis/${id}`, { error: "Pas assez de contenu publié pour remplir ce défi." });
  await admin.from("daily_challenge_items").delete().eq("challenge_id", id);
  const { error } = await admin.from("daily_challenge_items").insert(
    items.map((it, i) => ({ challenge_id: id, position: i + 1, ref_type: it.ref_type, ref_id: it.ref_id, ref_b_type: it.ref_b_type ?? null, ref_b_id: it.ref_b_id ?? null })),
  );
  if (error) back(`/admin/defis/${id}`, { error: dbMessage(error) });
  await audit(staff.id, "challenge.draw", "daily_challenge", id);
  back(`/admin/defis/${id}`, { ok: "Contenu tiré au sort. Vérifie-le avant publication." });
}

export async function setChallengeStatusAction(form: FormData) {
  const staff = await assertStaff("admin");
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["draft", "published"]).parse(form.get("status"));
  const { error } = await createAdminClient().from("daily_challenges").update({ status }).eq("id", id);
  if (error) back(`/admin/defis/${id}`, { error: dbMessage(error) });
  await audit(staff.id, `challenge.${status}`, "daily_challenge", id);
  revalidatePath("/", "layout");
  back(`/admin/defis/${id}`, { ok: status === "published" ? "Défi publié." : "Défi repassé en brouillon." });
}

export async function deleteChallengeAction(form: FormData) {
  const staff = await assertStaff("admin");
  const id = uuid.parse(form.get("id"));
  const admin = createAdminClient();
  const { data: ch } = await admin.from("daily_challenges").select("status").eq("id", id).maybeSingle();
  if (ch?.status !== "draft") back(`/admin/defis/${id}`, { error: "Seul un défi en brouillon peut être supprimé." });
  const { error } = await admin.from("daily_challenges").delete().eq("id", id);
  if (error) back(`/admin/defis/${id}`, { error: dbMessage(error) });
  await audit(staff.id, "challenge.delete", "daily_challenge", id);
  back("/admin/defis", { ok: "Défi supprimé." });
}

// ------------------------------------------------------------------ Paramètres
export async function saveSettingsAction(form: FormData) {
  const staff = await assertStaff("admin");
  const parsed = z
    .object({ garage_budget: intField(100_000, 1_000_000_000), garage_max_vehicles: intField(1, 10), garage_max_per_user: intField(1, 50) })
    .safeParse(fields(form));
  if (!parsed.success) back("/admin/parametres", { error: parsed.error.issues[0].message });
  const admin = createAdminClient();
  for (const [key, value] of Object.entries(parsed.data)) {
    await admin.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
  }
  await audit(staff.id, "settings.update", "app_settings", "garage", parsed.data);
  revalidatePath("/", "layout");
  back("/admin/parametres", { ok: "Paramètres enregistrés." });
}
