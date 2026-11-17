import Link from "next/link";
import { AdminFlash, Table } from "@/components/admin/ui";
import { Tag } from "@/components/ui/notice";
import { requireStaff, roleAtLeast } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Comptes" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; erreur?: string }> }) {
  const viewer = await requireStaff("moderator", "/admin/utilisateurs");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 254);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mod_search_users", { p_query: q, p_limit: 50 });
  return (
    <>
      <h1 className="display text-3xl">Comptes</h1>
      <AdminFlash erreur={sp.erreur ?? (error ? (error.message.includes("forbidden") ? "La recherche par e-mail est réservée aux administrateurs." : "Recherche impossible.") : undefined)} />
      <form className="flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Rechercher
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          className="field max-w-md"
          placeholder={roleAtLeast(viewer.role, "admin") ? "Début du pseudo, ou adresse e-mail exacte" : "Début du pseudo"}
        />
        <button className="rounded-xl bg-cyan px-4 font-semibold text-night">Rechercher</button>
      </form>
      <Table head={["Pseudo", "Rôle", "Inscription", "État", ""]}>
        {(data ?? []).map((u) => (
          <tr key={u.id}>
            <td className="px-2 py-2 font-semibold">{u.username ?? <span className="text-muted">(pas de pseudo)</span>}</td>
            <td className="px-2 py-2">{u.role === "admin" ? "Administrateur" : u.role === "moderator" ? "Modérateur" : "Membre"}</td>
            <td className="px-2 py-2 text-muted">{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
            <td className="space-x-1 px-2 py-2">
              {u.sanctioned && <Tag tone="pink">Sanctionné</Tag>}
              {u.hidden && <Tag>Masqué</Tag>}
            </td>
            <td className="px-2 py-2 text-right">
              <Link href={`/admin/utilisateurs/${u.id}`} className="text-cyan underline">
                Fiche
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
