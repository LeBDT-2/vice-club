"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { getViewer, requireUser } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFingerprint, fingerprint } from "@/lib/security/request";
import { enforceRateLimits, RateLimitError } from "@/lib/security/rate-limit";
import { safeNextPath } from "@/lib/security/redirect";
import { type ActionState, formToObject, zodFieldErrors } from "@/lib/validation/common";
import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  forgotSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  TERMS_VERSION,
} from "@/lib/validation/auth";

const RATE_LIMITED: ActionState = { ok: false, message: "Trop de tentatives. Patiente quelques minutes avant de réessayer." };

function captchaToken(form: FormData): string | undefined {
  const v = form.get("cf-turnstile-response");
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function siteUrl(path: string) {
  return new URL(path, publicEnv().NEXT_PUBLIC_SITE_URL).toString();
}

/** Vérifie un mot de passe sans toucher à la session courante (ré-authentification). */
async function verifyPassword(email: string, pwd: string, token: string | undefined): Promise<boolean> {
  const env = publicEnv();
  const verifier = createStatelessClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await verifier.auth.signInWithPassword({ email, password: pwd, options: { captchaToken: token } });
  if (error) return false;
  // Révoque immédiatement la session créée pour la vérification.
  await verifier.auth.signOut({ scope: "local" });
  return true;
}

// ----------------------------------------------------------------- Inscription
export async function signUpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };

  try {
    const ip = await clientIpFingerprint();
    await enforceRateLimits([
      { key: `signup:ip:${ip}`, max: 5, windowSeconds: 3600 },
      { key: `signup:email:${fingerprint(parsed.data.email)}`, max: 3, windowSeconds: 3600 },
    ]);
  } catch (e) {
    if (e instanceof RateLimitError) return RATE_LIMITED;
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: siteUrl("/auth/confirm?next=/bienvenue"),
      captchaToken: captchaToken(form),
      data: { age_confirmed: "true", terms_version: TERMS_VERSION },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { ok: false, fieldErrors: { password: ["Mot de passe trop faible ou déjà exposé dans une fuite connue."] } };
    }
    if (error.code === "captcha_failed") return { ok: false, message: "La vérification anti-robot a échoué. Réessaie." };
    if (error.code === "over_email_send_rate_limit" || error.status === 429) return RATE_LIMITED;
    // Message générique : on ne révèle pas si l'adresse possède déjà un compte.
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      console.error("[auth] signUp", { code: error.code, status: error.status });
      return { ok: false, message: "L'inscription n'a pas pu aboutir. Réessaie dans un instant." };
    }
  }
  return {
    ok: true,
    message:
      "Si cette adresse peut être utilisée, tu vas recevoir un e-mail de confirmation. Clique sur le lien qu'il contient pour activer ton compte.",
  };
}

// ------------------------------------------------------------------- Connexion
export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formToObject(form));
  const next = safeNextPath(form.get("next"), "/");
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };

  try {
    const ip = await clientIpFingerprint();
    await enforceRateLimits([
      { key: `login:ip:${ip}`, max: 30, windowSeconds: 600 },
      { key: `login:email:${fingerprint(parsed.data.email)}`, max: 8, windowSeconds: 600 },
    ]);
  } catch (e) {
    if (e instanceof RateLimitError) return RATE_LIMITED;
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { captchaToken: captchaToken(form) },
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, message: "Ton adresse e-mail n'est pas encore confirmée. Vérifie ta boîte de réception." };
    }
    if (error.code === "captcha_failed") return { ok: false, message: "La vérification anti-robot a échoué. Réessaie." };
    if (error.status === 429) return RATE_LIMITED;
    return { ok: false, message: "Adresse e-mail ou mot de passe incorrect." };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/compte/securite/mfa?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}

// ---------------------------------------------------------- Mot de passe oublié
export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = forgotSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  try {
    const ip = await clientIpFingerprint();
    await enforceRateLimits([
      { key: `reset:ip:${ip}`, max: 10, windowSeconds: 3600 },
      { key: `reset:email:${fingerprint(parsed.data.email)}`, max: 3, windowSeconds: 3600 },
    ]);
  } catch (e) {
    if (e instanceof RateLimitError) return RATE_LIMITED;
    throw e;
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: siteUrl("/auth/confirm?next=/reinitialiser-mot-de-passe"),
    captchaToken: captchaToken(form),
  });
  if (error?.code === "captcha_failed") return { ok: false, message: "La vérification anti-robot a échoué. Réessaie." };
  if (error) console.error("[auth] reset", { code: error.code, status: error.status });
  // Toujours la même réponse, que le compte existe ou non.
  return {
    ok: true,
    message: "Si un compte est associé à cette adresse, un lien de réinitialisation valable 1 heure vient d'être envoyé.",
  };
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireUser("/reinitialiser-mot-de-passe");
  const parsed = newPasswordSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return { ok: false, fieldErrors: { password: ["Mot de passe trop faible."] } };
    if (error.code === "same_password") return { ok: false, fieldErrors: { password: ["Choisis un nouveau mot de passe."] } };
    return { ok: false, message: "Le mot de passe n'a pas pu être modifié. Le lien a peut-être expiré : recommence la procédure." };
  }
  // Les autres sessions sont fermées par sécurité.
  await supabase.auth.signOut({ scope: "others" });
  redirect("/compte?succes=mot-de-passe");
}

