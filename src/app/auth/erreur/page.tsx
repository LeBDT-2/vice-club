import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Lien invalide", robots: { index: false } };

const REASONS: Record<string, { title: string; text: string }> = {
  "lien-expire": {
    title: "Ce lien a expiré",
    text: "Les liens envoyés par e-mail sont valables une heure et ne servent qu'une fois. Demande-en un nouveau.",
  },
  "lien-invalide": {
    title: "Ce lien n'est pas valide",
    text: "Il a peut-être déjà été utilisé, ou il a été copié de façon incomplète.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ raison?: string }> }) {
  const { raison } = await searchParams;
  const r = REASONS[raison ?? ""] ?? REASONS["lien-invalide"];
  return (
    <AuthShell title="Oups, le lien ne fonctionne pas">
      <Notice tone="warning" title={r.title}>
        {r.text}
      </Notice>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/mot-de-passe-oublie" variant="secondary">
          Réinitialiser mon mot de passe
        </ButtonLink>
        <ButtonLink href="/connexion">Se connecter</ButtonLink>
      </div>
    </AuthShell>
  );
}
