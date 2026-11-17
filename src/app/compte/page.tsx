import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { ChangeEmailForm, ChangePasswordForm, DeleteAccountForm } from "@/components/account/security-forms";
import { Notice } from "@/components/ui/notice";
import { buttonClass } from "@/components/ui/button";
import { Turnstile } from "@/components/ui/turnstile";

export const metadata: Metadata = { title: "Compte et sécurité", robots: { index: false } };

const SUCCESS: Record<string, string> = {
  "mot-de-passe": "Ton nouveau mot de passe est enregistré.",
  email: "Ton adresse e-mail est confirmée.",
};

function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-[var(--radius-card)] border border-line bg-panel p-5 sm:p-6">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ succes?: string }> }) {
  const viewer = await requireUser("/compte");
  const { succes } = await searchParams;
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasMfa = (factors?.totp ?? []).some((f) => f.status === "verified");

  return (
    <div className="container-site max-w-3xl py-10">
      <h1 className="display text-3xl sm:text-4xl">Compte et sécurité</h1>
      <p className="mt-2 text-muted">
        Connecté avec <strong className="text-ink">{viewer.email}</strong>. Cette adresse n&apos;est jamais affichée publiquement.
      </p>
      {succes && SUCCESS[succes] && (
        <Notice tone="success" className="mt-6">
          {SUCCESS[succes]}
        </Notice>
      )}
      {viewer.sanction && (
        <Notice tone="warning" className="mt-6" title="Compte restreint">
          Certaines actions sont indisponibles. <Link href="/compte/restriction">Voir le détail</Link>.
        </Notice>
      )}
      <div className="mt-8 space-y-6">
        <Section title="Profil public" id="s-profil">
          <p className="text-sm text-muted">Pseudo, avatar, jeux, disponibilités et pseudos de jeu.</p>
          <Link href="/compte/profil" className={buttonClass("secondary", "md", "mt-3")}>
            Modifier mon profil
          </Link>
        </Section>
        <Section title="Double authentification" id="s-mfa">
          <p className="text-sm text-muted">
            {hasMfa
              ? "Activée : un code de ton application d'authentification est demandé à la connexion."
              : "Ajoute un code à usage unique en plus du mot de passe. Obligatoire pour l'équipe de modération."}
          </p>
          <Link href="/compte/securite/mfa" className={buttonClass("secondary", "md", "mt-3")}>
            {hasMfa ? "Gérer la double authentification" : "Activer la double authentification"}
          </Link>
        </Section>
        <Section title="Mot de passe" id="s-pwd">
          <ChangePasswordForm captcha={<Turnstile />} />
        </Section>
        <Section title="Adresse e-mail" id="s-email">
          <ChangeEmailForm captcha={<Turnstile />} />
        </Section>
        <Section title="Mes données" id="s-data">
          <p className="text-sm text-muted">
            Télécharge une copie de toutes les données associées à ton compte (profil, jeux, garages, résultats, demandes, messages
            de tes conversations, signalements envoyés, notifications) au format JSON.
          </p>
          <a href="/compte/export" className={buttonClass("secondary", "md", "mt-3")} download>
            Exporter mes données
          </a>
        </Section>
        <Section title="Supprimer mon compte" id="s-delete">
          <DeleteAccountForm captcha={<Turnstile />} />
        </Section>
      </div>
    </div>
  );
}
