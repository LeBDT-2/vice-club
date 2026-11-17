"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { GameState } from "@/server/games/engine";
import { submitAnswerAction } from "@/server/actions/games";
import { KIND_LABEL, KIND_TO_SLUG } from "@/lib/games/catalog";
import { formatScore } from "@/lib/utils/format";
import { buttonClass } from "@/components/ui/button";
import { DemoBadge, Notice } from "@/components/ui/notice";
import { WhereRound, WhereReveal } from "./rounds/where";
import { MysteryRound, MysteryReveal } from "./rounds/mystery";
import { PriceRound, PriceReveal } from "./rounds/price";
import { RealityRound, RealityReveal } from "./rounds/reality";

export type AnswerPayload =
  | { kind: "where"; x: number; y: number }
  | { kind: "mystery"; vehicleId: string }
  | { kind: "higher_lower"; choice: "a" | "b" | "equal" }
  | { kind: "reality"; answer: "gta" | "reality" };

type Reveal = { roundComplete: boolean; sessionComplete: boolean; score: number; reveal: Record<string, unknown>; position: number };

const ERRORS: Record<string, string> = {
  not_found: "Partie introuvable.",
  closed: "Cette partie est terminée.",
  expired: "Cette partie a expiré.",
  mismatch: "Cette manche a déjà été jouée, sans doute depuis un autre onglet. Affichage mis à jour.",
  conflict: "Cette manche a déjà été jouée, sans doute depuis un autre onglet. Affichage mis à jour.",
  invalid: "Réponse invalide.",
  rate_limited: "Tu vas un peu vite. Patiente quelques instants.",
};

export function GamePlayer({ state, account }: { state: GameState; account: "guest" | "no_username" | "member" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lastReveal, setReveal] = useState<Reveal | null>(null);
  // La réponse reste affichée tant que le serveur n'a pas renvoyé la manche suivante :
  // on ne réaffiche jamais l'ancienne manche pendant le chargement.
  const reveal = lastReveal && state.status === "active" && lastReveal.position === state.round?.position ? lastReveal : null;
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  // Déplace le focus vers le bouton « Continuer » quand la réponse est révélée.
  useEffect(() => {
    if (reveal) continueRef.current?.focus();
  }, [reveal]);

  const submit = (input: AnswerPayload) => {
    if (!state.round || pending) return;
    setError(null);
    startTransition(async () => {
      const r = await submitAnswerAction({ sessionId: state.id, position: state.round!.position, input });
      if (!r.ok) {
        setError(ERRORS[r.error] ?? "Une erreur est survenue.");
        if (r.error === "conflict" || r.error === "mismatch" || r.error === "closed" || r.error === "expired") router.refresh();
        return;
      }
      if (input.kind === "mystery" && !r.roundComplete) {
        setFeedback(r.reveal);
        router.refresh();
        return;
      }
      setFeedback(null);
      setReveal({ ...r, position: state.round!.position });
    });
  };

  const next = () => {
    startTransition(() => router.refresh());
  };

  const title = KIND_LABEL[state.kind];
  const modeLabel = state.mode === "daily" ? `Défi du jour${state.ranked ? " · classé" : " · non classé"}` : "Entraînement";
  const progress = state.totalRounds ? `Manche ${Math.min(state.position, state.totalRounds)} / ${state.totalRounds}` : `Manche ${state.position}`;
  const isDemo = state.round && "isDemo" in state.round ? state.round.isDemo : false;

  return (
    <div className="container-site py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm text-muted">
            <Link href={`/mini-jeux/${KIND_TO_SLUG[state.kind]}`} className="hover:text-ink">
              {title}
            </Link>{" "}
            · {modeLabel}
          </p>
          <h1 className="display mt-1 text-3xl sm:text-4xl">{state.status === "finished" ? "Résultat" : progress}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isDemo && <DemoBadge />}
          <p className="rounded-xl border border-line bg-panel px-4 py-2 text-right">
            <span className="block text-xs text-muted">{state.kind === "higher_lower" ? "Série" : "Score"}</span>
            <span className="text-xl font-extrabold tabular-nums">
              {formatScore(state.score + (reveal?.score ?? 0))}
            </span>
          </p>
        </div>
      </header>

      <div ref={liveRef} aria-live="polite" className="sr-only">
        {reveal ? (reveal.reveal.correct === false ? "Mauvaise réponse." : `Manche terminée : ${reveal.score} points.`) : ""}
      </div>

      {error && (
        <Notice tone="warning" className="mt-4">
          {error}
        </Notice>
      )}

      <div className="mt-6">
        {reveal ? (
          <section aria-labelledby="reveal-title" className="space-y-5">
            <h2 id="reveal-title" className="sr-only">
              Réponse
            </h2>
            {state.kind === "where" && state.round?.kind === "where" && <WhereReveal round={state.round} reveal={reveal.reveal} />}
            {state.kind === "mystery" && <MysteryReveal reveal={reveal.reveal} imageUrl={state.round?.kind === "mystery" ? `${state.round.imageUrl.split("?")[0]}?v=fin` : undefined} />}
            {state.kind === "higher_lower" && state.round?.kind === "higher_lower" && <PriceReveal round={state.round} reveal={reveal.reveal} />}
            {state.kind === "reality" && state.round?.kind === "reality" && <RealityReveal round={state.round} reveal={reveal.reveal} />}
            <button ref={continueRef} type="button" onClick={next} disabled={pending} className={buttonClass("primary", "lg")}>
              {pending ? "Chargement…" : reveal.sessionComplete ? "Voir le résultat" : "Manche suivante"}
            </button>
          </section>
        ) : state.status === "active" && state.round ? (
          <>
            {state.round.kind === "where" && <WhereRound key={state.round.position} round={state.round} pending={pending} onSubmit={submit} />}
            {state.round.kind === "mystery" && <MysteryRound key={state.round.position} round={state.round} pending={pending} feedback={feedback} onSubmit={submit} />}
            {state.round.kind === "higher_lower" && <PriceRound key={state.round.position} round={state.round} pending={pending} onSubmit={submit} />}
            {state.round.kind === "reality" && <RealityRound key={state.round.position} round={state.round} pending={pending} onSubmit={submit} />}
          </>
        ) : state.status === "active" ? (
          <Notice tone="warning" title="Manche indisponible">
            Le contenu de cette manche n&apos;est plus disponible. <Link href={`/mini-jeux/${KIND_TO_SLUG[state.kind]}`}>Relance une partie</Link>.
          </Notice>
        ) : (
          <Summary state={state} account={account} />
        )}
      </div>
    </div>
  );
}

