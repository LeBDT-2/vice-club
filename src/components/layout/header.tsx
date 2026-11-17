import Link from "next/link";
import { getViewer, roleAtLeast } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileMenu } from "./mobile-menu";
import { UserMenu } from "./user-menu";

function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-pink px-1 text-[0.7rem] font-bold leading-5 text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function IconLink({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) {
  const text = count > 0 ? `${label} (${count} non lu${count > 1 ? "s" : ""})` : label;
  return (
    <Link href={href} className="relative inline-grid size-11 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink" aria-label={text}>
      <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
      <CountBadge n={count} />
    </Link>
  );
}

export async function Header() {
  const viewer = await getViewer();
  let counts = { messages: 0, notifications: 0, requests: 0 };
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("unread_counts");
    if (data?.[0]) counts = data[0];
  }

  const signOut = (
    <form action={signOutAction}>
      <button type="submit" className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-muted hover:bg-panel-2 hover:text-ink">
        Se déconnecter
      </button>
    </form>
  );

  const menuItems = viewer
    ? [
        ...(viewer.username ? [{ href: `/joueurs/${viewer.username}`, label: "Mon profil public" }] : [{ href: "/bienvenue", label: "Choisir mon pseudo" }]),
        { href: "/compte/profil", label: "Modifier mon profil" },
        { href: "/demandes", label: `Demandes de contact${counts.requests ? ` (${counts.requests})` : ""}` },
        { href: "/mes-resultats", label: "Mes résultats" },
        { href: "/compte", label: "Compte et sécurité" },
        ...(roleAtLeast(viewer.role, "moderator") ? [{ href: "/admin", label: "Administration" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-night/85 backdrop-blur supports-[backdrop-filter]:bg-night/70">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:text-night">
        Aller au contenu
      </a>
      <div className="container-site relative flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Navigation principale" className="hidden md:block">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-1">
          {viewer ? (
            <>
              <IconLink href="/messages" label="Messages" count={counts.messages}>
                <path d="M4 5h16v11H8l-4 4z" />
              </IconLink>
              <IconLink href="/notifications" label="Notifications" count={counts.notifications + counts.requests}>
                <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </IconLink>
              <div className="hidden sm:block">
                <UserMenu
                  trigger={
                    <>
                      <Avatar username={viewer.username} path={viewer.avatarPath} size={34} />
                      <span className="sr-only">Menu du compte {viewer.username ?? ""}</span>
                    </>
                  }
                  items={menuItems}
                  signOut={signOut}
                />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/connexion" className={buttonClass("ghost", "sm")}>
                Se connecter
              </Link>
              <Link href="/inscription" className={buttonClass("pink", "sm")}>
                Créer un compte
              </Link>
            </div>
          )}
          <MobileMenu>
            {viewer ? (
              <ul className="flex flex-col gap-1">
                {menuItems.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ink hover:bg-panel">
                      {it.label}
                    </Link>
                  </li>
                ))}
                <li>{signOut}</li>
              </ul>
            ) : (
              <div className="flex gap-2">
                <Link href="/connexion" className={buttonClass("secondary", "md", "flex-1")}>
                  Se connecter
                </Link>
                <Link href="/inscription" className={buttonClass("pink", "md", "flex-1")}>
                  Créer un compte
                </Link>
              </div>
            )}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
