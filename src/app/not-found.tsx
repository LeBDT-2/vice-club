import Link from "next/link";
import { Photo, PhotoCredit } from "@/components/ambiance/photo";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <section className="scanlines relative isolate overflow-hidden border-b border-line">
      <Photo name="boulevardHotel" priority className="-z-10" />
      <PhotoCredit name="boulevardHotel" className="absolute bottom-2 right-2" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/85 to-night/40" aria-hidden="true" />
      <div className="container-site flex min-h-[26rem] flex-col justify-center py-16">
        <p className="display neon-on neon-pink text-7xl sm:text-9xl">404</p>
        <h1 className="display mt-3 text-3xl sm:text-4xl">Cette route ne mène nulle part.</h1>
        <p className="mt-3 max-w-md text-ink/85">
          La page a peut-être été déplacée, masquée par la modération, ou le lien est incomplet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            Retour à l&apos;accueil
          </Link>
          <Link href="/joueurs" className={buttonClass("secondary", "md", "bg-night/60")}>
            Trouver des joueurs
          </Link>
        </div>
      </div>
    </section>
  );
}
