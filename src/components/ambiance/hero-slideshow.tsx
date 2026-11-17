"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Photo } from "@/config/photos";

const DELAY = 7000;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Diaporama plein écran de l'accueil : fondu enchaîné et lent zoom.
 * Défilement automatique coupé si l'utilisateur préfère réduire les animations,
 * et toujours un bouton pause (critère WCAG 2.2.2).
 */
export function HeroSlideshow({ slides }: { slides: Pick<Photo, "src" | "caption" | "author" | "license">[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const running = !paused && !reduced;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % slides.length);
    }, DELAY);
    return () => window.clearTimeout(t);
  }, [running, index, slides.length]);

  const current = slides[index];

  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden bg-night" aria-hidden="true">
        {slides.map((s, i) => (
          <div key={s.src} className="hero-slide" data-active={i === index}>
            <Image src={s.src} alt="" fill priority={i === 0} sizes="100vw" quality={72} className="object-cover" />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-4 z-10">
        <div className="container-site flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Photos du diaporama">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1} : ${s.caption}`}
                aria-pressed={i === index}
                className="group grid size-8 place-items-center rounded-full"
              >
                <span
                  className={
                    i === index
                      ? "h-1.5 w-7 rounded-full bg-pink shadow-[0_0_10px_var(--color-pink)] transition-all"
                      : "h-1.5 w-3 rounded-full bg-ink/45 transition-all group-hover:bg-ink/80"
                  }
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="ml-1 grid size-8 place-items-center rounded-full text-ink/80 hover:bg-night/60 hover:text-ink"
              aria-label={paused ? "Relancer le diaporama" : "Mettre le diaporama en pause"}
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
                {paused ? <path d="M6 4l10 6-10 6z" /> : <path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" />}
              </svg>
            </button>
          </div>
          <Link
            href="/sources#photos"
            className="rounded-md bg-night/55 px-2 py-1 text-[0.7rem] leading-tight text-ink/75 backdrop-blur-sm hover:text-ink"
          >
            {current.caption} · photo {current.author}, {current.license}
          </Link>
        </div>
      </div>
    </>
  );
}
