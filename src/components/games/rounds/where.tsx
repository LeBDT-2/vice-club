"use client";

/* eslint-disable @next/next/no-img-element -- images servies par une route privée, non optimisables */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PublicRound } from "@/server/games/engine";
import { Button } from "@/components/ui/button";
import { formatScore } from "@/lib/utils/format";
import type { AnswerPayload } from "../player";

type Where = Extract<PublicRound, { kind: "where" }>;
type Point = { x: number; y: number };

function MapSurface({ map, children }: { map: Where["map"]; children?: React.ReactNode }) {
  return (
    <div className="absolute inset-0">
      {map.imageUrl ? (
        <img src={map.imageUrl} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <svg className="size-full" aria-hidden="true">
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="#2b3354" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#10233a" />
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>
      )}
      {children}
    </div>
  );
}

function Marker({ p, map, tone }: { p: Point; map: Where["map"]; tone: "guess" | "actual" }) {
  return (
    <span
      className={`pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${tone === "guess" ? "bg-pink" : "bg-cyan"}`}
      style={{ left: `${(p.x / map.width) * 100}%`, top: `${(p.y / map.height) * 100}%` }}
      aria-hidden="true"
    />
  );
}

export function WhereRound({ round, pending, onSubmit }: { round: Where; pending: boolean; onSubmit: (a: AnswerPayload) => void }) {
  const { map } = round;
  const [point, setPoint] = useState<Point | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  const place = (e: PointerEvent<HTMLDivElement>) => {
    const r = surface.current!.getBoundingClientRect();
    setPoint({
      x: Math.round(((e.clientX - r.left) / r.width) * map.width),
      y: Math.round(((e.clientY - r.top) / r.height) * map.height),
    });
  };

  // Clavier : flèches = 1 % de la carte, Maj + flèches = 5 %, Entrée = valider.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = (e.shiftKey ? 0.05 : 0.01) * Math.max(map.width, map.height);
    const p = point ?? { x: map.width / 2, y: map.height / 2 };
    const moves: Record<string, Point> = {
      ArrowLeft: { x: p.x - step, y: p.y },
      ArrowRight: { x: p.x + step, y: p.y },
      ArrowUp: { x: p.x, y: p.y - step },
      ArrowDown: { x: p.x, y: p.y + step },
    };
    if (moves[e.key]) {
      e.preventDefault();
      const m = moves[e.key];
      setPoint({ x: Math.round(Math.min(Math.max(m.x, 0), map.width)), y: Math.round(Math.min(Math.max(m.y, 0), map.height)) });
    } else if (e.key === "Enter" && point) {
      e.preventDefault();
      onSubmit({ kind: "where", x: point.x, y: point.y });
    }
  };

  const pct = point ? `${Math.round((point.x / map.width) * 100)} % depuis la gauche, ${Math.round((point.y / map.height) * 100)} % depuis le haut` : "aucun repère";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-deep">
        <img src={round.imageUrl} alt={`Capture d'écran de la manche ${round.position}. Où a-t-elle été prise ?`} className="aspect-video w-full object-cover" />
      </figure>
      <div>
        <div
          ref={surface}
          role="application"
          tabIndex={0}
          aria-label={`Carte ${map.name}. Clique ou utilise les flèches pour placer ton repère (Maj pour aller plus vite), puis Entrée pour valider. Repère : ${pct}.`}
          onPointerDown={place}
          onKeyDown={onKey}
          className="relative w-full cursor-crosshair touch-none overflow-hidden rounded-[var(--radius-card)] border border-line"
          style={{ aspectRatio: `${map.width} / ${map.height}` }}
        >
          <MapSurface map={map}>{point && <Marker p={point} map={map} tone="guess" />}</MapSurface>
        </div>
        <p className="mt-2 text-sm text-muted" aria-live="polite">
          {point ? "Repère placé. Tu peux encore le déplacer." : "Touche la carte pour placer ton repère."}
        </p>
        <Button size="lg" className="mt-3 w-full sm:w-auto" disabled={!point || pending} onClick={() => point && onSubmit({ kind: "where", x: point.x, y: point.y })}>
          {pending ? "Vérification…" : "Valider mon repère"}
        </Button>
      </div>
    </div>
  );
}

export function WhereReveal({ round, reveal }: { round: Where; reveal: Record<string, unknown> }) {
  const guess = reveal.guess as Point;
  const actual = reveal.actual as Point;
  const distance = reveal.distance as { value: number; unit: string };
  const { map } = round;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="relative w-full overflow-hidden rounded-[var(--radius-card)] border border-line" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
        <MapSurface map={map}>
          <svg className="pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${map.width} ${map.height}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1={guess.x} y1={guess.y} x2={actual.x} y2={actual.y} stroke="#ffd166" strokeWidth={Math.max(map.width, map.height) / 300} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
          </svg>
          <Marker p={guess} map={map} tone="guess" />
          <Marker p={actual} map={map} tone="actual" />
        </MapSurface>
      </div>
      <div className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
        <p className="text-sm text-muted">Le lieu</p>
        <p className="mt-1 text-2xl font-bold">{String(reveal.name)}</p>
        {reveal.description ? <p className="mt-2 text-muted">{String(reveal.description)}</p> : null}
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-deep p-3">
            <dt className="text-xs text-muted">Distance</dt>
            <dd className="text-lg font-bold">
              {formatScore(distance.value)} {distance.unit === "unités" ? "unités de carte" : distance.unit}
            </dd>
          </div>
          <div className="rounded-lg bg-deep p-3">
            <dt className="text-xs text-muted">Points</dt>
            <dd className="text-lg font-bold text-cyan">{formatScore(Number(reveal.score))} / 5 000</dd>
          </div>
        </dl>
        <p className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full border border-white bg-pink" aria-hidden="true" /> Ton repère
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full border border-white bg-cyan" aria-hidden="true" /> Lieu réel
          </span>
        </p>
        {!map.scaleVerified && <p className="mt-3 text-xs text-faint">Échelle de cette carte non vérifiée : la distance est exprimée dans le repère de la carte.</p>}
      </div>
    </div>
  );
}
