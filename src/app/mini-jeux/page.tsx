import type { Metadata } from "next";
import { PageBanner } from "@/components/layout/page-banner";
import { GameCard } from "@/components/games/game-card";
import { ChallengeBanner } from "@/components/games/challenge-banner";
import { getViewer } from "@/lib/auth/viewer";
import { MINI_GAMES } from "@/lib/games/catalog";
import { gameAvailability, myBestScores, todayChallenge } from "@/server/data/games";

export const metadata: Metadata = {
  title: "Mini-jeux",
  description: "Cinq mini-jeux gratuits autour de GTA : Garage ultime, Où suis-je ?, Voiture mystère, Plus cher ou moins cher ? et GTA ou réalité ?",
};

export default async function MiniGamesPage() {
  const viewer = await getViewer();
  const [availability, challenge, best] = await Promise.all([gameAvailability(), todayChallenge(), viewer ? myBestScores() : Promise.resolve({})]);
  return (
    <>
      <PageBanner
        variant="games"
        title="Mini-jeux"
        intro="Joue sans compte en entraînement. Avec un compte, tes résultats sont enregistrés et le défi du jour compte pour les classements."
      />
      <div className="container-site space-y-10 py-8">
        <ChallengeBanner challenge={challenge} />
        <section aria-labelledby="jeux-titre">
          <h2 id="jeux-titre" className="display text-2xl">À toi de jouer</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MINI_GAMES.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} ready={availability[g.kind].ready} best={g.kind === "garage" ? undefined : (best as Record<string, number>)[g.kind]} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
