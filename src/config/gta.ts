/**
 * Visuels officiels de Grand Theft Auto VI, repris du site officiel de Rockstar Games
 * (https://www.rockstargames.com/VI) avec l'accord explicite du porteur du projet, qui
 * accepte le risque d'une demande de retrait. Chaque image cite sa source ; le site reste
 * un fan-site non officiel, sans lien avec Rockstar Games ni Take-Two Interactive.
 * Le logo GTA VI n'est jamais utilisé comme logo de VICE CLUB.
 */
export const GTA6_SOURCE_URL = "https://www.rockstargames.com/VI";
export const GTA6_CREDIT = "© Rockstar Games / Take-Two Interactive, visuel officiel";

/** Date de sortie affichée par Rockstar sur le visuel officiel (heure de Paris, minuit). */
export const GTA6_RELEASE = { iso: "2026-11-19T00:00:00+01:00", label: "19 novembre 2026" };

export type GtaVisual = { src: string; width: number; height: number; alt: string; caption: string };

export const GTA6 = {
  logo: { src: "/gta/logo-gta-vi.webp", width: 800, height: 619, alt: "Logo de Grand Theft Auto VI", caption: "Logo officiel" },
  keyArt: {
    src: "/gta/key-art.webp",
    width: 1920,
    height: 1080,
    alt: "Affiche officielle de GTA VI : Jason et Lucia devant Vice City, sortie le 19 novembre 2026",
    caption: "Affiche officielle",
  },
  jasonLuciaVille: {
    src: "/gta/jason-lucia-ville.webp",
    width: 1920,
    height: 1080,
    alt: "Jason et Lucia sur un toit dominant Vice City au crépuscule",
    caption: "Jason et Lucia au-dessus de Vice City",
  },
  jasonLuciaPalmiers: {
    src: "/gta/jason-lucia-palmiers.webp",
    width: 1920,
    height: 1080,
    alt: "Jason et Lucia devant une voiture rouge, palmiers et ciel rose",
    caption: "Jason et Lucia, bande-annonce de lancement",
  },
  crepuscule: { src: "/gta/vice-city-crepuscule.webp", width: 1920, height: 1080, alt: "Vice City illuminée au crépuscule", caption: "Vice City au crépuscule" },
  skyline: { src: "/gta/vice-city-skyline.webp", width: 1920, height: 1080, alt: "Les tours de Vice City au bord de l'eau", caption: "Les tours de Vice City" },
  plage: { src: "/gta/plage-voiture-verte.webp", width: 1920, height: 1080, alt: "Un couple et une voiture de sport verte sur une plage de Vice City", caption: "Sur la plage de Vice City" },
  cheetah: { src: "/gta/grotti-cheetah.webp", width: 1600, height: 900, alt: "Grotti Cheetah blanche devant un immeuble Art déco", caption: "Grotti Cheetah" },
  squalo: { src: "/gta/squalo.webp", width: 1600, height: 900, alt: "Bateau Squalo filant devant les tours de Vice City", caption: "Squalo" },
  ganado: { src: "/gta/vapid-ganado.webp", width: 1600, height: 900, alt: "Pick-up Vapid Ganado jaune au bord de l'océan", caption: "Vapid Ganado" },
  wyman: { src: "/gta/wyman-collection.webp", width: 1600, height: 900, alt: "Voiture de course rouge numéro 36 de la collection Wyman", caption: "Collection Wyman" },
  stanier: { src: "/gta/vapid-stanier.webp", width: 1600, height: 900, alt: "Deux personnages dans un taxi Vapid Stanier jaune, éclairage violet", caption: "Vapid Stanier" },
  leonida: { src: "/gta/only-in-leonida.webp", width: 1920, height: 768, alt: "Un homme dans une bouée rose au milieu d'une piscine", caption: "Only in Leonida" },
  radio: { src: "/gta/radio-leonida.webp", width: 1920, height: 768, alt: "Un couple adossé à une voiture, couleurs pastel", caption: "Radios de Leonida" },
} satisfies Record<string, GtaVisual>;

export type Gta6Key = keyof typeof GTA6;

/** Galerie de la section GTA VI de l'accueil. */
export const GTA6_GALLERY: Gta6Key[] = ["cheetah", "squalo", "ganado", "wyman", "stanier", "plage"];

/** Visuel GTA VI de chaque mini-jeu (cartes verticales) et son cadrage. */
export const GAME_VISUAL: Record<string, { key: Gta6Key; position: string }> = {
  garage: { key: "wyman", position: "42% center" },
  where: { key: "crepuscule", position: "62% center" },
  mystery: { key: "cheetah", position: "52% center" },
  price: { key: "ganado", position: "48% center" },
  reality: { key: "plage", position: "45% center" },
};
