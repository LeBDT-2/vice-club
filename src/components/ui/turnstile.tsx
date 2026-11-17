import Script from "next/script";
import { headers } from "next/headers";

/**
 * Widget anti-bot Cloudflare Turnstile. Le jeton est vérifié CÔTÉ SERVEUR par
 * Supabase Auth (captcha activé dans la configuration Auth). Rien n'est rendu si
 * aucune clé de site n'est configurée (développement local).
 */
export async function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language="fr" data-theme="dark" />
    </>
  );
}
