import Link from "next/link";
import { AdminFlash, AdminSection, Field, StatusButtons, StatusTag, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGamePrice } from "@/lib/utils/format";
import { savePropertyAction } from "@/server/actions/admin-content";
import { listMedia, mediaLabel } from "@/server/admin/media";

export const metadata = { title: "Propriétés" };
const BACK = "/admin/contenu/proprietes";
const KINDS = { appartement: "Appartement", maison: "Maison", garage: "Garage", bureau: "Bureau", entreprise: "Entreprise", club: "Club", autre: "Autre" };

export default async function PropertiesAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; modifier?: string }> }) {
  await requireStaff("admin", BACK);
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: rows }, { data: games }, media] = await Promise.all([
    admin.from("properties").select("*, games(name)").order("name").limit(1000),
    admin.from("games").select("id, name").order("sort_order"),
    listMedia({ bucket: "public-media", status: "approved" }),
  ]);
  const edit = (rows ?? []).find((v) => v.id === sp.modifier);
  return (
    <>
      <h1 className="display text-3xl">Propriétés</h1>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title={edit ? `Modifier : ${edit.name}` : "Ajouter une propriété"} actions={edit ? <Link href={BACK} className="text-sm text-cyan underline">Nouvelle propriété</Link> : undefined}>
        <form key={edit?.id ?? "new"} action={savePropertyAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={edit?.id ?? ""} />
          <Field label="Jeu">
            <select name="game_id" defaultValue={edit?.game_id} required className="field">
              {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Nom"><input name="name" defaultValue={edit?.name} required className="field" /></Field>
          <Field label="Slug"><input name="slug" defaultValue={edit?.slug} required className="field" /></Field>
          <Field label="Type">
            <select name="kind" defaultValue={edit?.kind ?? "appartement"} className="field">
              {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Lieu"><input name="location_label" defaultValue={edit?.location_label} maxLength={80} className="field" /></Field>
          <Field label="Prix dans le jeu ($)"><input name="game_price" type="number" min={0} defaultValue={edit?.game_price ?? ""} required className="field" /></Field>
          <Field label="Type de prix">
            <select name="game_price_type" defaultValue={edit?.game_price_type ?? "standard"} className="field">
              <option value="standard">Standard</option>
              <option value="promo">Promotionnel</option>
              <option value="echange">Échange</option>
            </select>
          </Field>
          <Field label="Date de vérification"><input name="price_verified_at" type="date" required defaultValue={edit?.price_verified_at ?? ""} className="field" /></Field>
          <Field label="Note de prix"><input name="game_price_note" defaultValue={edit?.game_price_note} maxLength={200} className="field" /></Field>
          <Field label="Source du prix" className="sm:col-span-3"><input name="price_source" defaultValue={edit?.price_source} required maxLength={500} className="field" /></Field>
          <Field label="Image (média public validé)" className="sm:col-span-3">
            <select name="image_id" defaultValue={edit?.image_id ?? ""} className="field">
              <option value="">Aucune</option>
              {media.map((m) => <option key={m.id} value={m.id}>{mediaLabel(m)}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-3"><Button type="submit">{edit ? "Enregistrer" : "Ajouter en brouillon"}</Button></div>
        </form>
      </AdminSection>
      <AdminSection title={`Propriétés (${rows?.length ?? 0})`}>
        <Table head={["Nom", "Jeu", "Prix", "Statut", ""]}>
          {(rows ?? []).map((v) => (
            <tr key={v.id}>
              <td className="px-2 py-2 font-semibold"><Link href={`${BACK}?modifier=${v.id}`} className="hover:underline">{v.name}</Link> {v.is_demo && <DemoBadge />}</td>
              <td className="px-2 py-2 text-muted">{v.games?.name}</td>
              <td className="px-2 py-2 tabular-nums">{formatGamePrice(Number(v.game_price))} ({v.game_price_type})</td>
              <td className="px-2 py-2"><StatusTag status={v.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="properties" id={v.id} status={v.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
      </AdminSection>
    </>
  );
}
