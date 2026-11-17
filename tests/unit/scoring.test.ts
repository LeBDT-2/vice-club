import { describe, expect, it } from "vitest";
import {
  MYSTERY_SCORES,
  WHERE_MAX_ROUND_SCORE,
  clampToMap,
  formatDistance,
  higherLowerCorrect,
  maxScoreFor,
  mysteryScore,
  mysteryShareGrid,
  pricesComparable,
  realityScore,
  whereScore,
} from "@/lib/games/scoring";

const map = { width: 2000, height: 1500 };
const diag = Math.hypot(2000, 1500);

describe("Où suis-je ? (distance → score)", () => {
  it("donne le score maximal sous 0,5 % de la diagonale", () => {
    expect(whereScore(0, map)).toBe(WHERE_MAX_ROUND_SCORE);
    expect(whereScore(diag * 0.005, map)).toBe(WHERE_MAX_ROUND_SCORE);
  });
  it("décroît strictement avec la distance", () => {
    const scores = [0.01, 0.05, 0.1, 0.3, 0.6].map((r) => whereScore(diag * r, map));
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThan(scores[i - 1]);
  });
  it("suit 5000 × exp(-10 × d / diagonale)", () => {
    expect(whereScore(diag * 0.1, map)).toBe(Math.round(5000 * Math.exp(-1)));
  });
  it("refuse les distances invalides", () => {
    expect(whereScore(-1, map)).toBe(0);
    expect(whereScore(Number.NaN, map)).toBe(0);
    expect(whereScore(Number.POSITIVE_INFINITY, map)).toBe(0);
  });
  it("n'affiche des mètres que si l'échelle est vérifiée", () => {
    expect(formatDistance(120, { ...map, scaleVerified: false, metersPerUnit: 2 })).toEqual({ value: 120, unit: "unités" });
    expect(formatDistance(120, { ...map, scaleVerified: true, metersPerUnit: 2 })).toEqual({ value: 240, unit: "m" });
    expect(formatDistance(1000, { ...map, scaleVerified: true, metersPerUnit: 2 })).toEqual({ value: 2, unit: "km" });
  });
  it("ramène un clic hors carte dans ses limites", () => {
    expect(clampToMap({ x: -50, y: 9999 }, map)).toEqual({ x: 0, y: 1500 });
  });
});

describe("Voiture mystère", () => {
  it("attribue les points selon l'essai", () => {
    MYSTERY_SCORES.forEach((pts, i) => expect(mysteryScore(i + 1, true)).toBe(pts));
  });
  it("donne 0 si non trouvée ou essai hors bornes", () => {
    expect(mysteryScore(2, false)).toBe(0);
    expect(mysteryScore(0, true)).toBe(0);
    expect(mysteryScore(7, true)).toBe(0);
    expect(mysteryScore(1.5, true)).toBe(0);
  });
  it("produit une grille de partage sans la réponse", () => {
    expect(mysteryShareGrid([false, true], true)).toBe("🟥🟩");
    expect(mysteryShareGrid([false, false], false)).toBe("🟥🟥⬛⬛⬛⬛");
  });
});

describe("Plus cher ou moins cher ?", () => {
  it("gère explicitement l'égalité", () => {
    expect(higherLowerCorrect(100, 100, "equal")).toBe(true);
    expect(higherLowerCorrect(100, 100, "a")).toBe(false);
    expect(higherLowerCorrect(100, 90, "equal")).toBe(false);
  });
  it("désigne le plus cher", () => {
    expect(higherLowerCorrect(100, 90, "a")).toBe(true);
    expect(higherLowerCorrect(100, 90, "b")).toBe(false);
    expect(higherLowerCorrect(80, 90, "b")).toBe(true);
  });
  it("ne compare que des prix du même jeu et du même type", () => {
    const base = { gameId: "g1", priceType: "achat", price: 10 };
    expect(pricesComparable(base, { ...base, price: 20 })).toBe(true);
    expect(pricesComparable(base, { ...base, gameId: "g2" })).toBe(false);
    expect(pricesComparable(base, { ...base, priceType: "location" })).toBe(false);
    expect(pricesComparable(base, { ...base, price: null })).toBe(false);
    expect(pricesComparable({ ...base, priceType: null }, { ...base, priceType: null })).toBe(false);
  });
});

describe("GTA ou réalité ? et maxima", () => {
  it("compte 100 points par bonne réponse", () => {
    expect(realityScore("gta", "gta")).toBe(100);
    expect(realityScore("gta", "reality")).toBe(0);
  });
  it("calcule le score maximal par jeu", () => {
    expect(maxScoreFor("where", 5)).toBe(25_000);
    expect(maxScoreFor("mystery", 1)).toBe(1000);
    expect(maxScoreFor("reality", 10)).toBe(1000);
    expect(maxScoreFor("higher_lower", 10)).toBe(10);
  });
});
