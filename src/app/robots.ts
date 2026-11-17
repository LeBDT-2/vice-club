import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  // Hors production (préversions Vercel, local), rien n'est indexable.
  if (process.env.APP_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/auth/",
          "/compte",
          "/messages",
          "/demandes",
          "/notifications",
          "/mes-resultats",
          "/mon-garage",
          "/bienvenue",
          "/acces-refuse",
          "/connexion",
          "/inscription",
          "/mot-de-passe-oublie",
          "/reinitialiser-mot-de-passe",
          "/mini-jeux/*/partie/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
