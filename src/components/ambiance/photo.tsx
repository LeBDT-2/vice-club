import Image from "next/image";
import Link from "next/link";
import { PHOTOS, type PhotoKey } from "@/config/photos";
import { cn } from "@/lib/utils/cn";

/**
 * Photo d'ambiance en plein cadre (parent en position relative).
 * Décorative par défaut (alt vide) : le texte posé dessus porte l'information.
 */
export function Photo({
  name,
  className,
  imgClassName,
  priority = false,
  sizes = "100vw",
  decorative = true,
  position = "center",
}: {
  name: PhotoKey;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
  decorative?: boolean;
  position?: string;
}) {
  const p = PHOTOS[name];
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden={decorative || undefined}>
      <Image
        src={p.src}
        alt={decorative ? "" : p.alt}
        fill
        priority={priority}
        sizes={sizes}
        quality={70}
        className={cn("object-cover", imgClassName)}
        style={{ objectPosition: position }}
      />
    </div>
  );
}

/** Petit crédit photo, lisible et cliquable vers la page des sources. */
export function PhotoCredit({ name, className }: { name: PhotoKey; className?: string }) {
  const p = PHOTOS[name];
  return (
    <Link
      href="/sources#photos"
      className={cn("rounded-md bg-night/55 px-2 py-1 text-[0.7rem] leading-tight text-ink/75 backdrop-blur-sm hover:text-ink", className)}
    >
      {p.caption} · photo {p.author}, {p.license}
    </Link>
  );
}

/** Fond photo fixe de tout le site, assombri pour garder le texte lisible. */
export function SiteBackdrop() {
  return (
    <div className="site-backdrop">
      <Image src={PHOTOS.coucherPalmiers.src} alt="" fill sizes="100vw" quality={60} className="object-cover object-[70%_center]" />
    </div>
  );
}
