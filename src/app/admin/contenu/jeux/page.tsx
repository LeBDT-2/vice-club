import { AdminFlash, AdminSection, Field, StatusButtons, StatusTag, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveGameAction, saveGamePlatformAction, savePlatformAction } from "@/server/actions/admin-content";

export const metadata = { title: "Jeux et plateformes" };
const BACK = "/admin/contenu/jeux";

export default async function GamesAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireStaff("admin", BACK);
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: games }, { data: platforms }, { data: combos }] = await Promise.all([
    admin.from("games").select("*").order("sort_order"),
    admin.from("platforms").select("*").order("sort_order"),
    admin.from("game_platforms").select("*, games(name), platforms(name)").order("created_at"),
  ]);
  return (
    <>
      <h1 className="display text-3xl">Jeux et plateformes</h1>
      <p className="max-w-3xl text-sm text-muted">
        La recherche de partenaires ne propose que les combinaisons jeu × plateforme publiées avec la recherche activée. Deux combinaisons sont compatibles si elles
        sont identiques ou partagent le même groupe de jeu croisé. Ne rien supposer : n&apos;active une combinaison qu&apos;une fois son fonctionnement en ligne vérifié.
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />

      <AdminSection title="Jeux">
        <Table head={["Nom", "Slug", "Statut", ""]}>
          {(games ?? []).map((g) => (
            <tr key={g.id}>
              <td className="px-2 py-2 font-semibold">{g.name} {g.is_demo && <DemoBadge />}</td>
              <td className="px-2 py-2 text-muted">{g.slug}</td>
              <td className="px-2 py-2"><StatusTag status={g.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="games" id={g.id} status={g.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
        <form action={saveGameAction} className="mt-4 grid gap-3 sm:grid-cols-5 sm:items-end">
          <input type="hidden" name="id" value="" />
          <Field label="Nom"><input name="name" required className="field" placeholder="GTA Online" /></Field>
          <Field label="Nom court"><input name="short_name" required className="field" placeholder="GTA Online" /></Field>
          <Field label="Slug"><input name="slug" required className="field" placeholder="gta-online" /></Field>
          <Field label="Ordre"><input name="sort_order" type="number" defaultValue={100} className="field" /></Field>
          <input type="hidden" name="description" value="" />
          <Button type="submit">Ajouter le jeu</Button>
        </form>
      </AdminSection>

      <AdminSection title="Plateformes">
        <Table head={["Nom", "Slug", "Statut", ""]}>
          {(platforms ?? []).map((p) => (
            <tr key={p.id}>
              <td className="px-2 py-2 font-semibold">{p.name} {p.is_demo && <DemoBadge />}</td>
              <td className="px-2 py-2 text-muted">{p.slug}</td>
              <td className="px-2 py-2"><StatusTag status={p.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="platforms" id={p.id} status={p.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
        <form action={savePlatformAction} className="mt-4 grid gap-3 sm:grid-cols-5 sm:items-end">
          <input type="hidden" name="id" value="" />
          <Field label="Nom"><input name="name" required className="field" placeholder="PlayStation 5" /></Field>
          <Field label="Nom court"><input name="short_name" required className="field" placeholder="PS5" /></Field>
          <Field label="Slug"><input name="slug" required className="field" placeholder="ps5" /></Field>
          <Field label="Ordre"><input name="sort_order" type="number" defaultValue={100} className="field" /></Field>
          <Button type="submit">Ajouter la plateforme</Button>
        </form>
      </AdminSection>

      <AdminSection title="Combinaisons jouables">
        <Table head={["Jeu", "Plateforme", "Version", "Recherche", "Jeu croisé", "Statut", ""]}>
          {(combos ?? []).map((c) => (
            <tr key={c.id}>
              <td className="px-2 py-2">{c.games?.name}</td>
              <td className="px-2 py-2">{c.platforms?.name}</td>
              <td className="px-2 py-2 text-muted">{c.version_label || "—"}</td>
              <td className="px-2 py-2">{c.matchmaking_enabled ? "Activée" : "Désactivée"}</td>
              <td className="px-2 py-2 text-muted">{c.crossplay_group ?? "—"}</td>
              <td className="px-2 py-2"><StatusTag status={c.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="game_platforms" id={c.id} status={c.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
        <form action={saveGamePlatformAction} className="mt-4 grid gap-3 sm:grid-cols-3 sm:items-end">
          <input type="hidden" name="id" value="" />
          <Field label="Jeu">
            <select name="game_id" required className="field">
              {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Plateforme">
            <select name="platform_id" required className="field">
              {(platforms ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Version (facultatif)"><input name="version_label" maxLength={60} className="field" placeholder="ex. Édition Enhanced" /></Field>
          <Field label="Groupe de jeu croisé (facultatif)" hint="Même valeur = joueurs compatibles entre plateformes."><input name="crossplay_group" className="field" /></Field>
          <Field label="Notes"><input name="notes" maxLength={500} className="field" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="matchmaking_enabled" className="size-4" /> Recherche de partenaires activée</label>
          <Button type="submit">Ajouter la combinaison</Button>
        </form>
      </AdminSection>
    </>
  );
}
