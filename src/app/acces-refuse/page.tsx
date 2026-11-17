import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accès refusé", robots: { index: false } };

export default function ForbiddenPage() {
  return (
    <div className="container-site py-20 text-center">
      <p className="display text-6xl text-pink">403</p>
      <h1 className="mt-3 text-2xl font-bold">Cette zone est réservée</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">Ton compte n&apos;a pas les droits nécessaires pour afficher cette page.</p>
      <ButtonLink href="/" className="mt-6">
        Retour à l&apos;accueil
      </ButtonLink>
    </div>
  );
}
