"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareGarage({ url, isPublic }: { url: string; isPublic: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!isPublic) {
    return <p className="max-w-xs text-sm text-muted">Garage privé : passe-le en public pour obtenir un lien de partage.</p>;
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Mon garage VICE CLUB", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      /* partage annulé */
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={url} className="text-sm text-cyan underline">
        Voir la page publique
      </a>
      <Button type="button" variant="secondary" onClick={share}>
        {copied ? "Lien copié" : "Partager mon garage"}
      </Button>
    </div>
  );
}
