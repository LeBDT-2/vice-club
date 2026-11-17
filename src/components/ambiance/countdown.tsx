"use client";

import { useEffect, useState } from "react";

const UNITS = [
  ["jours", 86_400_000],
  ["heures", 3_600_000],
  ["minutes", 60_000],
  ["secondes", 1000],
] as const;

/** Compte à rebours jusqu'à une date. Rien n'est affiché avant l'hydratation pour éviter un écart serveur/client. */
export function Countdown({ to, doneLabel }: { to: string; doneLabel: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  if (now === null) return <div className="h-[4.5rem]" aria-hidden="true" />;
  const left = target - now;
  if (left <= 0) return <p className="display text-2xl text-gold">{doneLabel}</p>;

  const parts = UNITS.map(([label, ms], i) => ({ label, n: Math.floor((i === 0 ? left : left % UNITS[i - 1][1]) / ms) }));
  const days = parts[0].n;

  return (
    <div>
      <p className="sr-only">
        Sortie dans {days} jour{days > 1 ? "s" : ""}.
      </p>
      <ol className="flex gap-2" aria-hidden="true">
        {parts.map((p) => (
          <li key={p.label} className="glass grid min-w-[4.25rem] place-items-center rounded-xl px-2 py-2">
            <span className="display text-3xl tabular-nums leading-none text-ink">{String(p.n).padStart(2, "0")}</span>
            <span className="mt-1 text-[0.7rem] text-ink/70">{p.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
