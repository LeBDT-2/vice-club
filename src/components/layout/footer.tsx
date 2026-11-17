import Link from "next/link";
import { Logo } from "./logo";

const groups = [
  {
    title: "Le club",
    links: [
      { href: "/joueurs", label: "Trouver des joueurs" },
      { href: "/mini-jeux", label: "Mini-jeux" },
      { href: "/defi-du-jour", label: "Défi du jour" },
      { href: "/classements", label: "Classements" },
      { href: "/mon-garage", label: "Mon garage" },
    ],
  },
  {
    title: "Communauté",
    links: [
      { href: "/regles", label: "Règles de la communauté" },
      { href: "/contact", label: "Contact et signalement" },
      { href: "/sources", label: "Sources et crédits des médias" },
    ],
  },
  {
    title: "Informations légales",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/conditions", label: "Conditions d'utilisation" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-deep">
      <div className="container-site grid gap-10 py-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm text-muted">
            Le club gratuit des joueurs de GTA : trouve des partenaires, compose ton garage et relève le défi du jour.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            VICE CLUB est un site communautaire non officiel, indépendant de Rockstar Games et de Take-Two Interactive, qui ne
            l&apos;approuvent ni ne le parrainent. Grand Theft Auto et GTA sont des marques de Take-Two Interactive.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="text-sm font-bold text-ink">{g.title}</h2>
            <ul className="mt-3 space-y-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line/60">
        <div className="container-site flex flex-col gap-2 py-5 text-xs text-faint sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} VICE CLUB — site gratuit, sans boutique ni abonnement.</p>
          <p>Aucune connexion à un compte Rockstar, PSN, Xbox ou Steam ne te sera jamais demandée.</p>
        </div>
      </div>
    </footer>
  );
}
