/** Prix dans le jeu (dollars du jeu). */
export function formatGamePrice(n: number) {
  return `${n.toLocaleString("fr-FR")} $`;
}

/** Coût fictif du mini-jeu Garage ultime (VC$, sans lien avec les prix du jeu). */
export function formatVc(n: number) {
  return `${n.toLocaleString("fr-FR")} VC$`;
}

export function formatScore(n: number) {
  return n.toLocaleString("fr-FR");
}

export function formatDateFr(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));
}
