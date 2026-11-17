"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min ${String(sec).padStart(2, "0")} s`;
}

/**
 * Compte à rebours jusqu'à une échéance calculée par le serveur (minuit à Paris).
 * Le décalage entre l'horloge du serveur et celle de l'appareil est compensé.
 */
export function Countdown({ target, serverNow, label = "Prochain défi dans" }: { target: string; serverNow: number; label?: string }) {
  const [remaining, setRemaining] = useState(() => new Date(target).getTime() - serverNow);
  useEffect(() => {
    const skew = Date.now() - serverNow;
    const tick = () => setRemaining(new Date(target).getTime() - (Date.now() - skew));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, serverNow]);
  return (
    <p className="text-sm text-muted">
      {label} <span className="font-semibold tabular-nums text-ink" suppressHydrationWarning>{format(remaining)}</span>
    </p>
  );
}
