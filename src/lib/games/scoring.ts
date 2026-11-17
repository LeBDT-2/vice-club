/**
 * Règles de score des mini-jeux. Fonctions pures, exécutées UNIQUEMENT côté serveur
 * pour le calcul officiel (le navigateur n'envoie jamais de score).
 * Toutes les règles sont décrites dans docs/JEUX.md.
 */

// ---------------------------------------------------------------- Où suis-je ?
export const WHERE_MAX_ROUND_SCORE = 5000;
export const WHERE_ROUNDS = 5;

export type MapGeometry = { width: number; height: number; scaleVerified: boolean; metersPerUnit: number | null };

export function mapDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Score = 5000 × exp(-10 × d / diagonale). Plein score sous 0,5 % de la diagonale.
 * Ne dépend que du repère de la carte (aucune échelle réelle supposée).
 */
export function whereScore(distance: number, map: Pick<MapGeometry, "width" | "height">): number {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  const diagonal = Math.hypot(map.width, map.height);
  const ratio = distance / diagonal;
  if (ratio <= 0.005) return WHERE_MAX_ROUND_SCORE;
  return Math.max(0, Math.round(WHERE_MAX_ROUND_SCORE * Math.exp(-10 * ratio)));
}

/** Distance affichable : mètres uniquement si l'échelle de la carte est vérifiée. */
export function formatDistance(distance: number, map: MapGeometry): { value: number; unit: "m" | "km" | "unités" } {
  if (map.scaleVerified && map.metersPerUnit) {
    const meters = distance * map.metersPerUnit;
    return meters >= 1000 ? { value: Math.round(meters / 100) / 10, unit: "km" } : { value: Math.round(meters), unit: "m" };
  }
  return { value: Math.round(distance), unit: "unités" };
}

export function clampToMap(point: { x: number; y: number }, map: Pick<MapGeometry, "width" | "height">) {
  return {
    x: Math.min(Math.max(point.x, 0), map.width),
    y: Math.min(Math.max(point.y, 0), map.height),
  };
}

// ----------------------------------------------------------- Voiture mystère
export const MYSTERY_MAX_ATTEMPTS = 6;
export const MYSTERY_SCORES = [1000, 800, 600, 400, 250, 100] as const;

/** attemptNumber : 1..6 (essai où la bonne réponse a été trouvée). */
export function mysteryScore(attemptNumber: number, solved: boolean): number {
  if (!solved) return 0;
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > MYSTERY_MAX_ATTEMPTS) return 0;
  return MYSTERY_SCORES[attemptNumber - 1];
}

/** Grille partageable sans dévoiler la réponse. */
export function mysteryShareGrid(attempts: boolean[], solved: boolean): string {
  const cells: string[] = attempts.map((ok) => (ok ? "🟩" : "🟥"));
  while (cells.length < MYSTERY_MAX_ATTEMPTS && !solved) cells.push("⬛");
  return cells.join("");
}

// --------------------------------------------------- Plus cher ou moins cher ?
export type PriceChoice = "a" | "b" | "equal";

/**
 * Égalités gérées explicitement : si les deux prix sont identiques, seule la réponse
 * « Même prix » est correcte ; sinon la réponse doit désigner l'élément le plus cher.
 */
export function higherLowerCorrect(priceA: number, priceB: number, choice: PriceChoice): boolean {
  if (priceA === priceB) return choice === "equal";
  if (choice === "equal") return false;
  return priceA > priceB ? choice === "a" : choice === "b";
}

/** Deux éléments ne sont comparables que s'ils viennent du même jeu avec le même type de prix. */
export function pricesComparable(
  a: { gameId: string; priceType: string | null; price: number | null },
  b: { gameId: string; priceType: string | null; price: number | null },
) {
  return (
    a.gameId === b.gameId && a.priceType !== null && a.priceType === b.priceType && a.price !== null && b.price !== null
  );
}

export const HIGHER_LOWER_DAILY_ROUNDS = 10;
export const HIGHER_LOWER_TRAINING_MAX = 50;

// ---------------------------------------------------------- GTA ou réalité ?
export const REALITY_ROUNDS = 10;
export const REALITY_POINTS = 100;

export function realityScore(answer: "gta" | "reality", truth: "gta" | "reality") {
  return answer === truth ? REALITY_POINTS : 0;
}

export function maxScoreFor(kind: GameKind, rounds: number): number | null {
  switch (kind) {
    case "where":
      return rounds * WHERE_MAX_ROUND_SCORE;
    case "mystery":
      return rounds * MYSTERY_SCORES[0];
    case "reality":
      return rounds * REALITY_POINTS;
    case "higher_lower":
      return rounds;
  }
}

export type GameKind = "where" | "mystery" | "higher_lower" | "reality";
