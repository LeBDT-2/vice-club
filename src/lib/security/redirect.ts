/**
 * Valide une URL de retour interne. Refuse tout ce qui pourrait mener hors du site :
 * URL absolues, schémas, "//", "/\\", caractères de contrôle, chemins d'API.
 */
export function safeNextPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    // Défense en profondeur : refuse aussi les caractères de contrôle encodés (%0d%0a…).
    if (/[\u0000-\u001f\u007f\\]/.test(decodeURIComponent(value))) return fallback;
    const url = new URL(value, "https://vice-club.invalid");
    if (url.origin !== "https://vice-club.invalid") return fallback;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
