import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GarageEditor } from "@/components/garage/garage-editor";
import { ShareGarage } from "@/components/garage/share-garage";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { deleteGarageAction } from "@/server/actions/garage";
import { getSettings } from "@/server/data/catalog";
import { CATEGORY_LABEL, getOwnGarage, listVehicleCatalog } from "@/server/data/garage";

export const metadata: Metadata = { title: "Modifier mon garage", robots: { index: false } };

export default async function EditGaragePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enregistre?: string }> }) {
  const [{ id }, { enregistre }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireUser(`/mon-garage/${id}`);
  const [garage, settings, catalog] = await Promise.all([getOwnGarage(viewer.id, id), getSettings(), listVehicleCatalog()]);
  if (!garage) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const unavailable = garage.vehicles.length < (await countLinks(garage.id));

  return (
    <div className="container-site space-y-6 py-8">
      <p className="text-sm">
        <Link href="/mon-garage" className="text-muted hover:text-ink">
          Mes garages
        </Link>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-4xl">{garage.name}</h1>
        <ShareGarage url={`${site}/garage/${garage.shareSlug}`} isPublic={garage.visibility === "public" && !garage.hidden} />
      </div>
      {enregistre && <Notice tone="success">Garage enregistré.</Notice>}
      {garage.hidden && <Notice tone="warning">Ce garage a été masqué par la modération : il n&apos;est plus visible publiquement.</Notice>}
      {unavailable && <Notice tone="info">Un véhicule de ce garage a été retiré du catalogue. Enregistre à nouveau pour mettre ta sélection à jour.</Notice>}
      {viewer.sanction ? (
        <Notice tone="warning">Ton compte est restreint : la modification des garages est indisponible.</Notice>
      ) : (
        <GarageEditor
          catalog={catalog}
          categories={CATEGORY_LABEL}
          budget={settings.garageBudget}
          maxVehicles={settings.garageMaxVehicles}
          initial={{ id: garage.id, name: garage.name, description: garage.description, visibility: garage.visibility, vehicleIds: garage.vehicles.map((v) => v.id) }}
        />
      )}
      <form action={deleteGarageAction} className="border-t border-line pt-6">
        <input type="hidden" name="garage_id" value={garage.id} />
        <details>
          <summary className="cursor-pointer text-sm text-muted hover:text-ink">Supprimer ce garage</summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">La suppression est définitive et le lien de partage cessera de fonctionner.</p>
            <Button type="submit" variant="danger" size="sm">
              Supprimer définitivement
            </Button>
          </div>
        </details>
      </form>
    </div>
  );
}

async function countLinks(garageId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("garage_vehicles").select("vehicle_id", { count: "exact", head: true }).eq("garage_id", garageId);
  return count ?? 0;
}
