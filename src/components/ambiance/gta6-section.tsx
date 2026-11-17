import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/ambiance/countdown";
import { TiltCard } from "@/components/ambiance/tilt-card";
import { buttonClass } from "@/components/ui/button";
import { GTA6, GTA6_CREDIT, GTA6_GALLERY, GTA6_RELEASE, GTA6_SOURCE_URL } from "@/config/gta";

/** Section GTA VI de l'accueil : visuels officiels de Rockstar Games, crédités, sur un fan-site non officiel. */
export function Gta6Section() {
  const { jasonLuciaVille: keyArt, logo } = GTA6;
  return (
    <section aria-labelledby="gta6-titre" className="reveal space-y-3">
      <div className="relative isolate overflow-hidden rounded-[var(--radius-card)] border border-pink/40 shadow-[0_0_40px_rgb(255_62_138/0.18)]">
        <Image src={keyArt.src} alt="" fill sizes="(min-width: 1216px) 76rem, 100vw" quality={75} className="kenburns-slow -z-10 object-cover object-[65%_center]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/80 to-night/10 lg:via-night/55" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-night/90 to-transparent" aria-hidden="true" />
        <div className="grid min-h-[30rem] content-end gap-5 p-6 sm:p-10 lg:max-w-[38rem]">
          <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} sizes="12rem" className="w-36 drop-shadow-[0_0_24px_rgb(255_62_138/0.45)] sm:w-48" />
          <h2 id="gta6-titre" className="display text-4xl sm:text-5xl">
            Vice City, le retour
          </h2>
          <p className="text-ink/85">
            Jason et Lucia débarquent à Leonida le {GTA6_RELEASE.label}. Prépare ton crew dès maintenant : le club sera là pour trouver tes partenaires dès le premier soir.
          </p>
          <Countdown to={GTA6_RELEASE.iso} doneLabel="GTA VI est sorti. Rendez-vous à Vice City." />
          <div className="flex flex-wrap gap-3">
            <Link href="/joueurs" className={buttonClass("pink", "lg")}>
              Monter mon crew
            </Link>
            <a href={GTA6_SOURCE_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "lg", "glass")}>
              Site officiel de Rockstar
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {GTA6_GALLERY.map((k) => {
          const v = GTA6[k];
          return (
            <li key={k}>
              <TiltCard max={5}>
                <figure className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line">
                  <Image src={v.src} alt={v.alt} fill sizes="(min-width: 768px) 25rem, 50vw" quality={70} className="photo-zoom object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/90 to-transparent px-3 pb-2 pt-6 text-sm font-semibold">
                    {v.caption}
                  </figcaption>
                </figure>
              </TiltCard>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-ink/70">
        Visuels officiels de GTA VI, {GTA6_CREDIT}, source :{" "}
        <a href={GTA6_SOURCE_URL} className="underline hover:text-ink" target="_blank" rel="noopener noreferrer">
          rockstargames.com/VI
        </a>
        . VICE CLUB est un site de fans non officiel, sans lien avec Rockstar Games ni Take-Two Interactive.{" "}
        <Link href="/sources#gta" className="underline hover:text-ink">
          Toutes les sources
        </Link>
      </p>
    </section>
  );
}
