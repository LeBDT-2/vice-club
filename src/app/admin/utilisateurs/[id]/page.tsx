import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFlash, AdminSection } from "@/components/admin/ui";
import { HideGarageForm, HideProfileForm, SanctionForm } from "@/components/admin/sanction-forms";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/notice";
import { requireStaff, roleAtLeast } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { revokeSanctionAction, setRoleAction } from "@/server/actions/admin-moderation";
import { nowMs } from "@/lib/utils/clock";

export const metadata = { title: "Fiche compte" };

type Detail = {
  id: string;
  username: string | null;
  bio: string;
  created_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  role: "user" | "moderator" | "admin";
  reports_received: number;
  sanctions: { id: string; kind: string; reason: string; starts_at: string; ends_at: string | null; revoked_at: string | null; revoke_reason: string | null }[];
  actions: { action: string; reason: string; duration_hours: number | null; created_at: string; moderator: string | null }[];
  garages: { id: string; name: string; visibility: string; share_slug: string; hidden_at: string | null }[];
};

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

export default async function UserDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await requireStaff("moderator", `/admin/utilisateurs/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mod_user_detail", { p_user: id });
  if (error || !data) notFound();
  const u = data as unknown as Detail;
  const back = `/admin/utilisateurs/${id}`;
  const isAdmin = roleAtLeast(viewer.role, "admin");
  const now = nowMs();
  const active = u.sanctions.filter((s) => !s.revoked_at && (!s.ends_at || new Date(s.ends_at).getTime() > now));
  const isSelf = viewer.id === u.id;

  return (
    <>
      <p className="text-sm">
        <Link href="/admin/utilisateurs" className="text-muted hover:text-ink">
          Comptes
        </Link>
      </p>
      <h1 className="display text-3xl">{u.username ?? "(pas de pseudo)"}</h1>
      <p className="flex flex-wrap gap-2 text-sm text-muted">
        <span>Inscrit le {fmt(u.created_at)}</span>
        <Tag>{u.role === "admin" ? "Administrateur" : u.role === "moderator" ? "Modérateur" : "Membre"}</Tag>
        {u.hidden_at && <Tag>Profil masqué</Tag>}
        {active.length > 0 && <Tag tone="pink">Sanction en cours</Tag>}
        <span>{u.reports_received} signalement(s) reçu(s)</span>
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />

      {active.length > 0 && (
        <AdminSection title="Sanctions en cours">
          <ul className="space-y-3">
            {active.map((s) => (
              <li key={s.id} className="rounded-lg bg-deep p-3 text-sm">
                <p>
                  <strong>{s.kind === "ban" ? "Bannissement" : "Suspension"}</strong> depuis le {fmt(s.starts_at)}
                  {s.ends_at ? ` jusqu'au ${fmt(s.ends_at)}` : " (sans fin)"} — {s.reason}
                </p>
                {(s.kind !== "ban" || isAdmin) && (
                  <form action={revokeSanctionAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="sanction_id" value={s.id} />
                    <input type="hidden" name="back" value={back} />
                    <input name="reason" required minLength={3} placeholder="Motif de la levée" className="field max-w-sm" aria-label="Motif de la levée" />
                    <Button type="submit" size="sm" variant="secondary">
                      Lever la sanction
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      {!isSelf && (u.role === "user" || isAdmin) && u.role !== "admin" && (
        <AdminSection title="Sanctionner">
          <SanctionForm userId={u.id} back={back} canBan={isAdmin} />
        </AdminSection>
      )}

      {u.username && (
        <AdminSection title={u.hidden_at ? "Profil masqué" : "Masquer le profil"}>
          {u.hidden_at && <p className="mb-3 text-sm text-muted">Motif : {u.hidden_reason}</p>}
          <HideProfileForm userId={u.id} hidden={Boolean(u.hidden_at)} back={back} />
        </AdminSection>
      )}

      {u.garages.filter((g) => g.visibility === "public" || g.hidden_at).length > 0 && (
        <AdminSection title="Garages publics">
          <ul className="space-y-4">
            {u.garages
              .filter((g) => g.visibility === "public" || g.hidden_at)
              .map((g) => (
                <li key={g.id} className="space-y-2">
                  <p className="text-sm font-semibold">
                    {g.name} {g.hidden_at && <Tag>Masqué</Tag>}
                  </p>
                  <HideGarageForm garageId={g.id} hidden={Boolean(g.hidden_at)} back={back} />
                </li>
              ))}
          </ul>
        </AdminSection>
      )}

      {isAdmin && !isSelf && (
        <AdminSection title="Rôle">
          <form action={setRoleAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="user_id" value={u.id} />
            <label className="text-sm">
              <span className="mb-1 block font-semibold">Nouveau rôle</span>
              <select name="role" defaultValue={u.role} className="field">
                <option value="user">Membre</option>
                <option value="moderator">Modérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>
            <label className="min-w-60 flex-1 text-sm">
              <span className="mb-1 block font-semibold">Motif</span>
              <input name="reason" required minLength={3} className="field" />
            </label>
            <Button type="submit" variant="secondary">
              Changer le rôle
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted">Un modérateur ou administrateur devra activer la double authentification pour accéder au back-office.</p>
        </AdminSection>
      )}

      <AdminSection title="Historique des décisions">
        {u.actions.length === 0 ? (
          <p className="text-sm text-muted">Aucune décision.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {u.actions.map((a, i) => (
              <li key={i} className="rounded-lg bg-deep px-3 py-2">
                <span className="font-semibold">{a.action}</span>
                {a.duration_hours ? ` · ${a.duration_hours} h` : ""} · {fmt(a.created_at)} · par {a.moderator ?? "?"} — <span className="text-muted">{a.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  );
}
