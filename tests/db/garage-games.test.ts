import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, deleteCreatedUsers, errText, type TestUser } from "./helpers";

let u: TestUser;
let other: TestUser;
let gameId: string;
const cheap: string[] = [];
let pricey: string;
let draft: string;

async function settingInt(key: string) {
  const { data } = await admin.from("app_settings").select("value").eq("key", key).single();
  return Number(data!.value);
}

beforeAll(async () => {
  [u, other] = await Promise.all([createUser("garU"), createUser("garO")]);
  const tag = randomUUID().slice(0, 6);
  const g = await admin.from("games").insert({ slug: `test-${tag}`, name: `Jeu test ${tag}`, short_name: "Test", status: "published" } as never).select("id").single();
  if (g.error) throw g.error;
  gameId = g.data.id;
  const budget = await settingInt("garage_budget");
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => ({ slug: `cheap-${tag}-${i}`, name: `Cheap ${i}`, garage_cost: 1000, status: "published" })),
    { slug: `pricey-${tag}`, name: "Pricey", garage_cost: budget - 1500, status: "published" },
    { slug: `draft-${tag}`, name: "Draft", garage_cost: 1000, status: "draft" },
  ].map((r) => ({ ...r, game_id: gameId, category: "sport" }));
  const v = await admin.from("vehicles").insert(rows as never).select("id, slug");
  if (v.error) throw v.error;
  for (const row of v.data) {
    if (row.slug.startsWith("cheap")) cheap.push(row.id);
    else if (row.slug.startsWith("pricey")) pricey = row.id;
    else draft = row.id;
  }
});

afterAll(async () => {
  await deleteCreatedUsers();
  await admin.from("vehicles").delete().eq("game_id", gameId);
  await admin.from("games").delete().eq("id", gameId);
});

const save = (c: TestUser, ids: string[], visibility = "private", garage: string | null = null) =>
  c.client.rpc("save_garage", { p_garage: garage as never, p_name: "Test", p_description: "", p_visibility: visibility, p_vehicle_ids: ids });

describe("Garage : limites vérifiées en base", () => {
  it("accepte un garage dans les limites", async () => {
    const max = await settingInt("garage_max_vehicles");
    const { error } = await save(u, cheap.slice(0, max));
    expect(error).toBeNull();
  });
  it("refuse un véhicule de trop", async () => {
    const max = await settingInt("garage_max_vehicles");
    expect(errText((await save(u, cheap.slice(0, max + 1))).error)).toMatch(/garage_full/);
  });
  it("refuse un dépassement de budget", async () => {
    expect(errText((await save(u, [pricey, cheap[0], cheap[1]])).error)).toMatch(/garage_over_budget/);
  });
  it("refuse un véhicule non publié et les doublons", async () => {
    expect(errText((await save(u, [draft])).error)).toMatch(/vehicle_unavailable/);
    expect((await save(u, [cheap[0], cheap[0]])).error).not.toBeNull();
  });
  it("refuse de modifier le garage d'un autre", async () => {
    const mine = await save(u, [cheap[0]], "public");
    expect(mine.error).toBeNull();
    const garageId = mine.data as unknown as string;
    expect((await save(other, [cheap[1]], "public", garageId)).error).not.toBeNull();
    // Insertion directe dans le garage d'un autre : refusée.
    expect((await other.client.from("garage_vehicles").insert({ garage_id: garageId, vehicle_id: cheap[2], position: 2 } as never)).error?.code).toBe("42501");
    // Un garage public est lisible par un visiteur.
    expect((await anon().from("garages").select("id").eq("id", garageId)).data).toHaveLength(1);
  });
});

describe("Moteur de jeu : écriture des réponses", () => {
  async function newSession(mode: "training" | "daily" = "training") {
    const s = await admin
      .from("game_sessions")
      .insert({ game_kind: "reality", mode, user_id: u.id, total_rounds: 1, max_score: 100, expires_at: new Date(Date.now() + 3600_000).toISOString() } as never)
      .select("id")
      .single();
    if (s.error) throw s.error;
    const r = await admin.from("game_rounds").insert({ session_id: s.data.id, position: 1, ref_type: "reality_item", ref_id: randomUUID() } as never);
    if (r.error) throw r.error;
    return s.data.id as string;
  }
  const commit = (session: string, score = 100, expected = 0) =>
    admin.rpc("game_commit_answer", {
      p_session: session,
      p_position: 1,
      p_expected_attempts: expected,
      p_answer: { choice: "gta" },
      p_result: { correct: true },
      p_round_score: score,
      p_round_complete: true,
      p_session_complete: true,
      p_next_round: null as never,
      p_share_text: "",
    });

  it("refuse un score hors barème", async () => {
    const s = await newSession();
    expect(errText((await commit(s, 5000)).error)).toMatch(/invalid_score/);
  });

  it("deux réponses simultanées à la même manche : une seule est retenue", async () => {
    const s = await newSession();
    const results = await Promise.all([commit(s), commit(s), commit(s)]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    const { data } = await admin.from("game_sessions").select("score, status").eq("id", s).single();
    expect(data).toEqual({ score: 100, status: "finished" });
    const { count } = await admin.from("game_results").select("session_id", { count: "exact", head: true }).eq("session_id", s);
    expect(count).toBe(1);
  });

  it("une partie terminée ne peut pas être rejouée", async () => {
    const s = await newSession();
    expect((await commit(s)).error).toBeNull();
    expect(errText((await commit(s)).error)).toMatch(/session_closed/);
  });
});
