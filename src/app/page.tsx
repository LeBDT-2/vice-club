import Link from "next/link";
import { HeroScene, BannerScene } from "@/components/art/scenes";
import { ChallengeBanner } from "@/components/games/challenge-banner";
import { GameCard } from "@/components/games/game-card";
import { PlayerCard } from "@/components/players/player-card";
import { buttonClass } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { MINI_GAMES } from "@/lib/games/catalog";
import { formatVc } from "@/lib/utils/format";
import { getSettings } from "@/server/data/catalog";
import { gameAvailability, todayChallenge } from "@/server/data/games";
import { searchPlayers } from "@/server/data/players";

export default async function Home() {
  const viewer = await getViewer();
  const [challenge, availability, now, soon, settings] = await Promise.all([
    todayChallenge(),
    gameAvailability(),
    searchPlayers({ dispo: "maintenant", page: 1 }, viewer?.id ?? null),
    searchPlayers({ dispo: "bientot", page: 1 }, viewer?.id ?? null),
    getSettings(),
  ]);
  // Uniquement des profils réels ayant déclaré une disponibilité.
  const seen = new Set<string>();
  const players = [...now.players, ...soon.players].filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 4);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        <HeroScene className="absolute inset-0 -z-10 size-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night/95 via-night/60 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-night to-transparent" aria-hidden="true" />
        <div className="container-site flex min-h-[30rem] flex-col justify-center py-16 sm:min-h-[36rem]">
          <h1 className="display max-w-2xl text-5xl sm:text-7xl">
            Ta prochaine virée <span className="neon-underline">commence ici.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink/90">Trouve ton équipe. Crée ton garage. Défie tes amis.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/joueurs" className={buttonClass("primary", "lg")}>
              Trouver des joueurs
            </Link>
            <Link href="/defi-du-jour" className={buttonClass("secondary", "lg", "bg-night/60 backdrop-blur-sm")}>
              Jouer au défi du jour
            </Link>
          </div>
        </div>
      </section>

      <div className="container-site space-y-14 py-10">
        <ChallengeBanner challenge={challenge} />

        <section aria-labelledby="jeux-titre">
          <div className="flex items-end justify-between gap-3">
            <h2 id="jeux-titre" className="display text-3xl">
              À toi de jouer
            </h2>
            <Link href="/mini-jeux" className="text-sm text-cyan underline">
              Tous les mini-jeux
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MINI_GAMES.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} ready={availability[g.kind].ready} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="joueurs-titre">
          <div className="flex items-end justify-between gap-3">
            <h2 id="joueurs-titre" className="display text-3xl">
              Disponibles pour jouer
            </h2>
            <Link href="/joueurs?dispo=maintenant" className="text-sm text-cyan underline">
              Voir tous les joueurs
            </Link>
          </div>
          {players.length > 0 ? (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {players.map((p) => (
                <li key={p.id}>
                  <PlayerCard player={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col gap-4 rounded-[var(--radius-card)] border border-dashed border-line bg-panel/40 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-bold">Personne n&apos;a encore déclaré de session pour ce soir.</p>
                <p className="mt-1 max-w-xl text-muted">
                  Le club démarre : indique quand tu joues et sur quelle plateforme, et les prochains inscrits te trouveront ici.
                </p>
              </div>
              <Link href={viewer ? "/compte/profil#h-dispo" : "/inscription"} className={buttonClass("pink", "md", "shrink-0")}>
                {viewer ? "Déclarer ma dispo" : "Créer mon profil"}
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="garage-titre" className="relative overflow-hidden rounded-[var(--radius-card)] border border-line">
          <BannerScene variant="garage" className="absolute inset-0 size-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/20" aria-hidden="true" />
          <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-xl">
              <p className="inline-flex rounded-full bg-pink px-3 py-1 text-xs font-bold text-white">Garage de rêve</p>
              <h2 id="garage-titre" className="display mt-3 text-4xl">
                Ton garage ultime
              </h2>
              <p className="mt-3 text-ink/85">
                {settings.garageMaxVehicles} places, {formatVc(settings.garageBudget)} de budget fictif. Compose ta sélection, garde-la privée ou affiche-la sur ton
                profil et partage son lien.
              </p>
            </div>
            <Link href="/mon-garage" className={buttonClass("primary", "lg")}>
              Composer mon garage
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
