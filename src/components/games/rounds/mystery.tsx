"use client";

/* eslint-disable @next/next/no-img-element -- image servie par une route privée, non optimisable */
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import type { PublicRound } from "@/server/games/engine";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatScore } from "@/lib/utils/format";
import type { AnswerPayload } from "../player";

type Mystery = Extract<PublicRound, { kind: "mystery" }>;
type Suggestion = { id: string; name: string; manufacturer: string };

export function MysteryRound({
  round,
  pending,
  feedback,
  onSubmit,
}: {
  round: Mystery;
  pending: boolean;
  feedback: Record<string, unknown> | null;
  onSubmit: (a: AnswerPayload) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const guessed = new Set(round.guesses.map((g) => g.name));

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1 || selected?.name === query) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vehicules?q=${encodeURIComponent(q)}&jeu=${round.gameId}`, { signal: ctrl.signal });
        const json = (await res.json()) as { items: Suggestion[] };
        setItems(json.items);
        setOpen(true);
        setActive(json.items.length ? 0 : -1);
      } catch {
        /* requête annulée */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, round.gameId, selected]);

  const choose = (s: Suggestion) => {
    setSelected(s);
    setQuery(s.name);
    setOpen(false);
  };

  const send = () => {
    if (!selected || guessed.has(selected.name)) return;
    onSubmit({ kind: "mystery", vehicleId: selected.id });
    setSelected(null);
    setQuery("");
    setItems([]);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && items[active]) choose(items[active]);
      else send();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const remaining = round.maxAttempts - round.attemptsUsed;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-deep">
        <img
          key={round.imageUrl}
          src={round.imageUrl}
          alt={`Voiture mystère, image partielle n° ${round.attemptsUsed + 1} sur 6.`}
          className="aspect-[16/10] w-full object-cover"
        />
      </figure>
      <div className="space-y-4">
        {feedback && feedback.correct === false && (
          <Notice tone="warning" title={`Raté : ce n'est pas ${String(feedback.guessName)}`}>
            L&apos;image se dévoile un peu plus{feedback.nextHint ? " et un nouvel indice apparaît" : ""}.
          </Notice>
        )}
        <p className="font-semibold">
          {remaining} essai{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
        </p>
        <ol className="flex gap-1.5" aria-label="Essais">
          {Array.from({ length: round.maxAttempts }, (_, i) => (
            <li
              key={i}
              className={`h-2.5 flex-1 rounded-full ${i < round.attemptsUsed ? "bg-danger" : "bg-line"}`}
              aria-label={i < round.attemptsUsed ? `Essai ${i + 1} : raté` : `Essai ${i + 1} : disponible`}
            />
          ))}
        </ol>

        <div className="relative">
          <label htmlFor={`${listId}-input`} className="mb-1 block text-sm font-semibold">
            Quel est ce modèle ?
          </label>
          <div className="flex gap-2">
            <input
              id={`${listId}-input`}
              role="combobox"
              aria-expanded={open && items.length > 0}
              aria-controls={`${listId}-list`}
              aria-autocomplete="list"
              aria-activedescendant={open && active >= 0 ? `${listId}-opt-${active}` : undefined}
              autoComplete="off"
              className="field"
              placeholder="Tape le nom d'un véhicule"
              value={query}
              maxLength={40}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              onKeyDown={onKey}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
            />
            <Button onClick={send} disabled={!selected || pending || guessed.has(selected?.name ?? "")}>
              {pending ? "…" : "Valider"}
            </Button>
          </div>
          {open && items.length > 0 && (
            <ul id={`${listId}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-panel-2 p-1 shadow-[var(--shadow-lift)]">
              {items.map((s, i) => (
                <li
                  key={s.id}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  aria-disabled={guessed.has(s.name)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-cyan/15 text-ink" : "text-muted"} ${guessed.has(s.name) ? "line-through opacity-60" : ""}`}
                >
                  <span className="font-semibold text-ink">{s.name}</span>
                  {s.manufacturer && <span className="ml-2 text-xs">{s.manufacturer}</span>}
                </li>
              ))}
            </ul>
          )}
          {open && query.trim() && items.length === 0 && <p className="mt-1 text-sm text-muted">Aucun véhicule ne correspond.</p>}
        </div>

        {round.hints.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold">Indices</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {round.hints.map((h, i) => (
                <li key={i} className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2">
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
        {round.guesses.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold">Déjà proposés</h2>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
              {round.guesses.map((g, i) => (
                <li key={i} className="rounded-md border border-danger/40 bg-danger/10 px-2 py-0.5">
                  <span className="sr-only">Raté : </span>
                  {g.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function MysteryReveal({ reveal, imageUrl }: { reveal: Record<string, unknown>; imageUrl?: string }) {
  const answer = reveal.answer as { name: string; manufacturer: string } | undefined;
  const source = reveal.source as { source: string; author: string; license: string } | null | undefined;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {imageUrl && (
        <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-deep">
          <img src={imageUrl} alt={answer ? `${answer.manufacturer} ${answer.name}`.trim() : "Voiture mystère"} className="aspect-[16/10] w-full object-cover" />
        </figure>
      )}
    <div className="rounded-[var(--radius-card)] border border-line bg-panel p-6">
      <p className={`text-lg font-bold ${reveal.correct ? "text-success" : "text-danger"}`}>
        {reveal.correct ? `Trouvé en ${String(reveal.attempt)} essai${Number(reveal.attempt) > 1 ? "s" : ""} !` : "Raté, plus d'essais."}
      </p>
      {answer && (
        <p className="mt-2 text-2xl font-bold">
          C&apos;était : {answer.manufacturer ? `${answer.manufacturer} ` : ""}
          {answer.name}
        </p>
      )}
      <p className="mt-2 text-muted">
        Points : <span className="font-semibold text-cyan">{formatScore(Number(reveal.score))}</span>
      </p>
      {source && (
        <p className="mt-3 text-xs text-faint">
          Image : {source.source} · {source.author} · {source.license}
        </p>
      )}
    </div>
    </div>
  );
}
