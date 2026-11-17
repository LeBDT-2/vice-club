import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";
import { ContactEmail, LegalPage } from "@/components/legal/legal-page";
import { getViewer } from "@/lib/auth/viewer";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/lib/validation/contact";

export const metadata: Metadata = {
  title: "Contact et signalement",
  description: "Écrire à l'équipe de VICE CLUB, signaler un contenu, exercer tes droits sur tes données ou contester une décision.",
  alternates: { canonical: "/contact" },
};

export default async function Contact({ searchParams }: { searchParams: Promise<{ sujet?: string }> }) {
  const [viewer, sp] = await Promise.all([getViewer(), searchParams]);
  const preset = sp.sujet && sp.sujet in CONTACT_CATEGORIES ? (sp.sujet as ContactCategory) : undefined;
  return (
    <LegalPage
      title="Contact et signalement"
      current="/contact"
      showMissing={false}
      intro={<p>Une question, un problème avec un membre, une demande sur tes données : écris à l&apos;équipe ici.</p>}
    >
      <h2>Le plus rapide pour signaler</h2>
      <p>
        Utilise le bouton « Signaler » directement sur le profil, le garage ou le message concerné : l&apos;équipe voit alors exactement le contenu
        en cause. En cas de danger immédiat pour une personne, contacte le 17 (police) ou le 112. Pour un contenu illicite en ligne, tu peux aussi
        utiliser{" "}
        <a href="https://www.internet-signalement.gouv.fr" rel="noopener noreferrer">
          internet-signalement.gouv.fr
        </a>{" "}
        (Pharos).
      </p>

      <h2>Écrire à l&apos;équipe</h2>
      <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-panel p-5 sm:p-6">
        <ContactForm signedIn={Boolean(viewer)} defaultCategory={preset} />
      </div>
      <p className="text-sm text-muted">
        Ton message est conservé un an après son traitement (voir <Link href="/confidentialite#conservation">Confidentialité</Link>). Tu peux aussi
        écrire à <ContactEmail />.
      </p>

      <h2>Demandes fréquentes</h2>
      <ul>
        <li>
          <strong>Télécharger ou supprimer mes données</strong> : directement depuis <Link href="/compte">Mon compte</Link>.
        </li>
        <li>
          <strong>Contester une suspension</strong> : choisis le sujet « Contester une décision de modération » et explique ta situation.
        </li>
        <li>
          <strong>Un média t&apos;appartient</strong> : choisis « Droits d&apos;auteur sur un média » et indique la page où il apparaît.
        </li>
        <li>
          <strong>Une faille de sécurité</strong> : choisis « Signaler un bug ou une faille », sans publier les détails ailleurs.
        </li>
      </ul>
    </LegalPage>
  );
}
