"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, TextArea, TextField } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendContactMessageAction } from "@/server/actions/contact";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/lib/validation/contact";

export function ContactForm({ signedIn, defaultCategory }: { signedIn: boolean; defaultCategory?: ContactCategory }) {
  const [state, action] = useActionState(sendContactMessageAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  const err = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <SelectField label="Sujet" name="category" id="contact-category" defaultValue={defaultCategory ?? ""} errors={err?.category} required>
        <option value="" disabled>
          Choisis un sujet
        </option>
        {Object.entries(CONTACT_CATEGORIES).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </SelectField>
      <TextField label="Titre" name="subject" id="contact-subject" maxLength={120} required errors={err?.subject} />
      <TextArea
        label="Ton message"
        name="body"
        id="contact-body"
        rows={7}
        maxLength={3000}
        required
        errors={err?.body}
        hint="Ne partage jamais de mot de passe ni d'identifiant de plateforme."
      />
      <TextField
        label="Adresse de la page concernée (facultatif)"
        name="page_url"
        id="contact-page"
        type="url"
        inputMode="url"
        placeholder="https://…"
        maxLength={300}
        errors={err?.page_url}
      />
      <TextField
        label={signedIn ? "E-mail de réponse (facultatif)" : "Ton e-mail pour la réponse"}
        name="reply_email"
        id="contact-email"
        type="email"
        autoComplete="email"
        maxLength={254}
        required={!signedIn}
        errors={err?.reply_email}
        hint={signedIn ? "Laisse vide pour recevoir la réponse à l'adresse de ton compte." : undefined}
      />
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor="contact-website">Ne pas remplir</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingLabel="Envoi…">Envoyer le message</SubmitButton>
    </form>
  );
}
