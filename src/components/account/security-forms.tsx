"use client";
import { useKeepValues } from "@/components/ui/use-keep-values";
import { useActionState, useState, type ReactNode } from "react";
import { changeEmailAction, changePasswordAction, deleteAccountAction, startMfaEnrollAction, verifyMfaAction } from "@/server/actions/auth";
import { FormMessage, TextField } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm({ captcha }: { captcha?: ReactNode }) {
  const [state, action] = useActionState(changePasswordAction, null);
  const keep = useKeepValues(state);
  return (
    <form {...keep} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField id="pw-current" label="Mot de passe actuel" name="current_password" type="password" autoComplete="current-password" errors={state?.fieldErrors?.current_password} />
      <TextField label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" errors={state?.fieldErrors?.password} />
      <TextField label="Confirme le nouveau mot de passe" name="password_confirm" type="password" autoComplete="new-password" errors={state?.fieldErrors?.password_confirm} />
      {captcha}
      <SubmitButton variant="secondary" pendingLabel="…">
        Changer le mot de passe
      </SubmitButton>
    </form>
  );
}

export function ChangeEmailForm({ captcha }: { captcha?: ReactNode }) {
  const [state, action] = useActionState(changeEmailAction, null);
  const keep = useKeepValues(state);
  return (
    <form {...keep} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField id="email-new" label="Nouvelle adresse e-mail" name="email" type="email" autoComplete="email" errors={state?.fieldErrors?.email} />
      <TextField id="email-current" label="Mot de passe actuel" name="current_password" type="password" autoComplete="current-password" errors={state?.fieldErrors?.current_password} />
      {captcha}
      <SubmitButton variant="secondary" pendingLabel="…">
        Changer d&apos;adresse
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ captcha }: { captcha?: ReactNode }) {
  const [state, action] = useActionState(deleteAccountAction, null);
  const keep = useKeepValues(state);
  return (
    <form {...keep} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <TextField id="delete-current" label="Mot de passe actuel" name="current_password" type="password" autoComplete="current-password" errors={state?.fieldErrors?.current_password} />
      <TextField
        label="Tape SUPPRIMER pour confirmer"
        name="confirmation"
        autoComplete="off"
        errors={state?.fieldErrors?.confirmation}
        hint="Ton profil, tes garages, tes résultats, tes messages envoyés et tes demandes seront définitivement supprimés."
      />
      {captcha}
      <SubmitButton variant="danger" pendingLabel="Suppression…">
        Supprimer définitivement mon compte
      </SubmitButton>
    </form>
  );
}

export function MfaEnroll({ next }: { next: string }) {
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, action] = useActionState(verifyMfaAction, null);

  if (!enroll) {
    return (
      <div className="space-y-3">
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button
          type="button"
          onClick={async () => {
            const res = await startMfaEnrollAction();
            if ("error" in res) setError(res.error);
            else setEnroll(res);
          }}
        >
          Activer la double authentification
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>Ouvre une application d&apos;authentification (Aegis, 2FAS, Google Authenticator, 1Password…).</li>
        <li>Scanne ce QR code ou saisis la clé manuellement.</li>
        <li>Entre le code à 6 chiffres affiché.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR SVG généré localement par Supabase (data URI) */}
      <img src={enroll.qr} alt="QR code d'activation de la double authentification" className="size-48 rounded-lg bg-white p-2" />
      <p className="text-sm">
        Clé manuelle : <code className="break-all rounded bg-deep px-1.5 py-0.5">{enroll.secret}</code>
      </p>
      <MfaCodeForm factorId={enroll.factorId} next={next} state={state} action={action} />
    </div>
  );
}

export function MfaChallenge({ factorId, next }: { factorId: string; next: string }) {
  const [state, action] = useActionState(verifyMfaAction, null);
  return <MfaCodeForm factorId={factorId} next={next} state={state} action={action} />;
}

function MfaCodeForm({
  factorId,
  next,
  state,
  action,
}: {
  factorId: string;
  next: string;
  state: Awaited<ReturnType<typeof verifyMfaAction>>;
  action: (f: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="factor_id" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField label="Code à 6 chiffres" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} errors={state?.fieldErrors?.code} />
      <SubmitButton pendingLabel="Vérification…">Vérifier</SubmitButton>
    </form>
  );
}
