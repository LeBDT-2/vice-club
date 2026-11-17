"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClass } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Seul l'identifiant technique est journalisé : jamais le contenu de l'erreur côté navigateur.
    if (error.digest) console.error("[page] erreur", error.digest);
  }, [error.digest]);
  return (
    <div className="container-site py-20">
      <div className="max-w-xl rounded-[var(--radius-card)] border border-danger/50 bg-panel p-8" role="alert">
        <h1 className="display text-3xl">Quelque chose a calé.</h1>
        <p className="mt-3 text-muted">
          La page n&apos;a pas pu se charger. Réessaie ; si le problème continue, signale-le depuis la page Contact
          {error.digest ? ` en indiquant le code ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Réessayer</Button>
          <Link href="/" className={buttonClass("secondary", "md")}>
            Retour à l&apos;accueil
          </Link>
          <Link href="/contact?sujet=bug" className={buttonClass("ghost", "md")}>
            Signaler le problème
          </Link>
        </div>
      </div>
    </div>
  );
}
