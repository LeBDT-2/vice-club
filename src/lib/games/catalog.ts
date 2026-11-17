import type { GameKind } from "./scoring";

export type MiniGame = {
  slug: string;
  kind: GameKind | "garage";
  title: string;
  tagline: string;
  description: string;
  art: string;
};

/** Les cinq mini-jeux. Le défi du jour réutilise l'un des quatre jeux à score. */
export const MINI_GAMES: MiniGame[] = [
  {
    slug: "garage-ultime",
    kind: "garage",
    title: "Garage ultime",
    tagline: "Cinq bolides, un budget fictif.",
    description: "Compose ton garage idéal de cinq véhicules sans dépasser le budget, puis partage-le.",
    art: "garage",
  },
  {
    slug: "ou-suis-je",
    kind: "where",
    title: "Où suis-je ?",
    tagline: "Une capture, un repère sur la carte.",
    description: "Observe la scène et place ton repère. Plus tu es proche, plus tu marques de points.",
    art: "where",
  },
  {
    slug: "voiture-mystere",
    kind: "mystery",
    title: "Voiture mystère",
    tagline: "Six essais pour la reconnaître.",
    description: "L'image se dévoile à chaque erreur et des indices apparaissent. Trouve le modèle.",
    art: "mystery",
  },
  {
    slug: "plus-ou-moins-cher",
    kind: "higher_lower",
    title: "Plus cher ou moins cher ?",
    tagline: "Enchaîne les bonnes réponses.",
    description: "Deux véhicules ou propriétés du même jeu : lequel coûte le plus cher ? Une erreur et c'est fini.",
    art: "price",
  },
  {
    slug: "gta-ou-realite",
    kind: "reality",
    title: "GTA ou réalité ?",
    tagline: "Capture du jeu ou vraie photo ?",
    description: "Dix images, deux réponses possibles, et l'explication avec la source après chaque manche.",
    art: "reality",
  },
];

export const KIND_TO_SLUG: Record<GameKind, string> = {
  where: "ou-suis-je",
  mystery: "voiture-mystere",
  higher_lower: "plus-ou-moins-cher",
  reality: "gta-ou-realite",
};

export const KIND_LABEL: Record<GameKind, string> = {
  where: "Où suis-je ?",
  mystery: "Voiture mystère",
  higher_lower: "Plus cher ou moins cher ?",
  reality: "GTA ou réalité ?",
};
