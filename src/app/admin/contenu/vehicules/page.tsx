import Link from "next/link";
import { AdminFlash, AdminSection, Field, StatusButtons, StatusTag, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/notice";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGamePrice, formatVc } from "@/lib/utils/format";
import { saveVehicleAction } from "@/server/actions/admin-content";
import { listMedia, mediaLabel } from "@/server/admin/media";
import { CATEGORY_LABEL } from "@/server/data/garage";

export const metadata = { title: "Véhicules" };
const BACK = "/admin/contenu/vehicules";

export default async function VehiclesAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; modifier?: string }> }) {
  await requireStaff("admin", BACK);
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: vehicles }, { data: games }, media] = await Promise.all([
    admin.from("vehicles").select("*, games(name)").order("name").limit(1000),
    admin.from("games").select("id, name").order("sort_order"),
    listMedia({ bucket: "public-media", status: "approved" }),
  ]);
  const edit = (vehicles ?? []).find((v) => v.id === sp.modifier);
  return (
    <>
      <h1 className="display text-3xl">Véhicules</h1>
      <p className="max-w-3xl text-sm text-muted">
        Le <strong>coût fictif</strong> sert au mini-jeu Garage ultime. Le <strong>prix dans le jeu</strong> (facultatif) sert à « Plus cher ou moins cher ? » : il doit toujours être accompagné
        de son type, de sa source et de sa date de vérification.
      </p>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title={edit ? `Modifier : ${edit.name}` : "Ajouter un véhicule"} actions={edit ? <Link href={BACK} className="text-sm text-cyan underline">Nouveau véhicule</Link> : undefined}>
        <form key={edit?.id ?? "new"} action={saveVehicleAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={edit?.id ?? ""} />
          <Field label="Jeu">
            <select name="game_id" defaultValue={edit?.game_id} required className="field">
              {(games ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Nom"><input name="name" defaultValue={edit?.name} required maxLength={80} className="field" /></Field>
          <Field label="Slug"><input name="slug" defaultValue={edit?.slug} required className="field" /></Field>
          <Field label="Constructeur"><input name="manufacturer" defaultValue={edit?.manufacturer} maxLength={60} className="field" /></Field>
          <Field label="Catégorie">
            <select name="category" defaultValue={edit?.category ?? "sport"} className="field">
              {Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Coût fictif (VC$)"><input name="garage_cost" type="number" min={1} defaultValue={edit?.garage_cost ?? 1000000} required className="field" /></Field>
          <Field label="Prix dans le jeu ($)"><input name="game_price" type="number" min={0} defaultValue={edit?.game_price ?? ""} className="field" /></Field>
          <Field label="Type de prix">
            <select name="game_price_type" defaultValue={edit?.game_price_type ?? ""} className="field">
              <option value="">—</option>
              <option value="standard">Standard</option>
              <option value="promo">Promotionnel</option>
              <option value="echange">Échange</option>
            </select>
          </Field>
          <Field label="Date de vérification du prix"><input name="price_verified_at" type="date" defaultValue={edit?.price_verified_at ?? ""} className="field" /></Field>
          <Field label="Source du prix" className="sm:col-span-2"><input name="price_source" defaultValue={edit?.price_source ?? ""} maxLength={500} className="field" /></Field>
          <Field label="Note de prix"><input name="game_price_note" defaultValue={edit?.game_price_note} maxLength={200} className="field" /></Field>
          <Field label="Image (média public validé)" className="sm:col-span-3">
            <select name="image_id" defaultValue={edit?.image_id ?? ""} className="field">
              <option value="">Aucune</option>
              {media.map((m) => <option key={m.id} value={m.id}>{mediaLabel(m)}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-3"><Button type="submit">{edit ? "Enregistrer" : "Ajouter en brouillon"}</Button></div>
        </form>
      </AdminSection>
      <AdminSection title={`Catalogue (${vehicles?.length ?? 0})`}>
        <Table head={["Nom", "Jeu", "Coût fictif", "Prix jeu", "Statut", ""]}>
          {(vehicles ?? []).map((v) => (
            <tr key={v.id}>
              <td className="px-2 py-2 font-semibold"><Link href={`${BACK}?modifier=${v.id}`} className="hover:underline">{v.name}</Link> {v.is_demo && <DemoBadge />}</td>
              <td className="px-2 py-2 text-muted">{v.games?.name}</td>
              <td className="px-2 py-2 tabular-nums">{formatVc(v.garage_cost)}</td>
              <td className="px-2 py-2 tabular-nums">{v.game_price !== null ? `${formatGamePrice(Number(v.game_price))} (${v.game_price_type})` : "—"}</td>
              <td className="px-2 py-2"><StatusTag status={v.status} /></td>
              <td className="px-2 py-2"><StatusButtons table="vehicles" id={v.id} status={v.status} back={BACK} /></td>
            </tr>
          ))}
        </Table>
      </AdminSection>
    </>
  );
}
