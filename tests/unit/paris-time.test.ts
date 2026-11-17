import { describe, expect, it } from "vitest";
import { addDays, monthBounds, nextChallengeReset, parisDate, parisMidnight } from "@/lib/utils/paris-time";

describe("Défi du jour : fuseau Europe/Paris", () => {
  it("change de jour à minuit heure de Paris, pas à minuit UTC", () => {
    // Hiver (UTC+1) : 23h30 UTC le 17 = 00h30 le 18 à Paris.
    expect(parisDate(new Date("2026-11-17T23:30:00Z"))).toBe("2026-11-18");
    expect(parisDate(new Date("2026-11-17T22:59:59Z"))).toBe("2026-11-17");
    // Été (UTC+2) : 22h30 UTC le 15 juillet = 00h30 le 16.
    expect(parisDate(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
  });
  it("calcule minuit Paris en hiver et en été", () => {
    expect(parisMidnight("2026-11-18").toISOString()).toBe("2026-11-17T23:00:00.000Z");
    expect(parisMidnight("2026-07-16").toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });
  it("gère les jours de changement d'heure (journées de 23 h et 25 h)", () => {
    // 29 mars 2026 : passage à l'heure d'été. 25 octobre 2026 : retour à l'heure d'hiver.
    expect(parisMidnight("2026-03-29").toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(parisMidnight("2026-03-30").toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(parisMidnight("2026-10-25").toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(parisMidnight("2026-10-26").toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(nextChallengeReset(new Date("2026-03-29T12:00:00Z")).toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(nextChallengeReset(new Date("2026-10-25T12:00:00Z")).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
  it("additionne des jours calendaires et borne les mois", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(monthBounds("2026-02-14")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});
