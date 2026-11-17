import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Règles de la communauté",
  description: "Ce qui est attendu de chaque membre de VICE CLUB, et ce qui se passe en cas de manquement.",
  alternates: { canonical: "/regles" },
};

const RULES = [
  {
    title: "Respecte les autres joueurs",
    body: "Pas d'insultes, de harcèlement, de menaces ni de messages répétés à quelqu'un qui ne répond pas. Un refus de demande de contact est une réponse.",
  },
  {
    title: "Zéro haine",
    body: "Aucun propos ou symbole visant une personne pour son origine, sa religion, son genre, son orientation, son handicap ou toute autre caractéristique.",
  },
  {
    title: "Contenu adapté à tous les membres",
    body: "Pas de contenu sexuel, violent hors contexte du jeu ou choquant dans les avatars, bios, noms de garages et messages.",
  },
  {
    title: "Club réservé aux adultes",
    body: "Les comptes sont réservés aux 18 ans et plus. Signale tout profil qui semble appartenir à un mineur.",
  },
  {
    title: "Sois toi-même",
    body: "Ne te fais pas passer pour un autre membre, un créateur de contenu, un modérateur ou un employé de Rockstar.",
  },
  {
    title: "Pas d'arnaques ni de spam",
    body: "Pas de vente de comptes, d'argent en jeu, de « boost », de liens douteux ou de publicité. Ne demande jamais les identifiants de quelqu'un.",
  },
  {
    title: "Joue honnêtement",
    body: "Pas de script, de partage de solutions du défi du jour ou d'exploitation de faille pour gonfler un score. Si tu trouves un bug, signale-le.",
  },
  {
    title: "Protège ta vie privée",
    body: "Ne publie ni adresse, ni numéro de téléphone, ni informations personnelles, les tiennes comme celles des autres.",
  },
];

export default function Regles() {
  return (
    <LegalPage
      title="Règles de la communauté"
      current="/regles"
      showMissing={false}
      intro={<p>Le club marche parce que chacun y trouve des joueurs sympas. Huit règles, appliquées à tout le monde de la même façon.</p>}
    >
      <ol className="!list-none !pl-0">
        {RULES.map((r, i) => (
          <li key={r.title} className="mt-5 grid grid-cols-[2.25rem_1fr] gap-3">
            <span aria-hidden="true" className="display text-2xl text-pink">
              {i + 1}
            </span>
            <div>
              <h2 className="!mt-0 !text-lg">{r.title}</h2>
              <p className="!mt-1">{r.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2>Bloquer et signaler</h2>
      <p>
        Depuis un profil ou une conversation, tu peux <strong>bloquer</strong> la personne : elle ne peut plus te contacter et ses demandes en
        attente sont closes. Chaque profil, garage et message peut aussi être <strong>signalé</strong>. Un extrait du contenu signalé est conservé pour que l&apos;équipe puisse l&apos;examiner
        même s&apos;il est modifié ensuite. L&apos;auteur ne sait pas qui l&apos;a signalé.
      </p>

      <h2>Ce qui se passe ensuite</h2>
      <ul>
        <li>Un contenu contraire aux règles peut être masqué : profil, garage ou message.</li>
        <li>Selon la gravité ou la répétition : suspension pour une durée définie, puis bannissement.</li>
        <li>Chaque décision est enregistrée avec sa raison, et la personne concernée voit cette raison à sa connexion.</li>
        <li>
          Une décision peut être contestée via la page <Link href="/contact">Contact et signalement</Link>.
        </li>
      </ul>
    </LegalPage>
  );
}
