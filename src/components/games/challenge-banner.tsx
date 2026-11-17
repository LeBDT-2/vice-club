import Link from "next/link";
import { Photo } from "@/components/ambiance/photo";
import { buttonClass } from "@/components/ui/button";
import { KIND_LABEL, MINI_GAMES } from "@/lib/games/catalog";
import type { GameKind } from "@/lib/games/scoring";
import { nextChallengeReset } from "@/lib/utils/paris-time";
import { Countdown } from "./countdown";

/** Bandeau « Le défi du jour ». Sans défi publié, le bandeau le dit simplement. */
export function ChallengeBanner({ challenge }: { challenge: { game_kind: GameKind; title: string } | null }) {
  const now = new Date();
  const reset = nextChallengeReset(now).toISOString();
  const game = challenge ? MINI_GAMES.find((g) => g.kind === challenge.game_kind) : null;
  return (
    <section aria-labelledby="defi-titre" className="neon-border relative overflow-hidden rounded-[var(--radius-card)] border border-pink/60 bg-panel">
      <Photo name="miamiCrepuscule" sizes="(min-width: 1216px) 76rem, 100vw" position="center 70%" />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-transparent" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div className="max-w-lg">
          <p className="inline-flex items-center gap-2 rounded-full bg-pink px-3 py-1 text-xs font-bold text-white shadow-[0_0_18px_rgb(255_62_138/0.6)]">
            <span className="live-dot !size-2 !bg-white" aria-hidden="true" />
            Le défi du jour
          </p>
          {challenge && game ? (
            <>
              <h2 id="defi-titre" className="display mt-3 text-3xl sm:text-4xl">
                {challenge.title || KIND_LABEL[challenge.game_kind]}
              </h2>
              <p className="mt-2 text-ink/85">{game.description} Le même défi pour tout le monde, un seul essai classé.</p>
            </>
          ) : (
            <>
              <h2 id="defi-titre" className="display mt-3 text-3xl sm:text-4xl">
                Pas de défi aujourd&apos;hui
              </h2>
              <p className="mt-2 text-ink/85">L&apos;équipe n&apos;a pas encore programmé de défi pour cette date. Les mini-jeux restent ouverts en entraînement.</p>
            </>
          )}
          <div className="mt-3">
            <Countdown target={reset} serverNow={now.getTime()} label={challenge ? "Fin du défi dans" : "Prochaine journée dans"} />
          </div>
        </div>
        {challenge ? (
          <Link href="/defi-du-jour" className={buttonClass("primary", "lg", "shrink-0")}>
            Jouer au défi
          </Link>
        ) : (
          <Link href="/mini-jeux" className={buttonClass("secondary", "lg", "shrink-0")}>
            S&apos;entraîner
          </Link>
        )}
      </div>
    </section>
  );
}
