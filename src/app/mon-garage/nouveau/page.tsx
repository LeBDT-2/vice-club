import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GarageEditor } from "@/components/garage/garage-editor";
import { requireActive } from "@/lib/auth/viewer";
import { getSettings } from "@/server/data/catalog";
import { CATEGORY_LABEL, listVehicleCatalog, myGarages } from "@/server/data/garage";

export const metadata: Metadata = { title: "Nouveau garage", robots: { index: false } };

export default async function NewGaragePage() {
  const viewer = await requireActive("/mon-garage/nouveau");
  const [settings, catalog, garages] = await Promise.all([getSettings(), listVehicleCatalog(), myGarages(viewer.id)]);
  if (garages.length >= settings.garageMaxPerUser || catalog.length === 0) redirect("/mon-garage");
  return (
    <div className="container-site py-8">
      <h1 className="display text-4xl">Nouveau garage</h1>
      <div className="mt-6">
        <GarageEditor
          catalog={catalog}
          categories={CATEGORY_LABEL}
          budget={settings.garageBudget}
          maxVehicles={settings.garageMaxVehicles}
          initial={{ id: null, name: "", description: "", visibility: "private", vehicleIds: [] }}
        />
      </div>
    </div>
  );
}
