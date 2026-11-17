import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/viewer";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Compte restreint", robots: { index: false } };

export default async function RestrictionPage() {
  const viewer = await requireUser("/compte/restriction");
  const s = viewer.sanction;
  return (
    <div className="container-site max-w-2xl py-14">
      <h1 className="display text-3xl">Ton compte est restreint</h1>
      {s ? (
        <Notice tone="warning" className="mt-6" title={s.kind === "ban" ? "Compte banni" : "Compte suspendu temporairement"}>
          <p>Motif communiqué par l&apos;équipe : {s.reason}</p>
          {s.endsAt && (
            <p className="mt-1">
              Fin de la suspension :{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(s.endsAt))} (heure de Paris).
            </p>
          )}
        </Notice>
      ) : (
        <Notice tone="success" className="mt-6" title="Aucune restriction active">
          Ton compte fonctionne normalement.
        </Notice>
      )}
      <p className="mt-6 text-sm text-muted">
        Pendant une restriction, tu peux toujours consulter le site, exporter tes données ou supprimer ton compte depuis{" "}
        <Link href="/compte" className="text-cyan underline">
          Compte et sécurité
        </Link>
        . Pour contester une décision, utilise la page{" "}
        <Link href="/contact" className="text-cyan underline">
          Contact
        </Link>
        .
      </p>
    </div>
  );
}
