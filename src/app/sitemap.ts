import type { MetadataRoute } from "next";
import { MINI_GAMES } from "@/lib/games/catalog";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Pages publiques et stables uniquement : aucun profil ni garage de membre n'y figure. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; freq: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", freq: "daily", priority: 1 },
    { path: "/joueurs", freq: "daily", priority: 0.9 },
    { path: "/mini-jeux", freq: "weekly", priority: 0.9 },
    { path: "/defi-du-jour", freq: "daily", priority: 0.9 },
    { path: "/classements", freq: "daily", priority: 0.6 },
    ...MINI_GAMES.map((g) => ({ path: `/mini-jeux/${g.slug}`, freq: "weekly" as const, priority: 0.7 })),
    { path: "/regles", freq: "yearly", priority: 0.3 },
    { path: "/contact", freq: "yearly", priority: 0.3 },
    { path: "/sources", freq: "monthly", priority: 0.2 },
    { path: "/mentions-legales", freq: "yearly", priority: 0.2 },
    { path: "/confidentialite", freq: "yearly", priority: 0.2 },
    { path: "/conditions", freq: "yearly", priority: 0.2 },
    { path: "/cookies", freq: "yearly", priority: 0.2 },
  ];
  return pages.map((p) => ({ url: `${siteUrl}${p.path}`, changeFrequency: p.freq, priority: p.priority }));
}
