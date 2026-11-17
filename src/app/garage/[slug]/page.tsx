import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageBanner } from "@/components/layout/page-banner";
import { VehicleTile, BudgetGauge } from "@/components/garage/garage-editor";
import { ReportForm } from "@/components/social/forms";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { DemoBadge, Notice } from "@/components/ui/notice";
import { getViewer } from "@/lib/auth/viewer";
import { getSettings } from "@/server/data/catalog";
import { CATEGORY_LABEL, getGarageBySlug } from "@/server/data/garage";

const load = cache(getGarageBySlug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = await load(slug);
  if (!g) return { title: "Garage introuvable", robots: { index: false } };
  const isPublic = g.visibility === "public" && !g.hidden;
  return {
    title: `${g.name} — garage de ${g.owner?.username ?? "joueur"}`,
    description: g.description || `${g.vehicles.length} véhicules choisis par ${g.owner?.username ?? "un joueur"} sur VICE CLUB.`,
    robots: isPublic ? undefined : { index: false, follow: false },
  };
}

export default async function PublicGaragePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [g, viewer, settings] = await Promise.all([load(slug), getViewer(), getSettings()]);
  // La RLS ne renvoie un garage privé qu'à son propriétaire : pour les autres, il n'existe pas.
  if (!g) notFound();
  const isOwner = viewer?.id === g.ownerId;
  const hasDemo = g.vehicles.some((v) => v.isDemo);

  return (
    <>
      <PageBanner variant="garage" title={g.name} intro={g.description || undefined}>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {g.owner?.username && (
            <Link href={`/joueurs/${g.owner.username}`} className="inline-flex items-center gap-2 rounded-full bg-night/70 py-1 pl-1 pr-3 text-sm hover:bg-night">
              <Avatar username={g.owner.username} path={g.owner.avatar_path} size={28} />
              {g.owner.username}
            </Link>
          )}
          {hasDemo && <DemoBadge />}
        </div>
      </PageBanner>
      <div className="container-site space-y-6 py-8">
        {isOwner && g.visibility === "private" && <Notice tone="info">Ce garage est privé : toi seul peux voir cette page.</Notice>}
        <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {g.vehicles.map((v) => (
              <li key={v.id}>
                <VehicleTile v={v} categoryLabel={CATEGORY_LABEL[v.category] ?? v.category} />
              </li>
            ))}
          </ul>
          <BudgetGauge total={g.total} budget={settings.garageBudget} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isOwner ? (
            <Link href={`/mon-garage/${g.id}`} className={buttonClass("primary")}>
              Modifier mon garage
            </Link>
          ) : (
            <Link href="/mon-garage" className={buttonClass("primary")}>
              Composer le mien
            </Link>
          )}
          {viewer && !isOwner && <ReportForm targetType="garage" targetId={g.id} label="Signaler ce garage" />}
        </div>
        <p className="text-xs text-faint">Les coûts affichés sont fictifs et propres au mini-jeu Garage ultime.</p>
      </div>
    </>
  );
}
