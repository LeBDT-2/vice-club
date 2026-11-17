/**
 * Informations légales centralisées. Toutes les pages légales lisent ce fichier.
 *
 * ⚠️ À COMPLÉTER PAR L'ÉDITEUR AVANT L'OUVERTURE PUBLIQUE. Rien n'est inventé ici :
 * un champ `null` s'affiche « à compléter » sur le site et apparaît dans la liste
 * `missingLegalFields()` (affichée dans l'administration).
 *
 * Rappel (LCEN, art. 6-III) : un éditeur non professionnel peut ne publier que
 * les coordonnées de l'hébergeur, à condition d'avoir communiqué son identité
 * complète à celui-ci. Dans ce cas, choisir `publisherKind: "particulier"` et
 * laisser `publisherAddress` à `null` volontairement en mettant
 * `publisherAnonymous: true`.
 */
export const LEGAL = {
  siteName: "VICE CLUB",

  /** "particulier" (éditeur non professionnel) ou "professionnel". */
  publisherKind: null as "particulier" | "professionnel" | null,
  /** Nom et prénom, ou dénomination sociale. */
  publisherName: null as string | null,
  /** true : éditeur non professionnel qui conserve l'anonymat (voir rappel ci-dessus). */
  publisherAnonymous: false,
  /** Adresse postale (obligatoire sauf anonymat autorisé). */
  publisherAddress: null as string | null,
  /** Professionnel uniquement : forme juridique, capital, RCS/SIREN, n° TVA. */
  publisherCompanyDetails: null as string | null,
  /** Directeur ou directrice de la publication. */
  publicationDirector: null as string | null,

  /** Adresse e-mail de contact affichée (contact, signalements, demandes RGPD). */
  contactEmail: null as string | null,
  /** Délai de réponse annoncé aux demandes d'exercice des droits. */
  privacyResponseDelay: "un mois",

  /** Hébergeur du site (Vercel, choisi dans le guide de déploiement). À confirmer. */
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
    website: "https://vercel.com",
    confirmed: false,
  },
  /** Sous-traitant base de données, authentification et stockage. */
  dataProcessor: {
    name: "Supabase Inc.",
    website: "https://supabase.com",
    /** Région d'hébergement des données choisie à la création du projet, ex. « Union européenne (Francfort) ». */
    region: null as string | null,
  },

  /** Date de dernière mise à jour des documents (AAAA-MM-JJ), à modifier à chaque révision. */
  lastUpdated: "2026-11-17",
} as const;

export type LegalField = { key: string; label: string };

/** Champs obligatoires encore vides : affichés dans l'admin et sur les pages légales. */
export function missingLegalFields(): LegalField[] {
  const missing: LegalField[] = [];
  if (!LEGAL.publisherKind) missing.push({ key: "publisherKind", label: "Statut de l'éditeur (particulier ou professionnel)" });
  if (!LEGAL.publisherName) missing.push({ key: "publisherName", label: "Nom de l'éditeur" });
  if (!LEGAL.publisherAddress && !(LEGAL.publisherKind === "particulier" && LEGAL.publisherAnonymous))
    missing.push({ key: "publisherAddress", label: "Adresse de l'éditeur" });
  if (LEGAL.publisherKind === "professionnel" && !LEGAL.publisherCompanyDetails)
    missing.push({ key: "publisherCompanyDetails", label: "Informations société (forme, RCS/SIREN, TVA)" });
  if (!LEGAL.publicationDirector) missing.push({ key: "publicationDirector", label: "Directeur de la publication" });
  if (!LEGAL.contactEmail) missing.push({ key: "contactEmail", label: "E-mail de contact" });
  if (!LEGAL.host.confirmed) missing.push({ key: "host", label: "Hébergeur à confirmer" });
  if (!LEGAL.dataProcessor.region) missing.push({ key: "dataProcessor.region", label: "Région d'hébergement Supabase" });
  return missing;
}

/** Durées de conservation appliquées par private.run_maintenance() (migration 20261117001000). */
export const RETENTION = [
  { data: "Compte, profil, pseudos de plateformes, garages, résultats de jeu", duration: "Jusqu'à la suppression du compte" },
  { data: "Messages privés et conversations", duration: "Jusqu'à la suppression du compte de l'un des deux participants" },
  { data: "Disponibilités déclarées", duration: "Supprimées un jour après leur fin" },
  { data: "Demandes de contact refusées ou retirées", duration: "180 jours" },
  { data: "Notifications", duration: "90 jours après lecture, un an au maximum" },
  { data: "Parties non terminées", duration: "7 jours" },
  { data: "Parties jouées sans compte (invité)", duration: "30 jours" },
  { data: "Compteurs anti-abus (empreintes d'adresse IP chiffrées par HMAC)", duration: "2 jours" },
  { data: "Signalements traités, y compris l'extrait conservé comme preuve", duration: "Un an après leur traitement" },
  { data: "Messages envoyés via le formulaire de contact", duration: "Un an après leur traitement" },
  { data: "Journal d'audit des actions de modération et d'administration", duration: "Un an" },
] as const;
