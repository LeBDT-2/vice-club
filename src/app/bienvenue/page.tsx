import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { UsernameForm } from "@/components/account/profile-forms";
import { requireUser } from "@/lib/auth/viewer";
import { safeNextPath } from "@/lib/security/redirect";

export const metadata: Metadata = { title: "Bienvenue", robots: { index: false } };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const viewer = await requireUser("/bienvenue");
  const { next } = await searchParams;
  if (viewer.username) redirect(safeNextPath(next, "/"));
  return (
    <AuthShell title="Bienvenue au club" intro="Ton adresse est confirmée. Dernière étape : choisis le pseudo sous lequel les autres joueurs te verront.">
      <UsernameForm next={safeNextPath(next, "/compte/profil?bienvenue=1")} />
    </AuthShell>
  );
}
