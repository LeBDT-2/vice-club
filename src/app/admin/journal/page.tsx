import Link from "next/link";
import { Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Journal d'audit" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("admin", "/admin/journal");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  // Lecture via la RLS (administrateur + MFA uniquement).
  const { data } = await supabase.from("audit_log").select("id, actor_id, action, target_type, target_id, metadata, created_at").order("id", { ascending: false }).range((page - 1) * 50, page * 50);
  const actors = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: names } = actors.length ? await supabase.from("profiles").select("id, username").in("id", actors) : { data: [] };
  const name = new Map((names ?? []).map((n) => [n.id, n.username]));
  return (
    <>
      <h1 className="display text-3xl">Journal d&apos;audit</h1>
      <p className="text-sm text-muted">Toutes les actions sensibles du back-office et de la modération. Aucune donnée de message privé n&apos;y figure.</p>
      <Table head={["Date", "Acteur", "Action", "Cible", "Détails"]}>
        {(data ?? []).slice(0, 50).map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-2 py-2 text-muted">{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
            <td className="px-2 py-2">{r.actor_id ? (name.get(r.actor_id) ?? r.actor_id.slice(0, 8)) : "système"}</td>
            <td className="px-2 py-2 font-mono text-xs">{r.action}</td>
            <td className="px-2 py-2 text-xs text-muted">{r.target_type} {r.target_id?.slice(0, 12)}</td>
            <td className="max-w-xs truncate px-2 py-2 text-xs text-faint">{JSON.stringify(r.metadata)}</td>
          </tr>
        ))}
      </Table>
      <div className="flex gap-3 text-sm">
        {page > 1 && <Link href={`/admin/journal?page=${page - 1}`} className="text-cyan underline">Plus récents</Link>}
        {(data ?? []).length > 50 && <Link href={`/admin/journal?page=${page + 1}`} className="text-cyan underline">Plus anciens</Link>}
      </div>
    </>
  );
}
