"use client";

/* eslint-disable @next/next/no-img-element -- aperçu administrateur */
import { useState } from "react";

type MapOpt = { id: string; name: string; width: number; height: number; imageUrl: string | null };

/** Sélection d'une carte et de coordonnées (clic sur l'aperçu ou saisie manuelle). */
export function CoordinatePicker({ maps, initial }: { maps: MapOpt[]; initial?: { mapId: string; x: number; y: number } }) {
  const [mapId, setMapId] = useState(initial?.mapId ?? maps[0]?.id ?? "");
  const [x, setX] = useState(initial?.x ?? 0);
  const [y, setY] = useState(initial?.y ?? 0);
  const map = maps.find((m) => m.id === mapId);
  return (
    <div className="grid gap-3 sm:col-span-3 sm:grid-cols-3">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Carte</span>
        <select name="map_id" value={mapId} onChange={(e) => setMapId(e.target.value)} className="field">
          {maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">X (0 à {map?.width ?? "?"})</span>
        <input name="x" type="number" step="any" min={0} max={map?.width} value={x} onChange={(e) => setX(Number(e.target.value))} required className="field" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">Y (0 à {map?.height ?? "?"})</span>
        <input name="y" type="number" step="any" min={0} max={map?.height} value={y} onChange={(e) => setY(Number(e.target.value))} required className="field" />
      </label>
      {map && (
        <div className="sm:col-span-3">
          <p className="mb-1 text-xs text-muted">Clique sur l&apos;aperçu pour placer le point.</p>
          <div
            className="relative max-w-xl cursor-crosshair overflow-hidden rounded-lg border border-line bg-deep"
            style={{ aspectRatio: `${map.width} / ${map.height}` }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setX(Math.round(((e.clientX - r.left) / r.width) * map.width));
              setY(Math.round(((e.clientY - r.top) / r.height) * map.height));
            }}
          >
            {map.imageUrl && <img src={map.imageUrl} alt="" className="size-full object-cover" />}
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-pink"
              style={{ left: `${(x / map.width) * 100}%`, top: `${(y / map.height) * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
}
