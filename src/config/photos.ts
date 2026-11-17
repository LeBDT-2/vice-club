/**
 * Photos d'ambiance du site (fonds, bannières, cartes de mini-jeux).
 *
 * Toutes proviennent de Wikimedia Commons, sous licence libre (CC0, domaine public,
 * CC BY ou CC BY-SA), et sont créditées sur /sources. Ce sont de VRAIES photos
 * (Miami Beach, voitures de collection…), jamais des captures de jeu ni des images
 * de Rockstar Games. Modifications : recadrage, redimensionnement, conversion WebP,
 * et sur le site assombrissement et dégradés de couleur pour la lisibilité.
 *
 * Pour en ajouter une : vérifier la licence sur la page Commons, déposer le fichier
 * dans public/ambiance/ et compléter ce tableau (auteur, licence, lien).
 */

export type PhotoLicense = "CC0" | "Domaine public" | "CC BY 2.0" | "CC BY 3.0" | "CC BY 4.0" | "CC BY-SA 2.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0";

export type Photo = {
  src: string;
  width: number;
  height: number;
  /** Texte alternatif (utilisé quand la photo porte une information). */
  alt: string;
  /** Légende courte affichée sur le site (lieu ou modèle). */
  caption: string;
  author: string;
  license: PhotoLicense;
  sourceUrl: string;
};

