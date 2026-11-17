/** Horloge serveur, isolée pour que les composants restent purs (règle react-hooks/purity). */
export function nowMs(): number {
  return Date.now();
}
