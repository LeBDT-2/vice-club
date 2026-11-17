import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, createUser, deleteCreatedUsers, errText, type TestUser } from "./helpers";

let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  [a, b] = await Promise.all([createUser("isoA"), createUser("isoB")]);
});
afterAll(deleteCreatedUsers);

describe("Isolation entre comptes (RLS)", () => {
  it("B ne lit ni les données privées de A ni ses notifications", async () => {
    await admin.from("notifications").insert({ user_id: a.id, kind: "system", payload: {} } as never);
    const priv = await b.client.from("profile_private").select("*").eq("id", a.id);
    expect(priv.data ?? []).toHaveLength(0);
    const notif = await b.client.from("notifications").select("id").eq("user_id", a.id);
    expect(notif.data ?? []).toHaveLength(0);
    const own = await a.client.from("profile_private").select("id").eq("id", a.id);
    expect(own.data).toHaveLength(1);
  });

  it("B ne peut pas modifier le profil de A", async () => {
    const { data } = await b.client.from("profiles").update({ bio: "piraté" }).eq("id", a.id).select("id");
    expect(data ?? []).toHaveLength(0);
    const check = await admin.from("profiles").select("bio").eq("id", a.id).single();
    expect(check.data?.bio).not.toBe("piraté");
  });

  it("un garage privé n'est visible que par son propriétaire", async () => {
    const { data: g, error } = await a.client.from("garages").insert({ owner_id: a.id, name: "Secret", visibility: "private" }).select("id").single();
    expect(error).toBeNull();
    expect((await b.client.from("garages").select("id").eq("id", g!.id)).data ?? []).toHaveLength(0);
    expect((await anon().from("garages").select("id").eq("id", g!.id)).data ?? []).toHaveLength(0);
    expect((await a.client.from("garages").select("id").eq("id", g!.id)).data).toHaveLength(1);
    // B ne peut ni le renommer ni le supprimer.
    expect((await b.client.from("garages").update({ name: "Volé" }).eq("id", g!.id).select("id")).data ?? []).toHaveLength(0);
    expect((await b.client.from("garages").delete().eq("id", g!.id).select("id")).data ?? []).toHaveLength(0);
  });

  it("un compte ne peut pas créer un garage au nom d'un autre", async () => {
    const { error } = await b.client.from("garages").insert({ owner_id: a.id, name: "Usurpé", visibility: "public" });
    expect(error?.code).toBe("42501");
  });

  it("les pseudos de plateformes respectent leur visibilité", async () => {
    await a.client.from("profile_handles").insert([
      { profile_id: a.id, network: "psn", handle: "A_public", visibility: "public" },
      { profile_id: a.id, network: "xbox", handle: "A_contacts", visibility: "contacts" },
      { profile_id: a.id, network: "steam", handle: "A_private", visibility: "private" },
    ]);
    const seen = async (c: ReturnType<typeof anon>) => ((await c.from("profile_handles").select("handle").eq("profile_id", a.id)).data ?? []).map((h) => h.handle).sort();
    expect(await seen(anon())).toEqual(["A_public"]);
    expect(await seen(b.client)).toEqual(["A_public"]);
    expect(await seen(a.client)).toEqual(["A_contacts", "A_private", "A_public"]);
  });

  it("un visiteur ne peut rien écrire", async () => {
    const v = anon();
    expect((await v.from("garages").insert({ owner_id: a.id, name: "x", visibility: "public" })).error?.code).toBe("42501");
    expect(errText((await v.rpc("send_contact_request", { p_recipient: a.id, p_message: "" })).error)).not.toBe("");
  });
});
