import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, Fill, LegalPage } from "@/components/legal/legal-page";
import { LEGAL, RETENTION } from "@/config/legal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Données collectées par VICE CLUB, finalités, durées de conservation et exercice de tes droits.",
  alternates: { canonical: "/confidentialite" },
};

export default function Confidentialite() {
  return (
    <LegalPage
      title="Confidentialité"
      current="/confidentialite"
      intro={
        <p>
          On collecte le minimum pour faire fonctionner le club : pas de publicité ciblée, pas de revente, pas de traceur tiers. Voici ce qui est
          enregistré, pourquoi, et combien de temps.
        </p>
      }
    >
      <h2 id="responsable">Responsable du traitement</h2>
      <p>
        <Fill value={LEGAL.publisherName} label="nom de l'éditeur" />, éditeur du site (voir les <Link href="/mentions-legales">mentions légales</Link>
        ). Contact pour toute question sur tes données : <ContactEmail />.
      </p>

      <h2 id="donnees">Données traitées et finalités</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Données</th>
            <th scope="col">Pourquoi</th>
            <th scope="col">Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Adresse e-mail, mot de passe (stocké uniquement sous forme d&apos;empreinte par le service d&apos;authentification)</td>
            <td>Créer et sécuriser ton compte, t&apos;envoyer les e-mails de confirmation et de réinitialisation</td>
            <td>Exécution du contrat (conditions d&apos;utilisation)</td>
          </tr>
          <tr>
            <td>Déclaration d&apos;avoir 18 ans ou plus, date d&apos;acceptation et version des conditions</td>
            <td>Réserver le club aux adultes et prouver ton acceptation</td>
            <td>Exécution du contrat, obligation de preuve</td>
          </tr>
          <tr>
            <td>Pseudo, avatar, bio, langues, styles de jeu, micro, fuseau horaire, créneaux, jeux et plateformes, pseudos publics de plateformes</td>
            <td>Afficher ton profil et te proposer des joueurs compatibles</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Disponibilités, demandes de contact, conversations et messages</td>
            <td>Mettre en relation les joueurs qui l&apos;ont accepté</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Garages, parties, scores et classements</td>
            <td>Sauvegarder tes créations et tes résultats, établir des classements équitables</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Blocages, signalements, sanctions, journal d&apos;audit</td>
            <td>Protéger les membres et pouvoir justifier chaque décision de modération</td>
            <td>Intérêt légitime (sécurité de la communauté)</td>
          </tr>
          <tr>
            <td>Empreintes d&apos;adresse IP et d&apos;e-mail chiffrées par HMAC, compteurs de tentatives</td>
            <td>Limiter les abus (inscriptions en masse, force brute, spam)</td>
            <td>Intérêt légitime (sécurité du service)</td>
          </tr>
          <tr>
            <td>Jeton aléatoire d&apos;invité (cookie)</td>
            <td>Permettre de jouer sans compte et retrouver sa partie en cours</td>
            <td>Intérêt légitime, cookie strictement nécessaire</td>
          </tr>
        </tbody>
      </table>
      <p>
        Le site ne demande jamais d&apos;identifiants Rockstar, PlayStation Network, Xbox ou Steam et ne se connecte à aucun de ces services.
        Les pseudos de plateformes que tu choisis d&apos;afficher ne sont visibles que selon le réglage que tu leur donnes (public, contacts acceptés
        uniquement, ou visible par toi seul).
      </p>

      <h2 id="visibilite">Qui voit quoi</h2>
      <ul>
        <li>Ton profil public (pseudo, avatar, bio, jeux, plateformes, disponibilités) est visible par les visiteurs, sauf si un modérateur l&apos;a masqué.</li>
        <li>Ton adresse e-mail n&apos;est jamais affichée aux autres membres.</li>
        <li>Les messages ne sont lisibles que par les deux participants. Un modérateur peut voir un message uniquement s&apos;il lui a été signalé.</li>
        <li>Un garage privé n&apos;est visible que par toi. Un garage public apparaît sur ton profil et peut être partagé par son lien.</li>
        <li>Un membre que tu bloques ne voit plus tes pseudos de plateformes, ne peut plus t&apos;envoyer de demande ni de message.</li>
      </ul>

      <h2 id="conservation">Durées de conservation</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Données</th>
            <th scope="col">Durée</th>
          </tr>
        </thead>
        <tbody>
          {RETENTION.map((r) => (
            <tr key={r.data}>
              <td>{r.data}</td>
              <td>{r.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Une tâche automatique supprime chaque jour les données arrivées à échéance. Les sauvegardes techniques du fournisseur de base de données
        peuvent conserver une copie quelques jours de plus avant d&apos;être écrasées.
      </p>

      <h2 id="suppression">Suppression du compte</h2>
      <p>
        Depuis <Link href="/compte">Mon compte</Link>, la suppression demande ton mot de passe. Elle efface immédiatement ton compte, ton profil,
        tes pseudos de plateformes, ton avatar, tes garages, tes résultats, tes demandes de contact, tes notifications et tes conversations (elles
        disparaissent aussi pour ton interlocuteur). Les signalements te concernant sont conservés de façon anonymisée jusqu&apos;à leur
        échéance pour garder la trace des décisions de modération.
      </p>

      <h2 id="sous-traitants">Prestataires</h2>
      <ul>
        <li>
          <strong>{LEGAL.dataProcessor.name}</strong> : base de données, authentification, stockage des fichiers et envoi des e-mails de compte.
          Région : <Fill value={LEGAL.dataProcessor.region} label="région d'hébergement" />. Ce prestataire conserve aussi des journaux techniques
          (connexions, adresses IP) selon sa propre politique.
        </li>
        <li>
          <strong>{LEGAL.host.name}</strong> : hébergement et diffusion du site, journaux techniques des requêtes. Ce prestataire est établi aux
          États-Unis ; les transferts reposent sur les garanties qu&apos;il propose (clauses contractuelles types ou cadre de protection des données
          UE-États-Unis).
        </li>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <li>
            <strong>Cloudflare Turnstile</strong> : vérification anti-robot sur l&apos;inscription, la connexion et la réinitialisation du mot de
            passe. Cloudflare reçoit des informations techniques sur ton navigateur pour cette vérification.
          </li>
        )}
      </ul>
      <p>Aucune donnée n&apos;est vendue ni utilisée pour de la publicité ciblée. Le site n&apos;utilise aucun outil de mesure d&apos;audience tiers.</p>

      <h2 id="droits">Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les rectifier, les effacer, t&apos;opposer à certains traitements, en demander la limitation et la
        portabilité. La plupart de ces actions sont directes :
      </p>
      <ul>
        <li>
          modifier ton profil : <Link href="/compte/profil">Mon profil</Link> ;
        </li>
        <li>
          télécharger toutes tes données au format JSON : <Link href="/compte">Mon compte</Link>, « Exporter mes données » ;
        </li>
        <li>supprimer ton compte : <Link href="/compte">Mon compte</Link>, « Supprimer mon compte ».</li>
      </ul>
      <p>
        Pour toute autre demande, écris à <ContactEmail />. Une réponse t&apos;est apportée dans un délai de {LEGAL.privacyResponseDelay}. Si tu estimes que
        tes droits ne sont pas respectés, tu peux saisir la CNIL (
        <a href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer">
          cnil.fr/fr/plaintes
        </a>
        ).
      </p>

      <h2 id="cookies">Cookies</h2>
      <p>
        Le site n&apos;utilise que des cookies strictement nécessaires. Le détail est sur la page <Link href="/cookies">Cookies</Link>.
      </p>
    </LegalPage>
  );
}
