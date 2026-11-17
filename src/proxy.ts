import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/security/csp";

/**
 * Proxy (ex-middleware) :
 *  1. rafraîchit la session Supabase (cookies) — recommandation officielle @supabase/ssr ;
 *  2. génère un nonce CSP par requête.
 * Il ne fait AUCUN contrôle d'autorisation : chaque page, Server Action et Route Handler
 * vérifie elle-même l'utilisateur côté serveur.
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    isDev: process.env.NODE_ENV === "development",
    turnstile: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.assign(cacheHeaders, headers ?? {});
        },
      },
    },
  );

  // Ne rien intercaler entre la création du client et getClaims().
  await supabase.auth.getClaims();

  for (const [k, v] of Object.entries(cacheHeaders)) response.headers.set(k, v);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|art/|ambiance/|gta/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