export const LICENSE_URL: Record<PhotoLicense, string | null> = {
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/deed.fr",
  "Domaine public": null,
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/deed.fr",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/deed.fr",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/deed.fr",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/deed.fr",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/deed.fr",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/deed.fr",
};

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const PHOTOS = {
  nuitPorsche: {
    src: "/ambiance/nuit-porsche.webp", width: 1920, height: 837,
    alt: "Porsche 911 vue de l'arrière, feux allumés, sur une rue mouillée la nuit",
    caption: "Porsche 911 sous la pluie", author: "Gabriel Gurrola", license: "CC0",
    sourceUrl: commons("Porsche_911_on_a_rainy_evening_(Unsplash).jpg"),
  },
  coucherPalmiers: {
    src: "/ambiance/coucher-palmiers.webp", width: 1920, height: 1277,
    alt: "Silhouettes de palmiers devant un ciel violet et orange au coucher du soleil",
    caption: "Palmiers au coucher du soleil, Venice Beach", author: "Stuart Guest-Smith", license: "CC0",
    sourceUrl: commons("Venice_Beach_palm_trees_at_sunset_(Unsplash).jpg"),
  },
  palmiersOrange: {
    src: "/ambiance/palmiers-orange.webp", width: 1920, height: 1285,
    alt: "Palmiers en contre-jour sur un ciel orange vif",
    caption: "Coucher de soleil, Fort Lauderdale", author: "Matt H. Wade", license: "CC BY-SA 3.0",
    sourceUrl: commons("Palm_Trees_at_Sunset_in_Fort_Lauderdale.JPG"),
  },
  miamiCrepuscule: {
    src: "/ambiance/miami-crepuscule.webp", width: 1920, height: 1080,
    alt: "Gratte-ciel de Miami illuminés au crépuscule sous un ciel violet",
    caption: "Miami au crépuscule", author: "Joe deSousa", license: "CC0",
    sourceUrl: commons("Miami_Sunset_(45863661094).jpg"),
  },
  miamiPanoramaNuit: {
    src: "/ambiance/miami-panorama-nuit.webp", width: 1920, height: 486,
    alt: "Panorama des tours de Miami à la tombée de la nuit",
    caption: "Panorama de Miami", author: "Joe deSousa", license: "CC0",
    sourceUrl: commons("Miami_Skyline_(45860413504).jpg"),
  },
  miamiOrange: {
    src: "/ambiance/miami-orange.webp", width: 1920, height: 1440,
    alt: "Silhouette de Miami sous un ciel rouge et orange qui se reflète dans la baie",
    caption: "Coucher de soleil sur Miami", author: "Averette", license: "CC BY 3.0",
    sourceUrl: commons("2007_Miami_sunset_3.jpg"),
  },
  oceanDriveBleu: {
    src: "/ambiance/ocean-drive-bleu.webp", width: 1920, height: 1275,
    alt: "Hôtels Art déco éclairés d'Ocean Drive à l'heure bleue",
    caption: "Ocean Drive, Miami Beach", author: "chensiyuan", license: "CC BY-SA 4.0",
    sourceUrl: commons("Ocean_drive_south_beach_miami_night.JPG"),
  },
  oceanDrivePluie: {
    src: "/ambiance/ocean-drive-pluie.webp", width: 1920, height: 1536,
    alt: "Néons roses et bleus d'Ocean Drive reflétés sur la chaussée mouillée",
    caption: "Ocean Drive sous la pluie", author: "Tamanoeconomico", license: "CC BY-SA 4.0",
    sourceUrl: commons("Ocean_Drive_at_Night_(1).jpg"),
  },
  oceanDriveNeons: {
    src: "/ambiance/ocean-drive-neons.webp", width: 1920, height: 1536,
    alt: "Façades d'hôtels éclairées en violet et bleu, palmiers et terrasses la nuit",
    caption: "Ocean Drive la nuit", author: "Tamanoeconomico", license: "CC BY-SA 4.0",
    sourceUrl: commons("Ocean_Drive_at_Night_(3).jpg"),
  },
  colonyHotel: {
    src: "/ambiance/colony-hotel.webp", width: 1920, height: 1282,
    alt: "Enseigne néon bleue d'un hôtel Art déco la nuit",
    caption: "Enseignes d'Ocean Drive", author: "Leonardo Dasilva", license: "CC BY 2.0",
    sourceUrl: commons("Miami_FL_Ocean_Drive-02.jpg"),
  },
  boulevardHotel: {
    src: "/ambiance/boulevard-hotel.webp", width: 1920, height: 1281,
    alt: "Enseigne néon rouge et orange d'un hôtel de Miami Beach",
    caption: "Enseigne néon, Miami Beach", author: "Radomianin", license: "Domaine public",
    sourceUrl: commons("Boulevard_Hotel_(Neon_sign),_Miami_Beach.jpg"),
  },
  oceanDriveVert: {
    src: "/ambiance/ocean-drive-vert.webp", width: 1920, height: 1046,
    alt: "Hôtels éclairés en vert, violet et bleu le long d'Ocean Drive",
    caption: "Ocean Drive la nuit", author: "Gzzz", license: "CC BY-SA 4.0",
    sourceUrl: commons("Ocean_Drive_by_night_2.jpg"),
  },
  oceanDriveReflets: {
    src: "/ambiance/ocean-drive-reflets.webp", width: 1920, height: 1440,
    alt: "Feux rouges et néons reflétés sur une rue mouillée de South Beach",
    caption: "South Beach la nuit", author: "Tamanoeconomico", license: "CC BY-SA 4.0",
    sourceUrl: commons("South_Beach_at_Night_(1).jpg"),
  },
  countachNeons: {
    src: "/ambiance/countach-neons.webp", width: 1920, height: 1440,
    alt: "Lamborghini Countach noire éclairée par des projecteurs rouges et bleus",
    caption: "Lamborghini Countach", author: "Dani Yumey", license: "CC BY-SA 4.0",
    sourceUrl: commons("Lamborghini_Countach_ORGINS.jpg"),
  },
  countachOrange: {
    src: "/ambiance/countach-orange.webp", width: 1920, height: 1044,
    alt: "Lamborghini Countach orange vue de trois quarts",
    caption: "Lamborghini Countach 25th Anniversary", author: "Alexander Migl", license: "CC BY-SA 4.0",
    sourceUrl: commons("Lamborghini_Countach_25th_Anniversary_IMG_2994.jpg"),
  },
  countachRose: {
    src: "/ambiance/countach-rose.webp", width: 1920, height: 1271,
    alt: "Lamborghini Countach rouge framboise vue de face",
    caption: "Lamborghini Countach 1989", author: "Calreyn88", license: "CC BY-SA 4.0",
    sourceUrl: commons("1989_Lamborghini_Countach_25th_Anniversary.jpg"),
  },
  countachBleue: {
    src: "/ambiance/countach-bleue.webp", width: 1920, height: 1032,
    alt: "Lamborghini Countach bleue avec aileron",
    caption: "Lamborghini Countach", author: "Calreyn88", license: "CC BY-SA 4.0",
    sourceUrl: commons("Lamborghini_Countach_17.jpg"),
  },
  testarossa: {
    src: "/ambiance/testarossa-rouge.webp", width: 1920, height: 880,
    alt: "Ferrari Testarossa rouge vue de trois quarts",
    caption: "Ferrari Testarossa", author: "TTTNIS", license: "Domaine public",
    sourceUrl: commons("Ferrari_Testarossa_01.jpg"),
  },
  porschePluie: {
    src: "/ambiance/porsche-pluie.webp", width: 1920, height: 1313,
    alt: "Porsche 911 rouge garée sur une rue mouillée la nuit",
    caption: "Porsche 911 la nuit", author: "Ben", license: "CC BY-SA 2.0",
    sourceUrl: commons("Porsche_Porsche_at_night_(8169422529).jpg"),
  },
  ferrariNoire: {
    src: "/ambiance/ferrari-noire-pluie.webp", width: 1050, height: 1400,
    alt: "Ferrari F12 noire sous la pluie, rue éclairée la nuit",
    caption: "Ferrari F12 sous la pluie", author: "Ank Kumar", license: "CC BY-SA 4.0",
    sourceUrl: commons("Ferrari_F12,_Zurich_08.jpg"),
  },
  posteSecours: {
    src: "/ambiance/poste-secours.webp", width: 1920, height: 864,
    alt: "Poste de secours vert et jaune sur la plage de Miami Beach",
    caption: "Poste de secours, Miami Beach", author: "Elbert Hampton", license: "CC0",
    sourceUrl: commons("Lifeguard_tower_in_Miami_Beach_-_november_2022.jpg"),
  },
  posteSecoursViolet: {
    src: "/ambiance/poste-secours-violet.webp", width: 1920, height: 1280,
    alt: "Poste de secours violet et orange sur le sable de Miami Beach",
    caption: "Poste de secours, Miami Beach", author: "Radomianin", license: "CC BY-SA 4.0",
    sourceUrl: commons("Lifeguard_stand,_Miami_Beach.jpg"),
  },
  skateurCoucher: {
    src: "/ambiance/skateur-coucher.webp", width: 1920, height: 1277,
    alt: "Silhouette d'un skateur en plein saut au coucher du soleil",
    caption: "Skateur au coucher du soleil", author: "Luis Ezcurdia", license: "CC BY-SA 3.0",
    sourceUrl: commons("Skateboarding_Siluette_(188984837).jpeg"),
  },
  skateurPalmiers: {
    src: "/ambiance/skateur-palmiers.webp", width: 1920, height: 1280,
    alt: "Silhouette d'un skateur entre des palmiers face à la mer",
    caption: "Skateur en bord de mer", author: "bigwavephoto", license: "CC BY-SA 4.0",
    sourceUrl: commons("Silhouette_of_skateboarder.jpg"),
  },
  skateRoute: {
    src: "/ambiance/skate-route.webp", width: 1920, height: 1280,
    alt: "Skateur au milieu d'une route bordée de pins au coucher du soleil",
    caption: "Skate au coucher du soleil", author: "Sandis Helvigs", license: "CC0",
    sourceUrl: commons("Skateboarding_road_on_sunset_(Unsplash).jpg"),
  },
  longboardSoleil: {
    src: "/ambiance/longboard-soleil.webp", width: 1920, height: 1280,
    alt: "Pieds d'un skateur sur un longboard, soleil rasant",
    caption: "Longboard au soleil couchant", author: "Drew Hays", license: "CC0",
    sourceUrl: commons("Northern_Iowa_skateboarder_(Unsplash).jpg"),
  },
  promeneurs: {
    src: "/ambiance/promeneurs-ocean-drive.webp", width: 1920, height: 1536,
    alt: "Promeneurs sur un trottoir de South Beach sous les palmiers éclairés",
    caption: "Promeneurs à South Beach", author: "Tamanoeconomico", license: "CC BY-SA 4.0",
    sourceUrl: commons("South_Beach_at_Night_(3).jpg"),
  },
} as const satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
