import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/ambiance/photo";
import { GAME_PHOTO } from "@/config/photos";
import { Countdown } from "@/components/games/countdown";
import { buttonClass } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { getViewer } from "@/lib/auth/viewer";
import { KIND_LABEL, KIND_TO_SLUG, MINI_GAMES } from "@/lib/games/catalog";
import { RULES } from "@/lib/games/rules";
import type { GameKind } from "@/lib/games/scoring";
import { createClient } from "@/lib/supabase/server";
import { formatParisDate, nextChallengeReset } from "@/lib/utils/paris-time";
import { formatScore } from "@/lib/utils/format";
import { startGameAction } from "@/server/actions/games";
import { todayChallenge } from "@/server/data/games";

export const metadata: Metadata = {
  title: "Défi du jour",
  description: "Un défi identique pour tous chaque jour, un seul essai classé. Nouveau défi à minuit (heure de Paris).",
};

export default async function DailyChallengePage() {
  const [viewer, challenge] = await Promise.all([getViewer(), todayChallenge()]);
  const supabase = await createClient();
  const now = new Date();
  const [{ data: past }, mine, { data: mySession }] = await Promise.all([
    supabase.from("daily_challenges").select("challenge_date, game_kind, title").eq("status", "published").order("challenge_date", { ascending: false }).range(0, 14),
    viewer && challenge
      ? supabase.rpc("my_daily_rank", { p_date: challenge.challenge_date }).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer && challenge
      ? supabase.from("game_results").select("session_id").eq("challenge_date", challenge.challenge_date).eq("ranked", true).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const game = challenge ? MINI_GAMES.find((g) => g.kind === challenge.game_kind) : null;
  const myRank = mine.data as { rank: number; participants: number; score: number; max_score: number } | null;
  const ranked = Boolean(viewer?.username && !viewer.sanction);

  return (
    <div>
      <section className="scanlines relative isolate overflow-hidden border-b border-line">
        <Photo name="miamiOrange" priority position="center 45%" />
        <span className="neon-sweep z-10" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/30" aria-hidden="true" />
        <div className="container-site relative py-10 sm:py-14">
          <p className="inline-flex rounded-full bg-pink px-3 py-1 text-xs font-bold text-white">{formatParisDate(challenge?.challenge_date ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now))}</p>
          <h1 className="display mt-3 text-4xl sm:text-5xl">{challenge ? challenge.title || KIND_LABEL[challenge.game_kind] : "Pas de défi aujourd'hui"}</h1>
          <p className="mt-3 max-w-xl text-lg text-ink/85">
            {challenge
              ? "Le même défi pour tout le monde. Ton premier essai terminé avec un compte compte pour le classement du jour."
              : "Aucun défi n'a été programmé pour aujourd'hui. Les mini-jeux restent ouverts en entraînement."}
          </p>
          <div className="mt-3">
            <Countdown target={nextChallengeReset(now).toISOString()} serverNow={now.getTime()} label="Nouveau défi dans" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {challenge && game && !myRank && (
              <form action={startGameAction}>
                <input type="hidden" name="kind" value={challenge.game_kind} />
                <input type="hidden" name="mode" value="daily" />
                <SubmitButton size="lg">{ranked ? "Jouer le défi classé" : "Jouer le défi"}</SubmitButton>
              </form>
            )}
            <Link href="/classements" className={buttonClass("secondary", "lg")}>
              Classements
            </Link>
          </div>
        </div>
      </section>

      <div className="container-site grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {myRank && (
            <Notice tone="success" title="Défi du jour terminé">
              Ton score : {formatScore(myRank.score)} / {formatScore(myRank.max_score)}. Rang provisoire : {myRank.rank} sur {myRank.participants}.{" "}
              {mySession && challenge && <Link href={`/mini-jeux/${KIND_TO_SLUG[challenge.game_kind]}/partie/${mySession.session_id}`}>Revoir ma partie</Link>}
            </Notice>
          )}
          {!viewer && challenge && (
            <Notice tone="info" title="Tu joues en invité">
              Ta partie ne sera ni enregistrée ni classée. <Link href="/inscription">Crée un compte</Link> ou <Link href="/connexion?next=/defi-du-jour">connecte-toi</Link> avant de jouer pour entrer au classement.
            </Notice>
          )}
          {viewer && !viewer.username && (
            <Notice tone="info">
              <Link href="/bienvenue">Choisis ton pseudo</Link> pour que ton essai soit classé.
            </Notice>
          )}
          {challenge && (
            <section>
              <h2 className="text-lg font-bold">Règles du jour</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
                {RULES[challenge.game_kind].map((r) => (
                  <li key={r}>{r}</li>
                ))}
                <li>Un seul essai classé par compte. Une partie commencée peut être reprise jusqu&apos;à minuit (heure de Paris).</li>
                <li>Les entraînements ne comptent jamais pour les classements, et une partie jouée en invité ne peut pas être classée après coup.</li>
              </ul>
            </section>
          )}
        </div>
        <aside>
          <h2 className="text-lg font-bold">Défis précédents</h2>
          {(past ?? []).filter((p) => p.challenge_date !== challenge?.challenge_date).length === 0 ? (
            <p className="mt-2 text-sm text-muted">Pas encore d&apos;historique.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(past ?? [])
                .filter((p) => p.challenge_date !== challenge?.challenge_date)
                .map((p) => (
                  <li key={p.challenge_date}>
                    <Link
                      href={`/classements?vue=jour&date=${p.challenge_date}`}
                      className="flex items-center gap-3 rounded-xl border border-line bg-panel p-2 pr-3 hover:border-pink"
                    >
                      <span className="relative block h-12 w-10 shrink-0 overflow-hidden rounded-lg">
                        <Photo name={GAME_PHOTO[MINI_GAMES.find((g) => g.kind === p.game_kind)?.art ?? "garage"]} sizes="40px" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold first-letter:uppercase">{formatParisDate(p.challenge_date)}</span>
                        <span className="block text-xs text-muted">{KIND_LABEL[p.game_kind as GameKind]}</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
          {challenge && (
            <p className="mt-4 text-xs text-faint">
              Envie de t&apos;entraîner ? <Link href={`/mini-jeux/${KIND_TO_SLUG[challenge.game_kind]}`} className="underline">{KIND_LABEL[challenge.game_kind]} en entraînement</Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
