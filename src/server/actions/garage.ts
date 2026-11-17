"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActive, requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, formToObject, zodFieldErrors } from "@/lib/validation/common";
import { garageSchema } from "@/lib/validation/garage";

const ERRORS: Record<string, string> = {
  garage_limit_reached: "Tu as atteint le nombre maximal de garages. Supprimes-en un pour en créer un nouveau.",
  garage_full: "Un garage contient au maximum 5 véhicules.",
  garage_over_budget: "Ce garage dépasse le budget fictif. Retire un véhicule ou choisis-en un moins cher.",
  vehicle_unavailable: "Un des véhicules n'est plus disponible dans le catalogue.",
  duplicate_vehicle: "Un véhicule ne peut apparaître qu'une fois.",
  account_restricted: "Ton compte est restreint : cette action n'est pas disponible.",
  rate_limited: "Tu enregistres trop vite. Patiente une minute.",
  not_found: "Garage introuvable.",
};

/**
 * Enregistre un garage. Le budget, la limite de 5 véhicules, l'unicité et la
 * propriété sont vérifiés par la base (déclencheurs + RLS), quel que soit le client.
 */
export async function saveGarageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireActive("/mon-garage");
  const parsed = garageSchema.safeParse(formToObject(form, ["vehicle_ids"]));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error), message: "Vérifie les champs signalés." };
  const { garage_id, name, description, visibility, vehicle_ids } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_garage", {
    p_garage: garage_id as unknown as string, // null = création
    p_name: name,
    p_description: description,
    p_visibility: visibility,
    p_vehicle_ids: vehicle_ids,
  });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { ok: false, message: key ? ERRORS[key] : "L'enregistrement a échoué. Réessaie dans un instant." };
  }
  revalidatePath("/mon-garage");
  redirect(`/mon-garage/${data}?enregistre=1`);
}

export async function deleteGarageAction(form: FormData) {
  const viewer = await requireUser("/mon-garage");
  const id = z.uuid().parse(form.get("garage_id"));
  const supabase = await createClient();
  await supabase.from("garages").delete().eq("id", id).eq("owner_id", viewer.id);
  revalidatePath("/mon-garage");
  redirect("/mon-garage?supprime=1");
}
