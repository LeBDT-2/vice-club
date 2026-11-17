import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimits, RateLimitError } from "@/lib/security/rate-limit";

/**
 * Export RGPD des données personnelles de l'utilisateur connecté (JSON).
 * Toutes les lectures passent par le client utilisateur : la RLS garantit qu'on
 * n'exporte que ce que la personne a le droit de voir.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  try {
    await enforceRateLimits([{ key: `export:user:${viewer.id}`, max: 5, windowSeconds: 3600 }]);
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "trop_de_demandes" }, { status: 429 });
    throw e;
  }
  const supabase = await createClient();
  const uid = viewer.id;
  const [profile, priv, role, games, handles, availability, garages, results, badges, requests, conversations, messages, notifications, reports, blocks, sanctions] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase.from("profile_private").select("*").eq("id", uid).single(),
      supabase.from("user_roles").select("role, granted_at").eq("user_id", uid).maybeSingle(),
      supabase.from("profile_games").select("game_platform_id, created_at").eq("profile_id", uid),
      supabase.from("profile_handles").select("network, handle, visibility, created_at").eq("profile_id", uid),
      supabase.from("availabilities").select("*").eq("profile_id", uid),
      supabase.from("garages").select("id, name, description, visibility, share_slug, created_at, updated_at, garage_vehicles(vehicle_id, position)").eq("owner_id", uid),
      supabase.from("game_results").select("*").eq("user_id", uid),
      supabase.from("user_badges").select("badge_slug, awarded_at").eq("user_id", uid),
      supabase.from("contact_requests").select("*").or(`sender_id.eq.${uid},recipient_id.eq.${uid}`),
      supabase.from("conversation_participants").select("conversation_id, last_read_at").eq("user_id", uid),
      supabase.from("messages").select("id, conversation_id, sender_id, body, created_at, hidden_at").order("id"),
      supabase.from("notifications").select("kind, payload, read_at, created_at").eq("user_id", uid),
      supabase.from("reports").select("target_type, target_id, reason, details, status, created_at").eq("reporter_id", uid),
      supabase.from("blocks").select("blocked_id, created_at").eq("blocker_id", uid),
      supabase.from("sanctions").select("kind, reason, starts_at, ends_at, revoked_at").eq("user_id", uid),
    ]);

  const payload = {
    format: "vice-club-export-v1",
    generated_at: new Date().toISOString(),
    account: { id: uid, email: viewer.email },
    profile: profile.data,
    private: priv.data,
    role: role.data ?? { role: "user" },
    games: games.data,
    game_handles: handles.data,
    availability: availability.data,
    garages: garages.data,
    game_results: results.data,
    badges: badges.data,
    contact_requests: requests.data,
    conversations: conversations.data,
    messages: messages.data,
    notifications: notifications.data,
    reports_sent: reports.data,
    blocked_users: blocks.data,
    sanctions: sanctions.data,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vice-club-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
