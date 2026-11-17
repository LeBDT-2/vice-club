import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo, PhotoCredit } from "@/components/ambiance/photo";
import { TiltCard } from "@/components/ambiance/tilt-card";
import { GAME_PHOTO, GAME_PHOTO_POSITION } from "@/config/photos";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClass } from "@/components/ui/button";
import { DemoBadge, Notice } from "@/components/ui/notice";
import { getViewer } from "@/lib/auth/viewer";
import { MINI_GAMES } from "@/lib/games/catalog";
import { RULES, START_ERRORS } from "@/lib/games/rules";
import { startGameAction } from "@/server/actions/games";
import { gameAvailability, todayChallenge } from "@/server/data/games";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = MINI_GAMES.find((g) => g.slug === slug);
  return game ? { title: game.title, description: game.description } : {};
}

export default async function MiniGamePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ erreur?: string }> }) {
  const [{ slug }, { erreur }] = await Promise.all([params, searchParams]);
  const game = MINI_GAMES.find((g) => g.slug === slug);
  if (!game) notFound();
  const [viewer, availability, challenge] = await Promise.all([getViewer(), gameAvailability(), todayChallenge()]);
  const avail = availability[game.kind];
  const isDaily = challenge?.game_kind === game.kind;

  return (
    <div className="container-site py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-xs">
          <TiltCard>
            <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-lift)]">
              <Photo name={GAME_PHOTO[game.art]} priority sizes="20rem" imgClassName={game.art === "mystery" ? "mystery-shot" : undefined} position={GAME_PHOTO_POSITION[game.art]} />
              <div className="absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" aria-hidden="true" />
              {game.art === "mystery" && (
                <span className="display neon-pink absolute inset-x-0 top-[35%] text-center text-8xl" aria-hidden="true">
                  ?
                </span>
              )}
            </div>
          </TiltCard>
          <PhotoCredit name={GAME_PHOTO[game.art]} className="mt-2 inline-block" />
        </div>
        <div>
          <p className="text-sm">
            <Link href="/mini-jeux" className="text-muted hover:text-ink">
              Mini-jeux
            </Link>
          </p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{game.title}</h1>
          <p className="mt-3 max-w-xl text-lg text-ink/85">{game.description}</p>
          {avail.demo && (
            <div className="mt-3">
              <DemoBadge />
            </div>
          )}

          <h2 className="mt-8 text-lg font-bold">Règles</h2>
          <ul className="mt-2 max-w-2xl list-disc space-y-1.5 pl-5 text-muted">
            {RULES[game.kind].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>

          {erreur && START_ERRORS[erreur] && (
            <Notice tone="warning" className="mt-6 max-w-xl">
              {START_ERRORS[erreur]}
            </Notice>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {game.kind === "garage" ? (
              avail.ready ? (
                <>
                  <Link href="/mon-garage/nouveau" className={buttonClass("primary", "lg")}>
                    Composer un garage
                  </Link>
                  <Link href="/mon-garage" className={buttonClass("secondary", "lg")}>
                    Mes garages
                  </Link>
                </>
              ) : (
                <Notice tone="info" className="max-w-xl" title="Contenu à venir">
                  Le catalogue de véhicules est en cours de constitution. Le garage ouvrira dès que suffisamment de véhicules seront publiés.
                </Notice>
              )
            ) : !avail.ready ? (
              <Notice tone="info" className="max-w-xl" title="Contenu à venir">
                Ce mini-jeu est prêt mais attend son contenu (images, lieux ou prix sourcés). Il s&apos;ouvrira dès sa publication.
              </Notice>
            ) : (
              <>
                {isDaily && (
                  <form action={startGameAction}>
                    <input type="hidden" name="kind" value={game.kind} />
                    <input type="hidden" name="mode" value="daily" />
                    <SubmitButton size="lg">Jouer au défi du jour</SubmitButton>
                  </form>
                )}
                <form action={startGameAction}>
                  <input type="hidden" name="kind" value={game.kind} />
                  <input type="hidden" name="mode" value="training" />
                  <SubmitButton size="lg" variant={isDaily ? "secondary" : "primary"}>
                    {isDaily ? "S'entraîner" : "Jouer"}
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
          {game.kind !== "garage" && !viewer && (
            <p className="mt-4 max-w-xl text-sm text-muted">
              Tu joues en invité : ta partie n&apos;est ni enregistrée ni classée.{" "}
              <Link href="/inscription" className="text-cyan underline">
                Crée un compte
              </Link>{" "}
              pour garder tes résultats.
            </p>
          )}
          {game.kind !== "garage" && viewer && !viewer.username && (
            <p className="mt-4 max-w-xl text-sm text-muted">
              <Link href="/bienvenue" className="text-cyan underline">
                Choisis ton pseudo
              </Link>{" "}
              pour que tes parties soient enregistrées.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
