import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, Fill, LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/config/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et informations légales de VICE CLUB.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegales() {
  const anonymous = LEGAL.publisherKind === "particulier" && LEGAL.publisherAnonymous;
  return (
    <LegalPage title="Mentions légales" current="/mentions-legales">
      <h2>Éditeur du site</h2>
      {anonymous ? (
        <p>
          Le site {LEGAL.siteName} est édité par un particulier, à titre non professionnel. Conformément à l&apos;article 6-III-2 de la loi
          n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique, son identité a été communiquée à l&apos;hébergeur
          ci-dessous, qui la tient à disposition des autorités.
        </p>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
          <dt className="font-semibold text-ink">Éditeur</dt>
          <dd>
            <Fill value={LEGAL.publisherName} label="nom ou dénomination" />
            {LEGAL.publisherKind === "particulier" && " (particulier, à titre non professionnel)"}
          </dd>
          <dt className="font-semibold text-ink">Adresse</dt>
          <dd>
            <Fill value={LEGAL.publisherAddress} label="adresse postale" />
          </dd>
          {LEGAL.publisherKind !== "particulier" && (
            <>
              <dt className="font-semibold text-ink">Société</dt>
              <dd>
                <Fill value={LEGAL.publisherCompanyDetails} label="forme juridique, RCS ou SIREN, TVA" />
              </dd>
            </>
          )}
        </dl>
      )}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
        <dt className="font-semibold text-ink">Directeur de la publication</dt>
        <dd>
          <Fill value={LEGAL.publicationDirector} label="nom" />
        </dd>
        <dt className="font-semibold text-ink">Contact</dt>
        <dd>
          <ContactEmail /> ou le <Link href="/contact">formulaire de contact</Link>
        </dd>
      </dl>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>{LEGAL.host.name}</strong>, {LEGAL.host.address} (
        <a href={LEGAL.host.website} rel="noopener noreferrer">
          {LEGAL.host.website.replace("https://", "")}
        </a>
        ).{!LEGAL.host.confirmed && <> <Fill value={null} label="hébergeur à confirmer au déploiement" /></>}
      </p>
      <p>
        La base de données, l&apos;authentification et le stockage des fichiers sont fournis par <strong>{LEGAL.dataProcessor.name}</strong> (
        <a href={LEGAL.dataProcessor.website} rel="noopener noreferrer">
          {LEGAL.dataProcessor.website.replace("https://", "")}
        </a>
        ), région : <Fill value={LEGAL.dataProcessor.region} label="région d'hébergement" />.
      </p>

      <h2>Site non officiel</h2>
      <p>
        {LEGAL.siteName} est un site communautaire indépendant et gratuit. Il n&apos;est ni affilié, ni approuvé, ni parrainé par Rockstar Games ou
        Take-Two Interactive. Grand Theft Auto, GTA et les noms, logos et visuels associés sont des marques et contenus de leurs propriétaires
        respectifs, cités uniquement pour désigner les jeux dont parle la communauté.
      </p>
      <p>
        Le site ne se connecte à aucun compte Rockstar, PlayStation Network, Xbox ou Steam et ne demande jamais d&apos;identifiants de ces
        services. Les pseudos de plateformes affichés sont saisis librement par les membres.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le code, la charte graphique et le logo du site appartiennent à son éditeur. Les photos d&apos;ambiance sont des photos sous licence libre
        de Wikimedia Commons. Les visuels officiels de GTA VI et les captures de GTA V restent la propriété de Rockstar Games et Take-Two Interactive ; eux aussi sont utilisés avec la source, l&apos;auteur et la licence indiqués sur la page{" "}
        <Link href="/sources">Sources et crédits des médias</Link>. Un ayant droit qui conteste une utilisation peut écrire à <ContactEmail /> :
        le média concerné est retiré pendant l&apos;examen de la demande.
      </p>
      <p>
        Les contenus publiés par les membres (profils, garages, messages) restent sous leur responsabilité, dans le respect des{" "}
        <Link href="/conditions">conditions d&apos;utilisation</Link>.
      </p>

      <h2>Signaler un contenu illicite</h2>
      <p>
        Chaque profil, garage et message dispose d&apos;un bouton « Signaler ». Tu peux aussi écrire à <ContactEmail /> en précisant
        l&apos;adresse de la page et la raison du signalement. Voir <Link href="/contact">Contact et signalement</Link>.
      </p>
    </LegalPage>
  );
}