function Summary({ state, account }: { state: GameState; account: "guest" | "no_username" | "member" }) {
  const [copied, setCopied] = useState(false);
  const slug = KIND_TO_SLUG[state.kind];
  const copy = async () => {
    if (!state.shareText) return;
    try {
      await navigator.clipboard.writeText(state.shareText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  if (state.status === "expired") {
    return (
      <Notice tone="info" title="Partie expirée">
        Cette partie n&apos;a pas été terminée à temps. <Link href={`/mini-jeux/${slug}`}>Lancer une nouvelle partie</Link>
      </Notice>
    );
  }
  const scoreLine = state.maxScore ? `${formatScore(state.score)} / ${formatScore(state.maxScore)}` : formatScore(state.score);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="rounded-[var(--radius-card)] border border-line bg-panel p-6">
        <p className="text-sm text-muted">{state.kind === "higher_lower" ? "Ta série" : "Ton score"}</p>
        <p className="display mt-1 text-5xl text-cyan">{scoreLine}</p>
        {state.personalBest !== null && (
          <p className="mt-2 text-sm text-muted">
            Ton record sur ce jeu : <span className="font-semibold text-ink">{formatScore(state.personalBest)}</span>
            {state.personalBest <= state.score ? " (nouveau record ou égalé)" : ""}
          </p>
        )}
        {state.history.length > 0 && state.kind !== "mystery" && (
          <ol className="mt-5 grid gap-1.5 text-sm sm:grid-cols-2">
            {state.history.map((h) => (
              <li key={h.position} className="flex justify-between rounded-lg bg-deep px-3 py-1.5">
                <span className="text-muted">Manche {h.position}</span>
                <span className="font-semibold tabular-nums">{formatScore(h.score ?? 0)} pts</span>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {state.mode === "training" && (
            <Link href={`/mini-jeux/${slug}`} className={buttonClass("primary")}>
              Rejouer
            </Link>
          )}
          {state.mode === "daily" && (
            <Link href="/classements" className={buttonClass("primary")}>
              Voir le classement du jour
            </Link>
          )}
          <Link href="/mini-jeux" className={buttonClass("secondary")}>
            Autres mini-jeux
          </Link>
        </div>
      </section>
      <aside className="space-y-4">
        {state.shareText && (
          <div className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
            <h2 className="font-bold">Partager mon résultat</h2>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-deep p-3 font-sans text-sm">{state.shareText}</pre>
            <button type="button" onClick={copy} className={buttonClass("secondary", "sm", "mt-3")}>
              {copied ? "Copié" : "Copier le texte"}
            </button>
            <p className="mt-2 text-xs text-muted">Le texte ne contient pas la réponse.</p>
          </div>
        )}
        {account === "guest" && (
          <Notice tone="info" title="Partie non enregistrée">
            En invité, tes résultats ne sont pas sauvegardés ni classés. <Link href="/inscription">Crée un compte gratuit</Link> pour les garder.
          </Notice>
        )}
        {account === "no_username" && (
          <Notice tone="info" title="Choisis ton pseudo">
            Tes parties seront enregistrées dès que ton profil aura un pseudo. <Link href="/bienvenue">Choisir mon pseudo</Link>
          </Notice>
        )}
        {account === "member" && state.mode === "daily" && !state.ranked && (
          <Notice tone="info">Cette partie n&apos;était pas classée.</Notice>
        )}
      </aside>
    </div>
  );
}
