import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff, roleAtLeast } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: { default: "Administration", template: "%s — Administration VICE CLUB" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Contrôle d'accès de premier niveau ; chaque page et chaque action le refait.
  const viewer = await requireStaff("moderator", "/admin");
  const isAdmin = roleAtLeast(viewer.role, "admin");
  const links = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/signalements", label: "Signalements" },
    { href: "/admin/utilisateurs", label: "Comptes" },
    ...(isAdmin
      ? [
          { href: "/admin/defis", label: "Défis du jour" },
          { href: "/admin/contenu/medias", label: "Médias" },
          { href: "/admin/contenu/jeux", label: "Jeux et plateformes" },
          { href: "/admin/contenu/vehicules", label: "Véhicules" },
          { href: "/admin/contenu/proprietes", label: "Propriétés" },
          { href: "/admin/contenu/cartes", label: "Cartes et lieux" },
          { href: "/admin/contenu/mystere", label: "Voiture mystère" },
          { href: "/admin/contenu/realite", label: "GTA ou réalité" },
          { href: "/admin/parametres", label: "Paramètres" },
          { href: "/admin/journal", label: "Journal d'audit" },
        ]
      : []),
  ];
  return (
    <div className="container-site grid gap-6 py-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Administration" className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-xs font-semibold text-muted">{isAdmin ? "Administrateur" : "Modérateur"} · {viewer.username}</p>
        <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {links.map((l) => (
            <li key={l.href} className="shrink-0">
              <Link href={l.href} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
