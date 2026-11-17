"use client";

/* eslint-disable @next/next/no-img-element -- image servie par une route privée, non optimisable */
import type { PublicRound } from "@/server/games/engine";
import { Button } from "@/components/ui/button";
import type { AnswerPayload } from "../player";

type Reality = Extract<PublicRound, { kind: "reality" }>;

export function RealityRound({ round, pending, onSubmit }: { round: Reality; pending: boolean; onSubmit: (a: AnswerPayload) => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-deep">
        <img src={round.imageUrl} alt={`Image de la manche ${round.position} : capture de jeu ou photo réelle ?`} className="max-h-[65vh] w-full object-contain" />
      </figure>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Ta réponse">
        <Button size="lg" variant="pink" disabled={pending} onClick={() => onSubmit({ kind: "reality", answer: "gta" })}>
          Capture GTA
        </Button>
        <Button size="lg" variant="primary" disabled={pending} onClick={() => onSubmit({ kind: "reality", answer: "reality" })}>
          Photo réelle
        </Button>
      </div>
    </div>
  );
}

export function RealityReveal({ round, reveal }: { round: Reality; reveal: Record<string, unknown> }) {
  const source = reveal.source as { source: string; author: string; license: string; aiGenerated: boolean } | null;
  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.4fr_1fr]">
      <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-deep">
        <img src={round.imageUrl} alt="Image de la manche" className="w-full object-contain" />
      </figure>
      <div className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
        <p className={`text-xl font-bold ${reveal.correct ? "text-success" : "text-danger"}`}>{reveal.correct ? "Bien vu !" : "Raté."}</p>
        <p className="mt-1 text-2xl font-bold">{reveal.truth === "gta" ? "C'était une capture de jeu." : "C'était une vraie photo."}</p>
        <p className="mt-3 text-muted">{String(reveal.explanation)}</p>
        {source && (
          <p className="mt-4 text-xs text-faint">
            Source : {source.source} · Auteur : {source.author} · Licence : {source.license}
            {source.aiGenerated ? " · Image générée par IA (signalée comme telle)" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
