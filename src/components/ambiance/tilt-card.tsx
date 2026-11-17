"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Incline légèrement son contenu selon la position du pointeur et fait suivre un reflet.
 * Uniquement à la souris ou au stylet, et jamais si l'on préfère réduire les animations.
 */
export function TiltCard({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 2 * max}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 2 * max}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("tilt relative h-full rounded-[var(--radius-card)]", className)}>
      {children}
      <div className="glare pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />
    </div>
  );
}
