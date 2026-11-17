import { Client } from "pg";

/**
 * Remet à zéro les compteurs anti-abus de la base LOCALE avant la suite, pour que des
 * exécutions successives ne se bloquent pas sur les limites de connexion (30 / 10 min / IP).
 * Les limites elles-mêmes ne sont pas modifiées.
 */
export default async function setup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  if (!/@(127\.0\.0\.1|localhost):/.test(url)) throw new Error("La remise à zéro des compteurs n'est autorisée que sur une base locale.");
  const db = new Client({ connectionString: url });
  await db.connect();
  await db.query("delete from private.rate_limits");
  await db.end();
}
