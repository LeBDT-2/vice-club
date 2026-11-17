"use client";

/* eslint-disable @next/next/no-img-element -- médias publics de tailles variables */
import type { PublicRound } from "@/server/games/engine";
import { Button } from "@/components/ui/button";
import { formatDateFr, formatGamePrice } from "@/lib/utils/format";
import type { AnswerPayload } from "../player";

type Price = Extract<PublicRound, { kind: "higher_lower" }>;
type RevealItem = { name: string; price: number; priceType: string; note: string; source: string; verifiedAt: string };

function ItemCard({ item, label, price }: { item: Price["items"][number]; label: string; price?: RevealItem }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
      <div className="relative aspect-[16/10] bg-deep">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-sm text-faint">Pas d&apos;image</div>
        )}
        <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-night/85 text-lg font-extrabold">{label}</span>
      </div>
      <div className="flex-1 p-4">
        <p className="text-xl font-bold">{item.name}</p>
        <p className="text-sm text-muted">{item.subtitle}</p>
        <p className="mt-1 text-xs text-faint">{item.gameName}</p>
        {item.priceNote && <p className="mt-2 text-xs text-muted">{item.priceNote}</p>}
        {price && (
          <div className="mt-3 rounded-lg bg-deep p-3">
            <p className="text-2xl font-extrabold text-gold">{formatGamePrice(price.price)}</p>
            <p className="mt-1 text-xs text-faint">
              Source : {price.source}
              {price.verifiedAt ? ` · vérifié le ${formatDateFr(price.verifiedAt)}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PriceRound({ round, pending, onSubmit }: { round: Price; pending: boolean; onSubmit: (a: AnswerPayload) => void }) {
  const [a, b] = round.items;
  return (
    <div className="space-y-5">
      <p className="text-lg">
        Lequel coûte le plus cher ? <span className="text-muted">({round.priceTypeLabel})</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ItemCard item={a} label="A" />
        <ItemCard item={b} label="B" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Ta réponse">
        <Button size="lg" variant="pink" disabled={pending} onClick={() => onSubmit({ kind: "higher_lower", choice: "a" })}>
          A est plus cher
        </Button>
        <Button size="lg" variant="secondary" disabled={pending} onClick={() => onSubmit({ kind: "higher_lower", choice: "equal" })}>
          Même prix
        </Button>
        <Button size="lg" variant="pink" disabled={pending} onClick={() => onSubmit({ kind: "higher_lower", choice: "b" })}>
          B est plus cher
        </Button>
      </div>
    </div>
  );
}

export function PriceReveal({ round, reveal }: { round: Price; reveal: Record<string, unknown> }) {
  const items = reveal.items as RevealItem[];
  return (
    <div className="space-y-4">
      <p className={`text-xl font-bold ${reveal.correct ? "text-success" : "text-danger"}`}>
        {reveal.correct ? "Bonne réponse !" : "Mauvaise réponse, la série s'arrête."}
        {reveal.equal ? " Les deux prix sont identiques." : ""}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ItemCard item={round.items[0]} label="A" price={items[0]} />
        <ItemCard item={round.items[1]} label="B" price={items[1]} />
      </div>
    </div>
  );
}
