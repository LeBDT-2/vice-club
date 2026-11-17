import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security/redirect";
import { unenrollMfaAction } from "@/server/actions/auth";
import { MfaChallenge, MfaEnroll } from "@/components/account/security-forms";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Double authentification", robots: { index: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string; retire?: string }> }) {
  const viewer = await requireUser("/compte/securite/mfa");
  const { next: rawNext, retire } = await searchParams;
  const next = safeNextPath(rawNext, "/compte");
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");

  return (
    <div className="container-site max-w-2xl py-10">
      <h1 className="display text-3xl">Double authentification</h1>
      {retire && (
        <Notice tone="info" className="mt-6">
          La double authentification a été désactivée.
        </Notice>
      )}
      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-panel p-6">
        {verified.length === 0 ? (
          <>
            <p className="mb-4 text-muted">
              Protège ton compte avec un code temporaire généré par une application. Les comptes de l&apos;équipe de modération et
              d&apos;administration doivent l&apos;activer pour accéder au back-office.
            </p>
            <MfaEnroll next={next} />
          </>
        ) : viewer.aal !== "aal2" ? (
          <>
            <p className="mb-4 text-muted">Saisis le code de ton application d&apos;authentification pour continuer.</p>
            <MfaChallenge factorId={verified[0].id} next={next} />
          </>
        ) : (
          <>
            <Notice tone="success" title="Double authentification active">
              Ta session actuelle est vérifiée avec un second facteur.
            </Notice>
            <form action={unenrollMfaAction} className="mt-4">
              <input type="hidden" name="factor_id" value={verified[0].id} />
              <Button variant="secondary" type="submit">
                Désactiver la double authentification
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
