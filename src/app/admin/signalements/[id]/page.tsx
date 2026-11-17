import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFlash, AdminSection } from "@/components/admin/ui";
import { HideGarageForm, HideProfileForm, SanctionForm } from "@/components/admin/sanction-forms";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/notice";
import { requireStaff, roleAtLeast } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/validation/social";
import { closeReportAction, hideMessageAction } from "@/server/actions/admin-moderation";

export const metadata = { title: "Signalement" };

type Report = {
  id: string;
  target_type: "profile" | "message" | "garage";
  target_id: string;
  target_user_id: string | null;
  target_username: string | null;
  reporter_username: string | null;
  reason: string;
  details: string;
  snapshot: Record<string, string>;
  status: string;
  created_at: string;
  decision_note: string | null;
  active_sanction: boolean;
  history: { action: string; reason: string; duration_hours: number | null; created_at: string }[];
};

const ACTION_LABEL: Record<string, string> = {
  suspend: "Suspension",
  ban: "Bannissement",
  revoke_sanction: "Sanction levée",
  hide_profile: "Profil masqué",
  unhide_profile: "Profil réaffiché",
  hide_garage: "Garage masqué",
  unhide_garage: "Garage réaffiché",
  hide_message: "Message masqué",
  resolve_report: "Signalement traité",
  dismiss_report: "Classé sans suite",
  set_role: "Changement de rôle",
};

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await requireStaff("moderator", `/admin/signalements/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  // Consultation journalisée par la fonction SQL (report.view).
  const { data, error } = await supabase.rpc("mod_get_report", { p_report: id });
  if (error || !data) notFound();
  const r = data as unknown as Report;
  const back = `/admin/signalements/${id}`;
  const snap = r.snapshot ?? {};

  return (
    <>
      <p className="text-sm">
        <Link href="/admin/signalements" className="text-muted hover:text-ink">
          Signalements
        </Link>
      </p>
      <h1 className="display text-3xl">Signalement : {REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}</h1>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Contenu signalé">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Compte visé</dt>
            <dd className="font-semibold">
              {r.target_user_id ? <Link href={`/admin/utilisateurs/${r.target_user_id}`} className="underline">{r.target_username ?? "(sans pseudo)"}</Link> : "—"}{" "}
              {r.active_sanction && <Tag tone="pink">Sanction en cours</Tag>}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Signalé par</dt>
            <dd>{r.reporter_username ?? "(compte supprimé)"} · {new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</dd>
          </div>
          {r.details && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Précisions du signalement</dt>
              <dd className="whitespace-pre-wrap">{r.details}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 rounded-xl border border-line bg-deep p-4 text-sm">
          <p className="mb-2 text-xs text-muted">Instantané au moment du signalement (seul ce contenu est transmis)</p>
          {r.target_type === "message" && <p className="whitespace-pre-wrap">{snap.body}</p>}
          {r.target_type === "profile" && (
            <>
              <p className="font-semibold">{snap.username}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{snap.bio || "(bio vide)"}</p>
            </>
          )}
          {r.target_type === "garage" && (
            <>
              <p className="font-semibold">{snap.name}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted">{snap.description || "(sans description)"}</p>
            </>
          )}
        </div>
      </AdminSection>

      {r.status === "open" && (
        <>
          {r.target_type === "message" && (
            <AdminSection title="Masquer ce message">
              <form action={hideMessageAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="report_id" value={r.id} />
                <input type="hidden" name="message_id" value={r.target_id} />
                <label className="min-w-60 flex-1 text-sm">
                  <span className="mb-1 block font-semibold">Motif</span>
                  <input name="reason" required minLength={3} className="field" />
                </label>
                <Button type="submit" variant="secondary">Masquer le message</Button>
              </form>
            </AdminSection>
          )}
          {r.target_type === "profile" && r.target_user_id && (
            <AdminSection title="Masquer le profil">
              <HideProfileForm userId={r.target_user_id} hidden={false} back={back} />
            </AdminSection>
          )}
          {r.target_type === "garage" && (
            <AdminSection title="Masquer le garage">
              <HideGarageForm garageId={r.target_id} hidden={false} back={back} reportId={r.id} />
            </AdminSection>
          )}
          {r.target_user_id && (
            <AdminSection title="Sanctionner le compte">
              <SanctionForm userId={r.target_user_id} back={back} reportId={r.id} canBan={roleAtLeast(viewer.role, "admin")} />
            </AdminSection>
          )}
          <AdminSection title="Clore le signalement">
            <form action={closeReportAction} className="space-y-3">
              <input type="hidden" name="report_id" value={r.id} />
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">Note de décision (obligatoire)</span>
                <textarea name="note" required minLength={3} maxLength={1000} className="field min-h-20" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="decision" value="resolved">Marquer comme traité</Button>
                <Button type="submit" name="decision" value="dismissed" variant="secondary">Classer sans suite</Button>
              </div>
            </form>
          </AdminSection>
        </>
      )}
      {r.status !== "open" && (
        <AdminSection title="Décision">
          <p className="text-sm">{r.status === "resolved" ? "Traité" : "Classé sans suite"} : {r.decision_note}</p>
        </AdminSection>
      )}
      <AdminSection title="Historique du compte">
        {r.history.length === 0 ? (
          <p className="text-sm text-muted">Aucune décision antérieure.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {r.history.map((h, i) => (
              <li key={i} className="rounded-lg bg-deep px-3 py-2">
                <span className="font-semibold">{ACTION_LABEL[h.action] ?? h.action}</span>
                {h.duration_hours ? ` · ${h.duration_hours} h` : ""} · {new Date(h.created_at).toLocaleDateString("fr-FR")} — <span className="text-muted">{h.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  );
}
