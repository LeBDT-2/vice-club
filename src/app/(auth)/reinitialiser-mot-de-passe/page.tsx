import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/forms";
import { Notice } from "@/components/ui/notice";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPage() {
  const viewer = await getViewer();
  return (
    <AuthShell title="Choisis un nouveau mot de passe">
      {viewer ? (
        <ResetForm />
      ) : (
        <Notice tone="warning" title="Lien expiré ou déjà utilisé">
          Ce lien de réinitialisation n&apos;est plus valable. <Link href="/mot-de-passe-oublie">Demande un nouveau lien</Link>.
        </Notice>
      )}
    </AuthShell>
  );
}
