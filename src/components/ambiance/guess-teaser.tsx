"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Round = { src: string; answer: string; choices: string[]; credit: string };

/**
 * Petit échauffement de l'accueil : une silhouette, trois propositions, révélation animée.
 * Hors classement, rien n'est enregistré ; le vrai jeu est « Voiture mystère ».
 */
export function GuessTeaser({ rounds }: { rounds: Round[] }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "scan" | "done">("idle");
  const [score, setScore] = useState(0);
  const round = rounds[i % rounds.length];
  const good = pick === round.answer;

  useEffect(() => {
    if (step !== "scan") return;
    const t = window.setTimeout(() => setStep("done"), 1100);
    return () => window.clearTimeout(t);
  }, [step]);

  function choose(c: string) {
    if (step !== "idle") return;
    setPick(c);
    if (c === round.answer) setScore((s) => s + 1);
    setStep("scan");
  }
  function next() {
    setI((n) => n + 1);
    setPick(null);
    setStep("idle");
  }

  return (
    <div className="grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel lg:grid-cols-[1.35fr_1fr]">
      <div className="relative aspect-[16/10] overflow-hidden bg-night lg:aspect-auto lg:min-h-[22rem]">
        {rounds.map((r, n) => (
          <Image
            key={r.src}
            src={r.src}
            alt={step === "done" && n === i % rounds.length ? r.answer : ""}
            fill
            sizes="(min-width: 1024px) 45rem, 100vw"
            quality={70}
            className={cn(
              "object-cover transition-[filter,opacity,transform] duration-[1200ms] ease-out",
              n === i % rounds.length ? "opacity-100" : "opacity-0",
              n === i % rounds.length && step !== "done" ? "mystery-shot" : "scale-100",
            )}
          />
        ))}
        {step === "scan" && (
          <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <div className="h-full w-1 animate-[sweep-x_1.1s_ease-in-out] bg-cyan shadow-[0_0_24px_var(--color-cyan)]" />
          </div>
        )}
        <p className="absolute bottom-2 right-2 rounded-md bg-night/60 px-2 py-1 text-[0.7rem] text-ink/75">{round.credit}</p>
      </div>

      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-cyan">
          <span className="live-dot !bg-cyan" aria-hidden="true" />
          Échauffement hors classement
          {(i > 0 || step !== "idle") && ` · ${score} trouvée${score > 1 ? "s" : ""} sur ${i + (step === "idle" ? 0 : 1)}`}
        </p>
        <h2 id="devine-titre" className="display text-3xl sm:text-4xl">
          Devine la voiture
        </h2>
        <p className="text-ink/80">Une forme floue sous les néons. Laquelle est-ce ?</p>
        <div className="grid gap-2" role="group" aria-labelledby="devine-titre">
          {round.choices.map((c) => {
            const state = step === "done" ? (c === round.answer ? "good" : c === pick ? "bad" : "off") : c === pick ? "picked" : "idle";
            return (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                disabled={step !== "idle"}
                className={cn(
                  "flex min-h-12 items-center justify-between rounded-xl border px-4 text-left font-semibold transition-all",
                  state === "idle" && "border-line bg-night/50 hover:-translate-y-0.5 hover:border-pink hover:shadow-[0_0_18px_rgb(255_62_138/0.35)]",
                  state === "picked" && "border-cyan bg-cyan/10",
                  state === "good" && "border-success bg-success/15 text-success",
                  state === "bad" && "border-danger bg-danger/15 text-danger",
                  state === "off" && "border-line/50 opacity-50",
                )}
              >
                {c}
                {state === "good" && <span aria-hidden="true">✓</span>}
                {state === "bad" && <span aria-hidden="true">✕</span>}
              </button>
            );
          })}
        </div>
        <p className="min-h-6 text-sm" aria-live="polite">
          {step === "scan" && "Les phares s'allument…"}
          {step === "done" && (good ? `Bien vu, c'est une ${round.answer}.` : `Raté : c'était une ${round.answer}.`)}
        </p>
        <div className="flex flex-wrap gap-2">
          {step === "done" && (
            <button type="button" onClick={next} className={buttonClass("secondary", "md")}>
              Voiture suivante
            </button>
          )}
          <Link href="/mini-jeux/voiture-mystere" className={buttonClass("pink", "md")}>
            Jouer à Voiture mystère
          </Link>
        </div>
      </div>
    </div>
  );
}
