import Link from "next/link";
import { AdminSection } from "@/components/admin/ui";
import { Notice } from "@/components/ui/notice";
import { requireStaff, roleAtLeast } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, parisDate } from "@/lib/utils/paris-time";
import { isProduction } from "@/lib/env";
import { missingLegalFields } from "@/config/legal";

export default async function AdminHome() {
  const viewer = await requireStaff("moderator", "/admin");
  const isAdmin = roleAtLeast(viewer.role, "admin");
  const admin = createAdminClient();
  const today = parisDate();
  const [{ count: openReports }, { count: openContact }, { count: pendingMedia }, { data: upcoming }, { data: demo }] = await Promise.all([
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("media_assets").select("id", { count: "exact", head: true }).eq("validation_status", "pending"),
    admin.from("daily_challenges").select("challenge_date, status").gte("challenge_date", today).lte("challenge_date", addDays(today, 6)),
    isAdmin ? admin.rpc("demo_content_report") : Promise.resolve({ data: [] as { table_name: string; demo_rows: number }[] }),
  ]);
  const published = new Set((upcoming ?? []).filter((c) => c.status === "published").map((c) => c.challenge_date));
  const missing = Array.from({ length: 7 }, (_, i) => addDays(today, i)).filter((d) => !published.has(d));
  const demoRows = (demo ?? []).filter((r) => Number(r.demo_rows) > 0);
  const legalMissing = isAdmin ? missingLegalFields() : [];

  return (
    <>
      <h1 className="display text-3xl">Tableau de bord</h1>
      {demoRows.length > 0 && (
        <Notice tone={isProduction() ? "danger" : "warning"} title="Données de démonstration présentes">
          {demoRows.map((r) => `${r.table_name} : ${r.demo_rows}`).join(" · ")}. À supprimer avant l&apos;ouverture publique (<code>pnpm seed:demo --remove</code>).
        </Notice>
      )}
      {legalMissing.length > 0 && (
        <Notice tone={isProduction() ? "danger" : "warning"} title="Informations légales à compléter">
          {legalMissing.map((f) => f.label).join(" · ")}. À renseigner dans <code>src/config/legal.ts</code> avant l&apos;ouverture publique.
        </Notice>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/signalements" className="rounded-[var(--radius-card)] border border-line bg-panel p-5 hover:border-pink">
          <p className="text-sm text-muted">Signalements ouverts</p>
          <p className="mt-1 text-3xl font-extrabold">{openReports ?? 0}</p>
        </Link>
        <Link href="/admin/contact" className="rounded-[var(--radius-card)] border border-line bg-panel p-5 hover:border-pink">
          <p className="text-sm text-muted">Messages de contact à traiter</p>
          <p className="mt-1 text-3xl font-extrabold">{openContact ?? 0}</p>
        </Link>
        {isAdmin && (
          <Link href="/admin/contenu/medias" className="rounded-[var(--radius-card)] border border-line bg-panel p-5 hover:border-pink">
            <p className="text-sm text-muted">Médias à vérifier</p>
            <p className="mt-1 text-3xl font-extrabold">{pendingMedia ?? 0}</p>
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin/defis" className="rounded-[var(--radius-card)] border border-line bg-panel p-5 hover:border-pink">
            <p className="text-sm text-muted">Jours sans défi publié (7 prochains)</p>
            <p className="mt-1 text-3xl font-extrabold">{missing.length}</p>
          </Link>
        )}
      </div>
      <AdminSection title="Rappels">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Chaque décision exige un motif et reste dans l&apos;historique du compte concerné.</li>
          <li>Les modérateurs n&apos;ont pas accès aux conversations : seul le message signalé est transmis.</li>
          <li>Un média n&apos;est utilisable qu&apos;après vérification de sa source, de son auteur et de sa licence.</li>
        </ul>
      </AdminSection>
    </>
  );
}