// --------------------------------------------------------- Paramètres de compte
async function reauthGuard(userId: string): Promise<ActionState | null> {
  try {
    await enforceRateLimits([{ key: `reauth:user:${userId}`, max: 5, windowSeconds: 900 }]);
    return null;
  } catch (e) {
    if (e instanceof RateLimitError) return RATE_LIMITED;
    throw e;
  }
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireUser("/compte");
  const parsed = changePasswordSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const limited = await reauthGuard(viewer.id);
  if (limited) return limited;
  if (!viewer.email || !(await verifyPassword(viewer.email, parsed.data.current_password, captchaToken(form)))) {
    return { ok: false, fieldErrors: { current_password: ["Mot de passe actuel incorrect."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return { ok: false, fieldErrors: { password: ["Mot de passe trop faible."] } };
    return { ok: false, message: "Le mot de passe n'a pas pu être modifié." };
  }
  await supabase.auth.signOut({ scope: "others" });
  return { ok: true, message: "Mot de passe modifié. Tes autres sessions ont été déconnectées." };
}

export async function changeEmailAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireUser("/compte");
  const parsed = changeEmailSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const limited = await reauthGuard(viewer.id);
  if (limited) return limited;
  if (!viewer.email || !(await verifyPassword(viewer.email, parsed.data.current_password, captchaToken(form)))) {
    return { ok: false, fieldErrors: { current_password: ["Mot de passe incorrect."] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: siteUrl("/auth/confirm?next=/compte?succes=email") },
  );
  if (error && error.code !== "email_exists") {
    return { ok: false, message: "Le changement d'adresse n'a pas pu être lancé. Réessaie plus tard." };
  }
  return {
    ok: true,
    message:
      "Si la nouvelle adresse peut être utilisée, des liens de confirmation ont été envoyés à l'ancienne et à la nouvelle adresse. Le changement prend effet après confirmation.",
  };
}

export async function deleteAccountAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireUser("/compte");
  const parsed = deleteAccountSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  const limited = await reauthGuard(viewer.id);
  if (limited) return limited;
  if (!viewer.email || !(await verifyPassword(viewer.email, parsed.data.current_password, captchaToken(form)))) {
    return { ok: false, fieldErrors: { current_password: ["Mot de passe incorrect."] } };
  }
  if (viewer.role === "admin") {
    return { ok: false, message: "Un compte administrateur doit d'abord être rétrogradé par un autre administrateur." };
  }

  const admin = createAdminClient();
  // Fichiers personnels (avatar) : suppression explicite, puis compte (cascade SQL).
  const { data: files } = await admin.storage.from("avatars").list(viewer.id, { limit: 100 });
  if (files?.length) {
    await admin.storage.from("avatars").remove(files.map((f) => `${viewer.id}/${f.name}`));
  }
  await admin.rpc("write_audit", {
    p_actor: viewer.id,
    p_action: "account.delete",
    p_target_type: "user",
    p_target_id: viewer.id,
    p_metadata: {},
  });
  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) {
    console.error("[auth] deleteUser", { code: error.code, status: error.status });
    return { ok: false, message: "La suppression a échoué. Contacte-nous si le problème persiste." };
  }
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?compte=supprime");
}

// ------------------------------------------------------------------------- MFA
export async function startMfaEnrollAction(): Promise<{ factorId: string; qr: string; secret: string } | { error: string }> {
  await requireUser("/compte/securite/mfa");
  const supabase = await createClient();
  // Supprime d'éventuels facteurs non vérifiés laissés par une tentative précédente.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `VICE CLUB ${Date.now()}` });
  if (error || !data) return { error: "Impossible de démarrer l'activation. Réessaie." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyMfaAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireUser("/compte/securite/mfa");
  const factorId = String(form.get("factor_id") ?? "");
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  const next = safeNextPath(form.get("next"), "/compte");
  if (!/^\d{6}$/.test(code)) return { ok: false, fieldErrors: { code: ["Code à 6 chiffres."] } };
  try {
    await enforceRateLimits([{ key: `mfa:user:${viewer.id}`, max: 10, windowSeconds: 900 }]);
  } catch (e) {
    if (e instanceof RateLimitError) return RATE_LIMITED;
    throw e;
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { ok: false, fieldErrors: { code: ["Code incorrect ou expiré."] } };
  redirect(next);
}

export async function getViewerEmail() {
  const v = await getViewer();
  return v?.email ?? null;
}

export async function unenrollMfaAction(form: FormData) {
  const viewer = await requireUser("/compte/securite/mfa");
  if (viewer.aal !== "aal2") redirect("/compte/securite/mfa");
  const factorId = String(form.get("factor_id") ?? "");
  const supabase = await createClient();
  await supabase.auth.mfa.unenroll({ factorId });
  redirect("/compte/securite/mfa?retire=1");
}
