/** Fuseau de référence du défi du jour. */
export const CHALLENGE_TZ = "Europe/Paris";

/** Date calendaire (YYYY-MM-DD) à Paris pour un instant donné. */
export function parisDate(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHALLENGE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function offsetMinutesAt(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHALLENGE_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Instant UTC correspondant à minuit (début de journée) à Paris pour une date donnée. */
export function parisMidnight(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  // Deux passes pour gérer correctement les changements d'heure.
  let ts = guess.getTime() - offsetMinutesAt(guess) * 60000;
  ts = guess.getTime() - offsetMinutesAt(new Date(ts)) * 60000;
  return new Date(ts);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Prochaine réinitialisation du défi (minuit suivant à Paris). */
export function nextChallengeReset(at: Date = new Date()): Date {
  return parisMidnight(addDays(parisDate(at), 1));
}

export function formatParisDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = date.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
}
