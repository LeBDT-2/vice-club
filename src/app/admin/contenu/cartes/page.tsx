import Link from "next/link";
import { AdminFlash, AdminSection, Field, StatusButtons, StatusTag, Table } from "@/components/admin/ui";
import { CoordinatePicker } from "@/components/admin/coordinate-picker";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveLocationAction, saveMapAction } from "@/server/actions/admin-content";
import { listMedia, mediaLabel } from "@/server/admin/media";
import { publicMediaUrl } from "@/server/data/garage";

export const metadata = { title: "Cartes et lieux" };
const BACK = "/admin/contenu/cartes";

export default async function MapsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; lieu?: string }> }) {
  await requireStaff("admin", BACK);
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: maps }, { data: locations }, { data: games }, publicMedia, privateMedia] = await Promise.all([
    admin.from("game_maps").select("*, games(name), image:media_assets(path)").order("created_at"),
    admin.from("geo_locations").select("*, game_maps(name)").order("created_at", { ascending: false }).limit(500),
    admin.from("games").select("id, name").order("sort_order"),
    listMedia({ bucket: "public-media", status: "approved" }),
    listMedia({ bucket: "game-media", status: "approved" }),
  ]);
  const mapOpts = (maps ?? []).map((m) => ({ id: m.id, name: m.name, width: Number(m.width), height: Number(m.height), imageUrl: publicMediaUrl(m.image?.path) }));
  const edit = (locations ?? []).find((l) => l.id === sp.lieu);
  return (
    <>
      <h1 className="display text-3xl">Cartes et lieux</h1>
      <p className="max-w-3xl text-sm text-muted">
        Les coordonnées sont exprimées dans le repère propre à chaque carte (0 à largeur, 0 à hauteur). Une distance en mètres n&apos;est affichée aux joueurs que si
        l&apos;échelle est cochée comme vérifiée, avec sa source.
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Cartes">
        <Table head={["Nom", "Jeu", "Repère", "Échelle", "Statut", ""]}>
          {(maps ?? []).map((m) => (
            <tr key={m.id}>
              <td className="px-2 py-2 font-semibold">{m.name} {m.is_demo && <DemoBadge />}</td>
              <td className="px-2 py-2 text-muted">{m.games?.name}</td>
              <td className="px-2 py-2 tabular-nums">{Number(m.width)} × {Number(m.height)}</td>
              <td className="px-2 py-2">{m.scale_verified ? `${m.meters_per_unit} m/unité` : "Non vérifiée"}</td>
              <td className="px-2 py-2"><StatusTag status={m.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="game_maps" id={m.id} status={m.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
        <form action={saveMapAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value="" />
          <Field label="Jeu">
            <select name="game_id" className="field">{(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          </Field>
          <Field label="Nom"><input name="name" required className="field" /></Field>
          <Field label="Image (média public validé)">
            <select name="image_id" className="field">
              <option value="">Aucune</option>
              {publicMedia.map((m) => <option key={m.id} value={m.id}>{mediaLabel(m)}</option>)}
            </select>
          </Field>
          <Field label="Largeur du repère"><input name="width" type="number" step="any" required className="field" /></Field>
          <Field label="Hauteur du repère"><input name="height" type="number" step="any" required className="field" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="scale_verified" className="size-4" /> Échelle vérifiée</label>
          <Field label="Mètres par unité"><input name="meters_per_unit" type="number" step="any" className="field" /></Field>
          <Field label="Source de l'échelle" className="sm:col-span-2"><input name="scale_source" className="field" /></Field>
          <div className="sm:col-span-3"><Button type="submit">Ajouter la carte</Button></div>
        </form>
      </AdminSection>

      {mapOpts.length > 0 && (
        <AdminSection title={edit ? `Modifier le lieu : ${edit.name}` : "Ajouter un lieu"} actions={edit ? <Link href={BACK} className="text-sm text-cyan underline">Nouveau lieu</Link> : undefined}>
          <form key={edit?.id ?? "new"} action={saveLocationAction} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={edit?.id ?? ""} />
            <Field label="Nom du lieu (révélé après la réponse)"><input name="name" defaultValue={edit?.name} required className="field" /></Field>
            <Field label="Difficulté">
              <select name="difficulty" defaultValue={edit?.difficulty ?? 2} className="field">
                <option value={1}>Facile</option>
                <option value={2}>Moyenne</option>
                <option value={3}>Difficile</option>
              </select>
            </Field>
            <Field label="Capture (média privé validé)">
              <select name="screenshot_id" defaultValue={edit?.screenshot_id ?? ""} className="field">
                <option value="">Aucune</option>
                {privateMedia.map((m) => <option key={m.id} value={m.id}>{mediaLabel(m)}</option>)}
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-3"><input name="description" defaultValue={edit?.description} maxLength={500} className="field" /></Field>
            <CoordinatePicker maps={mapOpts} initial={edit ? { mapId: edit.map_id, x: Number(edit.x), y: Number(edit.y) } : undefined} />
            <div className="sm:col-span-3"><Button type="submit">{edit ? "Enregistrer" : "Ajouter en brouillon"}</Button></div>
          </form>
        </AdminSection>
      )}

      <AdminSection title={`Lieux (${locations?.length ?? 0})`}>
        <Table head={["Lieu", "Carte", "Coordonnées", "Statut", ""]}>
          {(locations ?? []).map((l) => (
            <tr key={l.id}>
              <td className="px-2 py-2 font-semibold"><Link href={`${BACK}?lieu=${l.id}`} className="hover:underline">{l.name}</Link> {l.is_demo && <DemoBadge />}</td>
              <td className="px-2 py-2 text-muted">{l.game_maps?.name}</td>
              <td className="px-2 py-2 tabular-nums">{Number(l.x)}, {Number(l.y)}</td>
              <td className="px-2 py-2"><StatusTag status={l.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="geo_locations" id={l.id} status={l.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
      </AdminSection>
    </>
  );
}
