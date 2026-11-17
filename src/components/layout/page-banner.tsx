import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Photo, PhotoCredit } from "@/components/ambiance/photo";
import { GTA6, GTA6_CREDIT, type Gta6Key } from "@/config/gta";
import type { PhotoKey } from "@/config/photos";

type Variant = "players" | "garage" | "games";
/** Photo libre (Wikimedia Commons) ou visuel officiel GTA VI, selon la page. */
const BANNER: Record<Variant, { photo: PhotoKey } | { gta: Gta6Key; position: string }> = {
  players: { photo: "oceanDriveNeons" },
  garage: { gta: "cheetah", position: "center 62%" },
  games: { gta: "skyline", position: "center 45%" },
};

const creditClass = "absolute bottom-2 right-2 z-10 hidden rounded-md bg-night/55 px-2 py-1 text-[0.7rem] leading-tight text-ink/75 backdrop-blur-sm hover:text-ink sm:block";

export function PageBanner({ title, intro, variant = "players", children }: { title: string; intro?: ReactNode; variant?: Variant; children?: ReactNode }) {
  const b = BANNER[variant];
  return (
    <div className="scanlines relative isolate overflow-hidden border-b border-line">
      {"photo" in b ? (
        <Photo name={b.photo} priority imgClassName="kenburns-slow" position="center 60%" />
      ) : (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <Image src={GTA6[b.gta].src} alt="" fill priority sizes="100vw" quality={70} className="kenburns-slow object-cover" style={{ objectPosition: b.position }} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/25" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night/80 to-transparent" aria-hidden="true" />
      {"photo" in b ? (
        <PhotoCredit name={b.photo} className="absolute bottom-2 right-2 z-10 hidden sm:block" />
      ) : (
        <Link href="/sources#gta" className={creditClass}>
          GTA VI : {GTA6[b.gta].caption} · {GTA6_CREDIT}
        </Link>
      )}
      <span className="neon-sweep z-10" aria-hidden="true" />
      <div className="container-site relative z-10 py-12 sm:py-20">
        <h1 className="rise display max-w-2xl text-4xl sm:text-6xl">{title}</h1>
        {intro && <div className="mt-3 max-w-xl text-[1.05rem] text-ink/85">{intro}</div>}
        {children}
      </div>
    </div>
  );
}
