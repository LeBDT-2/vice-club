import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "user" | "moderator" | "admin";

export type Viewer = {
  id: string;
  email: string | null;
  aal: "aal1" | "aal2";
  role: AppRole;
  username: string | null;
  avatarPath: string | null;
  sanction: { kind: "suspension" | "ban"; endsAt: string | null; reason: string } | null;
};

/**
 * Data Access Layer : lit et VÉRIFIE la session (signature du JWT via getClaims),
 * puis charge le rôle, le profil et les sanctions actives. Mis en cache pour la requête.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const claims = data.claims;
  const id = claims.sub;

  const nowIso = new Date().toISOString();
  const [profileRes, roleRes, sanctionRes] = await Promise.all([
    supabase.from("profiles").select("username, avatar_path").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
    supabase
      .from("sanctions")
      .select("kind, ends_at, reason, starts_at")
      .eq("user_id", id)
      .is("revoked_at", null)
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // Profil absent : compte supprimé avec un jeton encore valide.
  if (!profileRes.data) return null;

  const s = sanctionRes.data?.[0];
  return {
    id,
    email: typeof claims.email === "string" ? claims.email : null,
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
    role: (roleRes.data?.role as AppRole | undefined) ?? "user",
    username: profileRes.data.username,
    avatarPath: profileRes.data.avatar_path,
    sanction: s ? { kind: s.kind as "suspension" | "ban", endsAt: s.ends_at, reason: s.reason } : null,
  };
});

function loginUrl(next: string) {
  return `/connexion?next=${encodeURIComponent(next)}`;
}

/** Page privée : exige une session valide. */
export async function requireUser(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(loginUrl(next));
  return viewer;
}

/** Exige un profil complété (pseudo choisi). */
export async function requireProfile(next: string): Promise<Viewer & { username: string }> {
  const viewer = await requireUser(next);
  if (!viewer.username) redirect(`/bienvenue?next=${encodeURIComponent(next)}`);
  return viewer as Viewer & { username: string };
}

/** Exige un compte non suspendu/banni (accès sensibles : messagerie, demandes…). */
export async function requireActive(next: string): Promise<Viewer & { username: string }> {
  const viewer = await requireProfile(next);
  if (viewer.sanction) redirect("/compte/restriction");
  return viewer;
}

export function roleAtLeast(role: AppRole, min: AppRole) {
  const order: AppRole[] = ["user", "moderator", "admin"];
  return order.indexOf(role) >= order.indexOf(min);
}

/** Back-office : rôle minimal + authentification renforcée (MFA, aal2). */
export async function requireStaff(min: "moderator" | "admin", next = "/admin"): Promise<Viewer> {
  const viewer = await requireUser(next);
  if (!roleAtLeast(viewer.role, min) || viewer.sanction) redirect("/acces-refuse");
  if (viewer.aal !== "aal2") redirect(`/compte/securite/mfa?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Variante pour Server Actions : lève une erreur au lieu de rediriger. */
export async function assertStaff(min: "moderator" | "admin"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !roleAtLeast(viewer.role, min) || viewer.sanction || viewer.aal !== "aal2") {
    throw new Error("forbidden");
  }
  return viewer;
}
