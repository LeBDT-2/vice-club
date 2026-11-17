import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, createUser, deleteCreatedUsers, errText, type TestUser } from "./helpers";

let a: TestUser;
let b: TestUser;
let c: TestUser;
let conversation: string;

beforeAll(async () => {
  [a, b, c] = await Promise.all([createUser("socA"), createUser("socB"), createUser("socC")]);
});
afterAll(deleteCreatedUsers);

describe("Demandes de contact et messagerie", () => {
  it("aucune conversation n'existe avant acceptation", async () => {
    const req = await a.client.rpc("send_contact_request", { p_recipient: b.id, p_message: "Partant ce soir ?" });
    expect(req.error).toBeNull();
    const conv = await a.client.rpc("my_conversations", { p_limit: 10, p_offset: 0 });
    expect(conv.data ?? []).toHaveLength(0);
    const dup = await a.client.rpc("send_contact_request", { p_recipient: b.id, p_message: "" });
    expect(errText(dup.error)).toMatch(/request_already_pending/);
    // C ne voit pas la demande entre A et B.
    expect((await c.client.from("contact_requests").select("id").eq("id", req.data!)).data ?? []).toHaveLength(0);
    // A ne peut pas accepter sa propre demande.
    expect((await a.client.rpc("respond_contact_request", { p_request: req.data!, p_accept: true })).error).not.toBeNull();
    const ok = await b.client.rpc("respond_contact_request", { p_request: req.data!, p_accept: true });
    expect(ok.error).toBeNull();
    conversation = ok.data!;
    expect(conversation).toBeTruthy();
  });

  it("les participants échangent, un tiers ne lit ni n'écrit", async () => {
    const sent = await a.client.rpc("send_message", { p_conversation: conversation, p_body: "Salut B" });
    expect(sent.error).toBeNull();
    expect((await b.client.from("messages").select("body").eq("conversation_id", conversation)).data?.map((m) => m.body)).toEqual(["Salut B"]);
    expect((await c.client.from("messages").select("id").eq("conversation_id", conversation)).data ?? []).toHaveLength(0);
    expect((await c.client.rpc("send_message", { p_conversation: conversation, p_body: "intrus" })).error).not.toBeNull();
    // Insertion directe interdite : tout passe par la fonction contrôlée.
    expect((await a.client.from("messages").insert({ conversation_id: conversation, sender_id: a.id, body: "direct" } as never)).error?.code).toBe("42501");
  });

  it("les messages vides ou trop longs sont refusés", async () => {
    expect((await a.client.rpc("send_message", { p_conversation: conversation, p_body: "   " })).error).not.toBeNull();
    expect((await a.client.rpc("send_message", { p_conversation: conversation, p_body: "x".repeat(2001) })).error).not.toBeNull();
  });

  it("un signalement de message est possible pour un participant uniquement", async () => {
    const { data: msg } = await admin.from("messages").select("id").eq("conversation_id", conversation).limit(1).single();
    const byB = await b.client.rpc("report_content", { p_target_type: "message", p_target_id: String(msg!.id), p_reason: "spam", p_details: "" });
    expect(byB.error).toBeNull();
    const byC = await c.client.rpc("report_content", { p_target_type: "message", p_target_id: String(msg!.id), p_reason: "spam", p_details: "" });
    expect(byC.error).not.toBeNull();
    const self = await a.client.rpc("report_content", { p_target_type: "profile", p_target_id: a.id, p_reason: "spam", p_details: "" });
    expect(errText(self.error)).toMatch(/cannot_report_self/);
  });

  it("le blocage ferme la conversation et empêche toute nouvelle demande", async () => {
    expect((await b.client.rpc("block_user", { p_user: a.id })).error).toBeNull();
    expect(errText((await a.client.rpc("send_message", { p_conversation: conversation, p_body: "tu es là ?" })).error)).toMatch(/conversation_closed/);
    expect(errText((await b.client.rpc("send_message", { p_conversation: conversation, p_body: "non" })).error)).toMatch(/conversation_closed/);
    expect((await a.client.rpc("send_contact_request", { p_recipient: b.id, p_message: "" })).error).not.toBeNull();
    // A ne voit pas qui l'a bloqué.
    expect((await a.client.from("blocks").select("blocker_id").eq("blocked_id", a.id)).data ?? []).toHaveLength(0);
    // Déblocage : la conversation redevient possible.
    expect((await b.client.rpc("unblock_user", { p_user: a.id })).error).toBeNull();
    expect((await a.client.rpc("send_message", { p_conversation: conversation, p_body: "re" })).error).toBeNull();
  });

  it("une demande refusée bloque les relances immédiates", async () => {
    const req = await c.client.rpc("send_contact_request", { p_recipient: b.id, p_message: "" });
    expect(req.error).toBeNull();
    expect((await b.client.rpc("respond_contact_request", { p_request: req.data!, p_accept: false })).error).toBeNull();
    expect(errText((await c.client.rpc("send_contact_request", { p_recipient: b.id, p_message: "" })).error)).toMatch(/request_recently_declined/);
  });
});
