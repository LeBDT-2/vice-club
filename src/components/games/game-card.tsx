import Link from "next/link";
import { GameArt } from "@/components/art/scenes";
import type { MiniGame } from "@/lib/games/catalog";

/** Carte verticale d'un mini-jeu (illustration originale + titre lisible sur fond assombri). */
export function GameCard({ game, ready, best, size = "md" }: { game: MiniGame; ready: boolean; best?: number; size?: "md" | "lg" }) {
  return (
    <Link
      href={`/mini-jeux/${game.slug}`}
      className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel shadow-[var(--shadow-lift)] transition-colors hover:border-pink focus-visible:border-cyan"
    >
      <GameArt kind={game.art} className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.03]" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-night via-night/85 to-transparent" aria-hidden="true" />
      <div className="relative p-3 sm:p-4">
        <h3 className={size === "lg" ? "display text-2xl" : "display text-lg sm:text-xl"}>{game.title}</h3>
        <p className="mt-1 text-xs text-ink/80 sm:text-sm">{game.tagline}</p>
        <p className="mt-2 flex flex-wrap gap-1.5 text-[0.7rem] font-semibold">
          {!ready && <span className="rounded-md bg-night/80 px-1.5 py-0.5 text-gold ring-1 ring-gold/40">Contenu à venir</span>}
          {best !== undefined && <span className="rounded-md bg-night/80 px-1.5 py-0.5 text-cyan ring-1 ring-cyan/40">Record : {best.toLocaleString("fr-FR")}</span>}
        </p>
      </div>
    </Link>
  );
}
