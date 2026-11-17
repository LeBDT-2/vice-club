import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security/redirect";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "recovery", "email_change", "email", "invite"];

/**
 * Vérifie les liens envoyés par e-mail (confirmation, réinitialisation, changement
 * d'adresse). La destination est toujours un chemin interne validé.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/");

  const fail = (reason: string) => {
    const target = new URL("/auth/erreur", url.origin);
    target.searchParams.set("raison", reason);
    const res = NextResponse.redirect(target);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  };

  const supabase = await createClient();

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(error.code === "otp_expired" ? "lien-expire" : "lien-invalide");
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("lien-invalide");
  } else {
    return fail("lien-invalide");
  }

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
