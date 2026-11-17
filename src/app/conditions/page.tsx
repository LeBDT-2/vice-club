import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/config/legal";
import { TERMS_VERSION } from "@/lib/validation/auth";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Règles d'accès et d'utilisation du site communautaire VICE CLUB.",
  alternates: { canonical: "/conditions" },
};

export default function Conditions() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      current="/conditions"
      intro={<p>Version {TERMS_VERSION}. En créant un compte, tu acceptes ces conditions et les <Link href="/regles" className="text-cyan underline">règles de la communauté</Link>.</p>}
    >
      <h2>1. Le service</h2>
      <p>
        {LEGAL.siteName} est un site communautaire gratuit et non officiel autour des jeux Grand Theft Auto. Il permet de trouver des partenaires
        de jeu, de composer un garage virtuel et de jouer à des mini-jeux. Il n&apos;est pas lié à Rockstar Games ni à Take-Two Interactive.
      </p>
      <p>
        Le site ne vend rien : pas d&apos;abonnement, pas de boutique, pas de paris. Les points, scores, classements, badges et budgets de garage
        (« VC$ ») sont fictifs, n&apos;ont aucune valeur monétaire et ne peuvent être ni échangés, ni convertis, ni revendus.
      </p>
      <p>
        La recherche de partenaires ne garantit pas que deux joueurs puissent effectivement jouer ensemble : la compatibilité entre jeux et
        plateformes (multijoueur, jeu croisé) dépend des éditeurs et peut changer. Les informations affichées sont indicatives.
      </p>

      <h2>2. Accès et compte</h2>
      <ul>
        <li>Les visiteurs peuvent consulter le site et jouer aux mini-jeux sans compte. Leurs parties ne sont jamais classées.</li>
        <li>Le compte est réservé aux personnes de 18 ans ou plus. Tu le déclares à l&apos;inscription ; une fausse déclaration entraîne la fermeture du compte.</li>
        <li>Un compte par personne. Tu es responsable de la confidentialité de ton mot de passe.</li>
        <li>
          Ne communique jamais tes identifiants Rockstar, PlayStation Network, Xbox ou Steam, ni ici ni à un autre membre. Le site ne te les
          demandera jamais.
        </li>
        <li>Les rôles de modération et d&apos;administration sont attribués uniquement par l&apos;équipe du site.</li>
      </ul>

      <h2>3. Tes contenus</h2>
      <p>
        Tu restes propriétaire de ce que tu publies (profil, avatar, bio, garages, messages). Tu autorises le site à l&apos;héberger et à
        l&apos;afficher selon les réglages de visibilité que tu choisis, le temps de ta présence sur le site. Tu garantis disposer des droits sur
        l&apos;avatar que tu envoies.
      </p>
      <p>
        Les images envoyées sont recompressées et leurs métadonnées (dont la localisation) supprimées. Les messages sont limités au texte.
      </p>

      <h2>4. Comportement</h2>
      <p>
        Tu t&apos;engages à respecter les <Link href="/regles">règles de la communauté</Link> et la loi. Sont notamment interdits : le harcèlement, les
        contenus haineux, sexuels ou illicites, l&apos;usurpation d&apos;identité, les arnaques, le spam, la triche aux mini-jeux et toute tentative
        de contourner les protections techniques du site.
      </p>

      <h2>5. Modération et sanctions</h2>
      <p>
        L&apos;équipe peut masquer un contenu, suspendre un compte pour une durée déterminée ou le bannir, selon la gravité des faits. Chaque décision
        est motivée, enregistrée et la raison t&apos;est affichée à la connexion. Tu peux la contester en écrivant à <ContactEmail />. Un compte
        suspendu ne peut plus publier, contacter ni jouer en classé jusqu&apos;à la fin de la sanction.
      </p>

      <h2>6. Mini-jeux et classements</h2>
      <p>
        Les scores sont calculés par le serveur. Seule la première partie terminée du défi du jour, jouée avec un compte, compte pour les classements.
        En cas de triche avérée ou de faille exploitée, les résultats concernés peuvent être retirés. Les règles de calcul sont décrites sur la page{" "}
        <Link href="/classements">Classements</Link>.
      </p>

      <h2>7. Disponibilité et responsabilité</h2>
      <p>
        Le site est fourni gratuitement, sans garantie de disponibilité permanente. Il peut évoluer, être interrompu pour maintenance ou fermé. Les
        rencontres en jeu se font sous la responsabilité des joueurs : reste prudent, ne partage pas d&apos;informations personnelles et utilise le
        blocage et le signalement en cas de problème.
      </p>

      <h2>8. Fin d&apos;utilisation</h2>
      <p>
        Tu peux supprimer ton compte à tout moment depuis <Link href="/compte">Mon compte</Link>. L&apos;équipe peut fermer un compte qui enfreint
        gravement ou de façon répétée ces conditions.
      </p>

      <h2>9. Modifications et droit applicable</h2>
      <p>
        Ces conditions peuvent être modifiées ; la version en vigueur est datée en haut de cette page et une modification importante te sera
        signalée. Elles sont soumises au droit français. En cas de litige, contacte d&apos;abord <ContactEmail /> pour chercher une solution amiable.
      </p>
    </LegalPage>
  );
}
