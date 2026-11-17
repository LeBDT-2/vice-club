import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFlash, AdminSection } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { KIND_LABEL } from "@/lib/games/catalog";
import type { GameKind } from "@/lib/games/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatParisDate, parisDate } from "@/lib/utils/paris-time";
import { deleteChallengeAction, drawChallengeItemsAction, setChallengeStatusAction } from "@/server/actions/admin-content";

export const metadata = { title: "Défi du jour" };

async function labels(items: { ref_type: string; ref_id: string; ref_b_type: string | null; ref_b_id: string | null }[]) {
  const admin = createAdminClient();
  const ids = (t: string) => items.flatMap((i) => [i.ref_type === t ? i.ref_id : null, i.ref_b_type === t ? i.ref_b_id : null]).filter(Boolean) as string[];
  const [geo, mys, rea, veh, pro] = await Promise.all([
    ids("geo_location").length ? admin.from("geo_locations").select("id, name").in("id", ids("geo_location")) : { data: [] },
    ids("mystery_puzzle").length ? admin.from("mystery_puzzles").select("id, vehicles(name)").in("id", ids("mystery_puzzle")) : { data: [] },
    ids("reality_item").length ? admin.from("reality_items").select("id, answer, explanation").in("id", ids("reality_item")) : { data: [] },
    ids("vehicle").length ? admin.from("vehicles").select("id, name, game_price").in("id", ids("vehicle")) : { data: [] },
    ids("property").length ? admin.from("properties").select("id, name, game_price").in("id", ids("property")) : { data: [] },
  ]);
  const m = new Map<string, string>();
  for (const g of (geo.data ?? []) as { id: string; name: string }[]) m.set(g.id, g.name);
  for (const p of (mys.data ?? []) as unknown as { id: string; vehicles: { name: string } | null }[]) m.set(p.id, `Réponse : ${p.vehicles?.name}`);
  for (const r of (rea.data ?? []) as { id: string; answer: string; explanation: string }[]) m.set(r.id, `${r.answer === "gta" ? "Capture" : "Photo"} : ${r.explanation.slice(0, 60)}…`);
  for (const v of [...((veh.data ?? []) as { id: string; name: string; game_price: number }[]), ...((pro.data ?? []) as { id: string; name: string; game_price: number }[])])
    m.set(v.id, `${v.name} (${Number(v.game_price).toLocaleString("fr-FR")} $)`);
  return m;
}

export default async function ChallengeAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireStaff("admin", `/admin/defis/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const [{ data: c }, { data: items }] = await Promise.all([
    admin.from("daily_challenges").select("*").eq("id", id).maybeSingle(),
    admin.from("daily_challenge_items").select("position, ref_type, ref_id, ref_b_type, ref_b_id").eq("challenge_id", id).order("position"),
  ]);
  if (!c) notFound();
  const names = await labels(items ?? []);
  const live = c.status === "published" && c.challenge_date <= parisDate();
  return (
    <>
      <p className="text-sm"><Link href="/admin/defis" className="text-muted hover:text-ink">Défis du jour</Link></p>
      <h1 className="display text-3xl first-letter:uppercase">{formatParisDate(c.challenge_date)}</h1>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {KIND_LABEL[c.game_kind as GameKind]} · {c.round_count} manche(s) · {c.status === "published" ? <Tag tone="cyan">Publié</Tag> : <Tag tone="gold">Brouillon</Tag>}
        {live && <Tag tone="pink">En ligne : verrouillé</Tag>}
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection
        title="Manches (contenu secret, jamais affiché aux joueurs)"
        actions={
          c.status === "draft" ? (
            <form action={drawChallengeItemsAction}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" size="sm" variant="secondary">{(items ?? []).length ? "Tirer à nouveau" : "Tirer le contenu au hasard"}</Button>
            </form>
          ) : undefined
        }
      >
        {(items ?? []).length === 0 ? (
          <p className="text-sm text-muted">Aucune manche. Tire le contenu au hasard parmi les contenus publiés.</p>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {items!.map((i) => (
              <li key={i.position} className="rounded-lg bg-deep px-3 py-2">
                <span className="mr-2 text-muted">{i.position}.</span>
                {names.get(i.ref_id) ?? i.ref_id}
                {i.ref_b_id && <> <span className="text-muted">contre</span> {names.get(i.ref_b_id) ?? i.ref_b_id}</>}
              </li>
            ))}
          </ol>
        )}
      </AdminSection>
      {!live && (
        <div className="flex flex-wrap gap-3">
          <form action={setChallengeStatusAction}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="status" value={c.status === "published" ? "draft" : "published"} />
            <Button type="submit" variant={c.status === "published" ? "secondary" : "primary"}>{c.status === "published" ? "Repasser en brouillon" : "Publier le défi"}</Button>
          </form>
          {c.status === "draft" && (
            <form action={deleteChallengeAction}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" variant="danger">Supprimer</Button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
