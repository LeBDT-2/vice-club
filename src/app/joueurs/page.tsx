import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { listGamePlatforms } from "@/server/data/catalog";
import { PAGE_SIZE, playerFiltersSchema, searchPlayers } from "@/server/data/players";
import { PlayerCard } from "@/components/players/player-card";
import { PageBanner } from "@/components/layout/page-banner";
import { EmptyState, Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { LANGUAGES, PLAY_STYLES } from "@/lib/validation/profile";

export const metadata: Metadata = {
  title: "Trouver des joueurs",
  description: "Trouve des partenaires de jeu compatibles : jeu, plateforme, langue, style, micro et disponibilité.",
};

function FilterSelect({ label, name, value, children }: { label: string; name: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`flt-${name}`} className="mb-1 block text-xs font-semibold text-muted">
        {label}
      </label>
      <select id={`flt-${name}`} name={name} defaultValue={value ?? ""} className="field min-h-11 py-2 text-sm">
        {children}
      </select>
    </div>
  );
}

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const filters = playerFiltersSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const viewer = await getViewer();
  const [gps, result] = await Promise.all([listGamePlatforms(), searchPlayers(filters, viewer?.id ?? null)]);

  const mm = gps.filter((g) => g.matchmaking);
  const games = [...new Map(mm.map((g) => [g.gameId, g.gameName])).entries()];
  const platformList = [...new Map(mm.map((g) => [g.platformId, g.platformName])).entries()];
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const hasFilters = Boolean(filters.jeu || filters.plateforme || filters.langue || filters.style || filters.micro || filters.dispo);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v && k !== "page") sp.set(k, String(v));
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/joueurs${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageBanner title="Trouve ton équipe" intro="Des joueurs francophones pour tes sessions, filtrés selon les jeux et plateformes réellement compatibles." />
      <div className="container-site py-8">
        <form method="get" action="/joueurs" className="grid grid-cols-2 gap-3 rounded-[var(--radius-card)] border border-line bg-panel p-4 sm:grid-cols-3 lg:grid-cols-7 lg:items-end" aria-label="Filtres de recherche">
          <FilterSelect label="Plateforme" name="plateforme" value={filters.plateforme}>
            <option value="">Toutes</option>
            {platformList.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Jeu" name="jeu" value={filters.jeu}>
            <option value="">Tous</option>
            {games.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Langue" name="langue" value={filters.langue}>
            <option value="">Toutes</option>
            {Object.entries(LANGUAGES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Style" name="style" value={filters.style}>
            <option value="">Tous</option>
            {Object.entries(PLAY_STYLES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Micro" name="micro" value={filters.micro}>
            <option value="">Peu importe</option>
            <option value="oui">Avec micro</option>
          </FilterSelect>
          <FilterSelect label="Disponibilité" name="dispo" value={filters.dispo}>
            <option value="">Peu importe</option>
            <option value="maintenant">Disponible maintenant</option>
            <option value="bientot">Dans les 24 h</option>
          </FilterSelect>
          <div className="col-span-2 flex gap-2 sm:col-span-3 lg:col-span-1">
            <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
              Filtrer
            </button>
            {hasFilters && (
              <Link href="/joueurs" className={buttonClass("ghost", "md")} aria-label="Effacer les filtres">
                ✕
              </Link>
            )}
          </div>
        </form>

        {mm.length === 0 && (
          <Notice tone="info" className="mt-6" title="Recherche par jeu bientôt disponible">
            L&apos;équipe n&apos;a pas encore activé de combinaison jeu/plateforme pour la recherche de partenaires. Les filtres langue,
            style, micro et disponibilité fonctionnent déjà.
          </Notice>
        )}

        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">
            {result.total} joueur{result.total > 1 ? "s" : ""} {hasFilters ? "correspond" + (result.total > 1 ? "ent" : "") + " à ta recherche" : "dans le club"}
          </h2>
          {!viewer && (
            <p className="text-sm text-muted">
              <Link href="/inscription" className="text-cyan underline">
                Crée ton compte
              </Link>{" "}
              pour apparaître ici.
            </p>
          )}
        </div>

        {result.players.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={hasFilters ? "Personne ne correspond pour l'instant" : "Le club vient d'ouvrir ses portes"}
              action={
                hasFilters ? (
                  <Link href="/joueurs" className={buttonClass("secondary")}>
                    Élargir la recherche
                  </Link>
                ) : viewer ? (
                  <Link href="/compte/profil" className={buttonClass("primary")}>
                    Compléter mon profil
                  </Link>
                ) : (
                  <Link href="/inscription" className={buttonClass("pink")}>
                    Être parmi les premiers membres
                  </Link>
                )
              }
            >
              {hasFilters
                ? "Essaie d'enlever un filtre, ou déclare-toi disponible pour que d'autres te trouvent."
                : "Aucun profil public pour le moment. Complète le tien et déclare tes disponibilités : les prochains joueurs te trouveront."}
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.players.map((p) => (
              <li key={p.id}>
                <PlayerCard player={p} />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
            {filters.page > 1 ? (
              <Link href={pageHref(filters.page - 1)} className={buttonClass("secondary", "sm")} rel="prev">
                Page précédente
              </Link>
            ) : null}
            <span className="text-sm text-muted" aria-current="page">
              Page {filters.page} sur {totalPages}
            </span>
            {filters.page < totalPages ? (
              <Link href={pageHref(filters.page + 1)} className={buttonClass("secondary", "sm")} rel="next">
                Page suivante
              </Link>
            ) : null}
          </nav>
        )}
      </div>
    </>
  );
}
