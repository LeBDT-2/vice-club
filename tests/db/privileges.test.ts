import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, deleteCreatedUsers, errText, type TestUser } from "./helpers";

let u: TestUser;
let target: TestUser;

beforeAll(async () => {
  [u, target] = await Promise.all([createUser("privU"), createUser("privT")]);
});
afterAll(deleteCreatedUsers);

describe("Rôles et fonctions réservées", () => {
  it("un utilisateur ne peut pas s'attribuer un rôle", async () => {
    const ins = await u.client.from("user_roles").insert({ user_id: u.id, role: "admin" } as never);
    expect(ins.error?.code).toBe("42501");
    const rpc = await u.client.rpc("admin_set_role", { p_user: u.id, p_role: "admin", p_reason: "test" });
    expect(rpc.error).not.toBeNull();
    const { data } = await admin.from("user_roles").select("role").eq("user_id", u.id).maybeSingle();
    expect(data?.role ?? "user").toBe("user");
  });

  it("un utilisateur ne peut pas modifier les colonnes de modération de son profil", async () => {
    const res = await u.client.from("profiles").update({ hidden_at: null, hidden_reason: "x" } as never).eq("id", u.id);
    expect(res.error?.code).toBe("42501");
  });

  it("les outils de modération exigent le rôle et la MFA", async () => {
    for (const [fn, args] of [
      ["mod_list_reports", { p_status: "open", p_limit: 10, p_offset: 0 }],
      ["mod_search_users", { p_query: "T_", p_limit: 5 }],
      ["mod_user_detail", { p_user: target.id }],
      ["mod_sanction_user", { p_user: target.id, p_kind: "ban", p_reason: "test", p_duration_hours: null, p_report: null }],
      ["mod_set_profile_hidden", { p_user: target.id, p_hidden: true, p_reason: "test" }],
    ] as const) {
      const { error } = await u.client.rpc(fn as never, args as never);
      expect(error, fn).not.toBeNull();
    }
  });

  it("les fonctions de service sont inaccessibles avec la clé publique", async () => {
    for (const c of [anon(), u.client]) {
      for (const [fn, args] of [
        ["run_maintenance", {}],
        ["demo_content_report", {}],
        ["consume_rate_limit", { p_bucket: "x", p_max: 1, p_window_seconds: 60 }],
        ["write_audit", { p_actor: u.id, p_action: "x", p_target_type: "x", p_target_id: "x", p_metadata: {} }],
        [
          "game_commit_answer",
          {
            p_session: u.id,
            p_position: 1,
            p_expected_attempts: 0,
            p_answer: {},
            p_result: {},
            p_round_score: 5000,
            p_round_complete: true,
            p_session_complete: true,
          },
        ],
      ] as const) {
        const { error } = await c.rpc(fn as never, args as never);
        expect(errText(error), fn).toMatch(/permission denied|not find|Could not find/i);
      }
    }
  });

  it("les messages de contact et le journal d'audit ne sont pas lisibles", async () => {
    for (const c of [anon(), u.client]) {
      expect((await c.from("contact_messages").select("id")).error).not.toBeNull();
      expect((await c.from("contact_messages").insert({ category: "autre", subject: "abc", body: "0123456789", reply_email: "a@b.test" })).error).not.toBeNull();
      const audit = await c.from("audit_log").select("id").limit(1);
      expect(audit.data ?? []).toHaveLength(0);
    }
  });

  it("aucun score ne peut être écrit directement", async () => {
    const res = await u.client.from("game_results").insert({
      session_id: u.id,
      user_id: u.id,
      game_kind: "reality",
      mode: "daily",
      ranked: true,
      score: 1000,
      max_score: 1000,
    } as never);
    expect(res.error?.code).toBe("42501");
    const ses = await u.client.from("game_sessions").insert({ game_kind: "reality", mode: "training", user_id: u.id } as never);
    expect(ses.error?.code).toBe("42501");
    const upd = await u.client.from("game_sessions").update({ score: 999999 } as never).eq("user_id", u.id);
    expect(upd.error?.code).toBe("42501");
  });
});

describe("Comptes sanctionnés", () => {
  it("un compte suspendu ne peut plus contacter ni publier", async () => {
    const s = await admin
      .from("sanctions")
      .insert({ user_id: u.id, kind: "suspension", reason: "Test automatisé", ends_at: new Date(Date.now() + 3600_000).toISOString() } as never)
      .select("id")
      .single();
    expect(s.error).toBeNull();
    const req = await u.client.rpc("send_contact_request", { p_recipient: target.id, p_message: "" });
    expect(errText(req.error)).toMatch(/account_restricted/);
    const g = await u.client.rpc("save_garage", { p_garage: null as never, p_name: "x", p_description: "", p_visibility: "private", p_vehicle_ids: [] });
    expect(errText(g.error)).toMatch(/account_restricted/);
    const handle = await u.client.from("profile_handles").insert({ profile_id: u.id, network: "psn", handle: "Suspendu", visibility: "public" });
    expect(handle.error).not.toBeNull();
  });
});
