import type { GameKind } from "./scoring";

/** Règles affichées aux joueurs (reprises et détaillées dans docs/JEUX.md). */
export const RULES: Record<GameKind | "garage", string[]> = {
  garage: [
    "Choisis jusqu'à 5 véhicules différents dans le catalogue.",
    "Le total des coûts fictifs ne doit pas dépasser le budget affiché. Ce budget est propre au mini-jeu : il n'a rien à voir avec les prix du jeu.",
    "Donne un nom à ton garage, choisis s'il est privé ou public, puis partage son lien.",
  ],
  where: [
    "5 manches : une capture d'écran, puis tu places ton repère sur la carte.",
    "Chaque manche rapporte jusqu'à 5 000 points selon la distance entre ton repère et le lieu réel, mesurée dans le repère de la carte.",
    "Les distances ne sont affichées en mètres que si l'échelle de la carte a été vérifiée.",
  ],
  mystery: [
    "Une voiture cachée, 6 essais. Chaque erreur dévoile un peu plus l'image et ajoute un indice.",
    "Points selon l'essai gagnant : 1 000, 800, 600, 400, 250 puis 100.",
    "Le résultat partageable ne révèle pas la réponse.",
  ],
  higher_lower: [
    "Deux véhicules ou propriétés du même jeu, avec le même type de prix : lequel coûte le plus cher ?",
    "Si les prix sont identiques, seule la réponse « Même prix » est correcte.",
    "Chaque bonne réponse prolonge ta série. Une erreur et la partie s'arrête.",
  ],
  reality: [
    "10 images : capture d'un jeu GTA ou vraie photo ?",
    "100 points par bonne réponse. Après chaque manche, l'explication et la source de l'image s'affichent.",
    "Aucune image générée par IA n'est présentée comme une photo réelle.",
  ],
};

export const START_ERRORS: Record<string, string> = {
  no_content: "Ce mini-jeu n'a pas encore assez de contenu publié. Reviens bientôt.",
  no_challenge: "Aucun défi n'est programmé pour ce jeu aujourd'hui.",
  already_played: "Tu as déjà joué le défi du jour.",
  rate_limited: "Tu as lancé beaucoup de parties. Patiente un peu avant de recommencer.",
};
