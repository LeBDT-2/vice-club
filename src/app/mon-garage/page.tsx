import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "@/components/layout/page-banner";
import { GarageCard } from "@/components/garage/garage-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/notice";
import { getViewer } from "@/lib/auth/viewer";
import { getSettings } from "@/server/data/catalog";
import { myGarages } from "@/server/data/garage";
import { gameAvailability } from "@/server/data/games";
import { formatVc } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Mon garage", robots: { index: false } };

export default async function MyGaragePage({ searchParams }: { searchParams: Promise<{ supprime?: string }> }) {
  const { supprime } = await searchParams;
  const viewer = await getViewer();
  const [settings, availability] = await Promise.all([getSettings(), gameAvailability()]);
  const intro = `Compose la collection idéale de ${settings.garageMaxVehicles} véhicules sans dépasser ${formatVc(settings.garageBudget)} de budget fictif, puis partage-la.`;

  if (!viewer) {
    return (
      <>
        <PageBanner variant="garage" title="Ton garage ultime" intro={intro} />
        <div className="container-site py-10">
          <EmptyState
            title="Connecte-toi pour composer ton garage"
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/connexion?next=/mon-garage" className={buttonClass("primary")}>
                  Se connecter
                </Link>
                <Link href="/inscription" className={buttonClass("secondary")}>
                  Créer un compte
                </Link>
              </div>
            }
          >
            Tes garages sont enregistrés sur ton compte. Tu choisis ensuite s&apos;ils restent privés ou s&apos;ils apparaissent sur ton profil.
          </EmptyState>
        </div>
      </>
    );
  }

  const garages = await myGarages(viewer.id);
  const canCreate = garages.length < settings.garageMaxPerUser && availability.garage.ready && !viewer.sanction && viewer.username;

  return (
    <>
      <PageBanner variant="garage" title="Ton garage ultime" intro={intro}>
        <div className="mt-5 flex flex-wrap gap-3">
          {canCreate && (
            <Link href="/mon-garage/nouveau" className={buttonClass("primary", "lg")}>
              Composer un garage
            </Link>
          )}
        </div>
      </PageBanner>
      <div className="container-site space-y-6 py-8">
        {supprime && <Notice tone="success">Garage supprimé.</Notice>}
        {!viewer.username && (
          <Notice tone="info" title="Choisis ton pseudo">
            Un pseudo est nécessaire pour enregistrer un garage. <Link href="/bienvenue">Choisir mon pseudo</Link>
          </Notice>
        )}
        {!availability.garage.ready && (
          <Notice tone="info" title="Contenu à venir">
            Le catalogue de véhicules est en cours de constitution. La création de garages ouvrira dès qu&apos;il sera publié.
          </Notice>
        )}
        {garages.length >= settings.garageMaxPerUser && (
          <Notice tone="info">Tu as atteint la limite de {settings.garageMaxPerUser} garages. Supprimes-en un pour en créer un autre.</Notice>
        )}
        {garages.length === 0 ? (
          <EmptyState title="Aucun garage pour l'instant">Ton premier garage t&apos;attend : cinq places, un budget, à toi de jouer.</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {garages.map((g) => (
              <li key={g.id}>
                <GarageCard garage={g} href={`/mon-garage/${g.id}`} showVisibility />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
