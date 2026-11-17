"use client";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/server/actions/auth";
import { FieldError, FormMessage, TextField } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { PASSWORD_MIN } from "@/lib/validation/common";

export function SignInForm({ next, captcha }: { next: string; captcha?: ReactNode }) {
  const [state, action] = useActionState(signInAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required errors={state?.fieldErrors?.email} />
      <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" required errors={state?.fieldErrors?.password} />
      {captcha}
      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-cyan underline">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ captcha }: { captcha?: ReactNode }) {
  const [state, action] = useActionState(signUpAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required errors={state?.fieldErrors?.email} hint="Elle reste privée : elle n'apparaît jamais sur ton profil." />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN}
        errors={state?.fieldErrors?.password}
        hint={`Au moins ${PASSWORD_MIN} caractères, avec des lettres et au moins un chiffre ou symbole.`}
      />
      <TextField label="Confirme le mot de passe" name="password_confirm" type="password" autoComplete="new-password" required errors={state?.fieldErrors?.password_confirm} />
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="age_confirmed" className="mt-1 size-5 accent-[#ff3e8a]" required aria-describedby="age-err" />
          <span>Je déclare avoir <strong>18 ans ou plus</strong>. VICE CLUB est réservé aux adultes.</span>
        </label>
        <FieldError id="age-err" errors={state?.fieldErrors?.age_confirmed} />
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms_accepted" className="mt-1 size-5 accent-[#ff3e8a]" required aria-describedby="terms-err" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" className="text-cyan underline" target="_blank">
              conditions d&apos;utilisation
            </Link>{" "}
            et les{" "}
            <Link href="/regles" className="text-cyan underline" target="_blank">
              règles de la communauté
            </Link>
            , et j&apos;ai lu la{" "}
            <Link href="/confidentialite" className="text-cyan underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <FieldError id="terms-err" errors={state?.fieldErrors?.terms_accepted} />
      </div>
      {captcha}
      <SubmitButton className="w-full" variant="pink" pendingLabel="Création…">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}

export function ForgotForm({ captcha }: { captcha?: ReactNode }) {
  const [state, action] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="Adresse e-mail du compte" name="email" type="email" autoComplete="email" required errors={state?.fieldErrors?.email} />
      {captcha}
      <SubmitButton className="w-full" pendingLabel="Envoi…">
        Recevoir un lien de réinitialisation
      </SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required errors={state?.fieldErrors?.password} hint={`Au moins ${PASSWORD_MIN} caractères.`} />
      <TextField label="Confirme le nouveau mot de passe" name="password_confirm" type="password" autoComplete="new-password" required errors={state?.fieldErrors?.password_confirm} />
      <SubmitButton className="w-full" pendingLabel="Enregistrement…">
        Enregistrer le nouveau mot de passe
      </SubmitButton>
    </form>
  );
}
