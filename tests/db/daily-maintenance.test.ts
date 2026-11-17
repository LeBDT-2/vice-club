import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, createUser, deleteCreatedUsers, type TestUser } from "./helpers";

let u: TestUser;
let challengeId: string;
const date = `2099-0${1 + Math.floor(Math.random() * 9)}-${String(10 + Math.floor(Math.random() * 18))}`;

beforeAll(async () => {
  u = await createUser("daily");
  const c = await admin.from("daily_challenges").insert({ challenge_date: date, game_kind: "reality", round_count: 1, status: "draft" } as never).select("id").single();
  if (c.error) throw c.error;
  challengeId = c.data.id;
});
afterAll(async () => {
  await deleteCreatedUsers();
  await admin.from("daily_challenges").delete().eq("id", challengeId);
});

describe("Défi du jour", () => {
  it("une seule partie classée par compte et par défi", async () => {
    const row = { game_kind: "reality", mode: "daily", user_id: u.id, challenge_id: challengeId, challenge_date: date, ranked: true, total_rounds: 1, max_score: 100, expires_at: new Date(Date.now() + 3600_000).toISOString() };
    expect((await admin.from("game_sessions").insert(row as never)).error).toBeNull();
    const second = await admin.from("game_sessions").insert(row as never);
    expect(second.error?.code).toBe("23505");
  });
  it("une partie d'invité ne peut jamais être classée", async () => {
    const res = await admin.from("game_sessions").insert({
      game_kind: "reality",
      mode: "daily",
      guest_token_hash: "x".repeat(43),
      challenge_id: challengeId,
      challenge_date: date,
      ranked: true,
      total_rounds: 1,
      max_score: 100,
    } as never);
    expect(res.error).not.toBeNull();
  });
});

describe("Conservation des données", () => {
  it("purge les parties d'invités anciennes et garde les récentes", async () => {
    const old = new Date(Date.now() - 40 * 86400_000).toISOString();
    const recent = new Date().toISOString();
    const ins = await admin
      .from("game_sessions")
      .insert([
        { game_kind: "reality", mode: "training", guest_token_hash: "old-guest-hash-for-test", status: "finished", started_at: old, expires_at: old },
        { game_kind: "reality", mode: "training", guest_token_hash: "new-guest-hash-for-test", status: "active", started_at: recent, expires_at: new Date(Date.now() + 3600_000).toISOString() },
      ] as never)
      .select("id, guest_token_hash");
    expect(ins.error).toBeNull();
    const { error } = await admin.rpc("run_maintenance");
    expect(error).toBeNull();
    const left = await admin.from("game_sessions").select("guest_token_hash").in("id", ins.data!.map((r) => r.id));
    expect(left.data?.map((r) => r.guest_token_hash)).toEqual(["new-guest-hash-for-test"]);
    await admin.from("game_sessions").delete().in("id", ins.data!.map((r) => r.id));
  });
});
