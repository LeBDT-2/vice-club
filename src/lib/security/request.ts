import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * IP du client telle que transmise par la plateforme d'hébergement (Vercel renseigne
 * x-forwarded-for de manière fiable). Elle n'est JAMAIS stockée en clair : seule une
 * empreinte HMAC salée sert de clé de limitation de débit.
 */
export async function clientIpFingerprint(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return fingerprint(`ip:${ip}`);
}

export function fingerprint(value: string): string {
  return createHmac("sha256", serverEnv().RATE_LIMIT_SALT).update(value).digest("base64url").slice(0, 32);
}

/** Vérifie que la requête provient bien du site (défense CSRF des Route Handlers POST). */
export async function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const site = new URL(serverEnv().NEXT_PUBLIC_SITE_URL);
  const host = request.headers.get("host");
  if (!origin) throw new Error("origin_missing");
  const o = new URL(origin);
  if (o.host !== site.host && o.host !== host) throw new Error("origin_mismatch");
}
