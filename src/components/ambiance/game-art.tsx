import Image from "next/image";
import Link from "next/link";
import { GAME_VISUAL, GTA6, GTA6_CREDIT } from "@/config/gta";
import { cn } from "@/lib/utils/cn";

/** Visuel officiel GTA VI d'un mini-jeu, en plein cadre (parent en position relative). Décoratif. */
export function GameArt({ art, sizes, priority = false, imgClassName }: { art: string; sizes: string; priority?: boolean; imgClassName?: string }) {
  const { key, position } = GAME_VISUAL[art] ?? GAME_VISUAL.garage;
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <Image src={GTA6[key].src} alt="" fill priority={priority} sizes={sizes} quality={70} className={cn("object-cover", imgClassName)} style={{ objectPosition: position }} />
    </div>
  );
}

/** Crédit du visuel d'un mini-jeu, vers la page des sources. */
export function GameArtCredit({ art, className }: { art: string; className?: string }) {
  const { key } = GAME_VISUAL[art] ?? GAME_VISUAL.garage;
  return (
    <Link href="/sources#gta" className={cn("rounded-md bg-night/55 px-2 py-1 text-[0.7rem] leading-tight text-ink/75 backdrop-blur-sm hover:text-ink", className)}>
      GTA VI : {GTA6[key].caption} · {GTA6_CREDIT}
    </Link>
  );
}
