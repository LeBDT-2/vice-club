import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/forms";
import { Turnstile } from "@/components/ui/turnstile";
import { getViewer } from "@/lib/auth/viewer";
import { safeNextPath } from "@/lib/security/redirect";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext, "/");
  if (await getViewer()) redirect(next);
  return (
    <AuthShell
      title="Content de te revoir"
      intro={
        <>
          Pas encore membre ?{" "}
          <Link href="/inscription" className="text-cyan underline">
            Crée ton compte gratuitement
          </Link>
          .
        </>
      }
    >
      <SignInForm next={next} captcha={<Turnstile />} />
    </AuthShell>
  );
}
