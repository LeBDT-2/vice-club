import { AdminFlash, AdminSection, Field } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/viewer";
import { getSettings } from "@/server/data/catalog";
import { saveSettingsAction } from "@/server/actions/admin-content";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await requireStaff("admin", "/admin/parametres");
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <>
      <h1 className="display text-3xl">Paramètres</h1>
      <AdminFlash ok={sp.ok} erreur={sp.erreur} />
      <AdminSection title="Garage ultime">
        <form action={saveSettingsAction} className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <Field label="Budget fictif (VC$)"><input name="garage_budget" type="number" defaultValue={s.garageBudget} className="field" /></Field>
          <Field label="Véhicules par garage"><input name="garage_max_vehicles" type="number" min={1} max={10} defaultValue={s.garageMaxVehicles} className="field" /></Field>
          <Field label="Garages par compte"><input name="garage_max_per_user" type="number" min={1} max={50} defaultValue={s.garageMaxPerUser} className="field" /></Field>
          <div className="sm:col-span-3"><Button type="submit">Enregistrer</Button></div>
        </form>
        <p className="mt-3 text-xs text-muted">Les garages déjà enregistrés ne sont pas modifiés ; les nouvelles limites s&apos;appliquent aux prochains enregistrements.</p>
      </AdminSection>
    </>
  );
}
