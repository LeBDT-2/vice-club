import Link from "next/link";
import { AdminFlash, Table } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/validation/social";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Signalements" };
const TARGET = { profile: "Profil", message: "Message", garage: "Garage" } as Record<string, string>;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ statut?: string; ok?: string; erreur?: string }> }) {
  await requireStaff("moderator", "/admin/signalements");
  const sp = await searchParams;
  const status = sp.statut === "resolved" || sp.statut === "dismissed" ? sp.statut : "open";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mod_list_reports", { p_status: status, p_limit: 100, p_offset: 0 });
  const tabs = [
    ["open", "Ouverts"],
    ["resolved", "Traités"],
    ["dismissed", "Sans suite"],
  ];
  return (
    <>
      <h1 className="display text-3xl">Signalements</h1>
      <AdminFlash ok={sp.ok} erreur={sp.erreur ?? (error ? "Lecture impossible." : undefined)} />
      <nav className="flex gap-2" aria-label="Statut">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/signalements${id === "open" ? "" : `?statut=${id}`}`}
            aria-current={status === id ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-sm", status === id ? "border-cyan text-cyan" : "border-line text-muted")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {(data ?? []).length === 0 ? (
        <EmptyState title="Aucun signalement">Rien à traiter dans cette liste.</EmptyState>
      ) : (
        <Table head={["Date", "Type", "Compte visé", "Motif", "Signalements", ""]}>
          {data!.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-2 text-muted">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
              <td className="px-2 py-2">{TARGET[r.target_type] ?? r.target_type}</td>
              <td className="px-2 py-2">{r.target_username ?? "—"}</td>
              <td className="px-2 py-2">{REPORT_REASONS[r.reason as keyof typeof REPORT_REASONS] ?? r.reason}</td>
              <td className="px-2 py-2 tabular-nums">{r.reporter_count}</td>
              <td className="px-2 py-2 text-right">
                <Link href={`/admin/signalements/${r.id}`} className="text-cyan underline">
                  Examiner
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
