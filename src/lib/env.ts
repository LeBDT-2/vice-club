import { z } from "zod";

/**
 * Variables publiques (exposées au navigateur). Ne JAMAIS y ajouter de secret.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(10).optional().or(z.literal("").transform(() => undefined)),
});

const serverSchema = z.object({
  APP_ENV: z.enum(["local", "test", "preview", "production"]).default("local"),
  SUPABASE_SECRET_KEY: z.string().min(20),
  RATE_LIMIT_SALT: z.string().min(32, "RATE_LIMIT_SALT doit contenir au moins 32 caractères aléatoires"),
  ANTIBOT_DISABLED_ACKNOWLEDGED: z.enum(["true", "false"]).default("false"),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema> & PublicEnv;

function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

// Les variables NEXT_PUBLIC_* doivent être référencées littéralement pour être
// injectées dans le bundle client.
const rawPublic = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

let publicCache: PublicEnv | undefined;
export function publicEnv(): PublicEnv {
  if (publicCache) return publicCache;
  const parsed = publicSchema.safeParse(rawPublic);
  if (!parsed.success) {
    throw new Error(`Configuration publique invalide :\n${formatIssues(parsed.error)}`);
  }
  publicCache = parsed.data;
  return publicCache;
}

let serverCache: ServerEnv | undefined;
/** À n'appeler que depuis du code serveur. */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() appelé dans le navigateur");
  }
  if (serverCache) return serverCache;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Configuration serveur invalide :\n${formatIssues(parsed.error)}`);
  }
  const env = { ...parsed.data, ...publicEnv() };
  if (env.APP_ENV === "production") {
    if (!env.NEXT_PUBLIC_SITE_URL.startsWith("https://")) {
      throw new Error("NEXT_PUBLIC_SITE_URL doit être en HTTPS en production");
    }
    if (!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && env.ANTIBOT_DISABLED_ACKNOWLEDGED !== "true") {
      throw new Error(
        "Protection anti-bot absente en production : configurez NEXT_PUBLIC_TURNSTILE_SITE_KEY " +
          "(et la clé secrète dans Supabase Auth) ou acceptez explicitement le risque avec ANTIBOT_DISABLED_ACKNOWLEDGED=true.",
      );
    }
  }
  serverCache = env;
  return serverCache;
}

export function isProduction() {
  return process.env.APP_ENV === "production";
}
