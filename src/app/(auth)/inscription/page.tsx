import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";
import { Turnstile } from "@/components/ui/turnstile";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function SignUpPage() {
  if (await getViewer()) redirect("/");
  return (
    <AuthShell
      title="Rejoins le club"
      intro={
        <>
          Un compte gratuit pour enregistrer tes scores, sauvegarder tes garages et contacter des joueurs. Déjà inscrit ?{" "}
          <Link href="/connexion" className="text-cyan underline">
            Connecte-toi
          </Link>
          .
        </>
      }
      aside={
        <ul className="max-w-sm space-y-3 text-sm text-muted">
          <li>Tu choisiras ton pseudo public après avoir confirmé ton adresse.</li>
          <li>On ne te demandera jamais tes identifiants Rockstar, PSN, Xbox ou Steam.</li>
          <li>Tu peux exporter ou supprimer tes données à tout moment.</li>
        </ul>
      }
    >
      <SignUpForm captcha={<Turnstile />} />
    </AuthShell>
  );
}
