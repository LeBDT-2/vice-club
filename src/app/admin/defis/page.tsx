import Link from "next/link";
import { AdminFlash, AdminSection, Field, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge, Tag } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { KIND_LABEL } from "@/lib/games/catalog";
import type { GameKind } from "@/lib/games/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, formatParisDate, parisDate } from "@/lib/utils/paris-time";
import { createChallengeAction } from "@/server/actions/admin-content";

export const metadata = { title: "Défis du jour" };

export default async function ChallengesAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireStaff("admin", "/admin/defis");
  const sp = await searchParams;
  const today = parisDate();
  const { data } = await createAdminClient()
    .from("daily_challenges")
    .select("id, challenge_date, game_kind, title, status, round_count, is_demo, daily_challenge_items(count)")
    .gte("challenge_date", addDays(today, -14))
    .order("challenge_date");
  const byDate = new Map((data ?? []).map((c) => [c.challenge_date, c]));
  const next14 = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  return (
    <>
      <h1 className="display text-3xl">Défis du jour</h1>
      <p className="max-w-3xl text-sm text-muted">
        Un défi par date (heure de Paris). Il ne peut être publié que complet, avec du contenu publié. Une fois sa journée commencée, il n&apos;est plus modifiable.
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Programmer un défi">
        <form action={createChallengeAction} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="Date"><input type="date" name="challenge_date" min={today} defaultValue={next14.find((d) => !byDate.has(d))} required className="field" /></Field>
          <Field label="Mini-jeu">
            <select name="game_kind" className="field">
              {(Object.keys(KIND_LABEL) as GameKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </Field>
          <Field label="Titre affiché"><input name="title" maxLength={80} className="field" placeholder="La voiture mystère" /></Field>
          <Button type="submit">Créer en brouillon</Button>
        </form>
      </AdminSection>
      <AdminSection title="Les 14 prochains jours">
        <Table head={["Date", "Mini-jeu", "Manches", "Statut", ""]}>
          {next14.map((d) => {
            const c = byDate.get(d);
            const count = (c?.daily_challenge_items as unknown as { count: number }[] | undefined)?.[0]?.count ?? 0;
            return (
              <tr key={d}>
                <td className="px-2 py-2 first-letter:uppercase">{formatParisDate(d)}</td>
                <td className="px-2 py-2">{c ? KIND_LABEL[c.game_kind as GameKind] : <span className="text-danger">Aucun défi</span>}</td>
                <td className="px-2 py-2 tabular-nums">{c ? `${count} / ${c.round_count}` : "—"}</td>
                <td className="px-2 py-2">
                  {c && (c.status === "published" ? <Tag tone="cyan">Publié</Tag> : <Tag tone="gold">Brouillon</Tag>)} {c?.is_demo && <DemoBadge />}
                </td>
                <td className="px-2 py-2 text-right">{c && <Link href={`/admin/defis/${c.id}`} className="text-cyan underline">Gérer</Link>}</td>
              </tr>
            );
          })}
        </Table>
      </AdminSection>
    </>
  );
}
