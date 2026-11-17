import { z } from "zod";
import { plainText, singleLine, uuid } from "./common";

export const GARAGE_MAX_VEHICLES = 5;

export const garageSchema = z.object({
  garage_id: z.union([uuid, z.literal("")]).transform((v) => (v === "" ? null : v)),
  name: singleLine(60, 1),
  description: plainText(500),
  visibility: z.enum(["private", "public"]),
  vehicle_ids: z
    .array(uuid)
    .max(GARAGE_MAX_VEHICLES, `${GARAGE_MAX_VEHICLES} véhicules maximum.`)
    .refine((ids) => new Set(ids).size === ids.length, "Un véhicule ne peut apparaître qu'une fois."),
});

/** Calcul indicatif côté client ; le serveur et la base revérifient toujours. */
export function garageTotal(costs: number[]) {
  return costs.reduce((a, b) => a + b, 0);
}
