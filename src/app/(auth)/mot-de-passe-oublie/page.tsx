import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forms";
import { Turnstile } from "@/components/ui/turnstile";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Mot de passe oublié" intro="Indique l'adresse de ton compte : tu recevras un lien valable une heure pour en choisir un nouveau.">
      <ForgotForm captcha={<Turnstile />} />
    </AuthShell>
  );
}
