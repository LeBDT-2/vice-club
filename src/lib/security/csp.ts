/**
 * Politique CSP stricte basée sur un nonce par requête.
 * - Scripts : uniquement 'self' + nonce (+ Turnstile si activé).
 * - Connexions : Supabase (REST, Auth, Realtime wss).
 * - Images : self, data/blob (aperçus), Storage Supabase.
 */
export function buildCsp(nonce: string, opts: { supabaseUrl: string; isDev: boolean; turnstile: boolean }) {
  const supabase = new URL(opts.supabaseUrl);
  const supabaseHttp = supabase.origin;
  const supabaseWs = `${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`;
  const turnstile = "https://challenges.cloudflare.com";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(opts.isDev ? ["'unsafe-eval'"] : []),
      ...(opts.turnstile ? [turnstile] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseHttp],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", supabaseHttp, supabaseWs, ...(opts.turnstile ? [turnstile] : [])],
    "frame-src": opts.turnstile ? [turnstile] : ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!opts.isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
