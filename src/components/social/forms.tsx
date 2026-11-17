"use client";
import { useActionState, useEffect, useRef } from "react";
import { reportAction, sendContactRequestAction, sendMessageAction } from "@/server/actions/social";
import { FormMessage, SelectField, TextArea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { REPORT_REASONS } from "@/lib/validation/social";

export function ContactRequestForm({ recipientId, username }: { recipientId: string; username: string }) {
  const [state, action] = useActionState(sendContactRequestAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="recipient_id" value={recipientId} />
      <FormMessage state={state} />
      <TextArea
        label={`Un mot pour ${username} (facultatif)`}
        name="message"
        maxLength={280}
        rows={3}
        placeholder="Ex. : Salut ! Partant pour des braquages ce soir ?"
        errors={state?.fieldErrors?.message}
        hint="La messagerie s'ouvre si la demande est acceptée."
      />
      <SubmitButton variant="pink" pendingLabel="Envoi…">
        Envoyer une demande de contact
      </SubmitButton>
    </form>
  );
}

export function ReportForm({ targetType, targetId, label }: { targetType: "profile" | "message" | "garage"; targetId: string; label: string }) {
  const [state, action] = useActionState(reportAction, null);
  return (
    <details className="group rounded-xl border border-line bg-deep/60 text-sm open:bg-deep">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-muted hover:text-ink">
        <span aria-hidden="true">⚑</span> {label}
      </summary>
      <div className="border-t border-line p-3">
        {state?.ok ? (
          <FormMessage state={state} />
        ) : (
          <form action={action} className="space-y-3" noValidate>
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <FormMessage state={state} />
            <SelectField label="Motif" name="reason" id={`reason-${targetType}-${targetId}`} errors={state?.fieldErrors?.reason}>
              {Object.entries(REPORT_REASONS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </SelectField>
            <TextArea label="Précisions (facultatif)" name="details" id={`details-${targetType}-${targetId}`} maxLength={1000} rows={3} errors={state?.fieldErrors?.details} />
            <p className="text-xs text-muted">
              {targetType === "message"
                ? "Seul ce message est transmis à l'équipe de modération, pas le reste de la conversation."
                : "L'équipe de modération examinera ce signalement."}
            </p>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Envoi…">
              Envoyer le signalement
            </SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(sendMessageAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-2" noValidate>
      <input type="hidden" name="conversation_id" value={conversationId} />
      {state && !state.ok && <FormMessage state={state} />}
      <label htmlFor="f-body" className="sr-only">
        Ton message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="f-body"
          name="body"
          required
          maxLength={2000}
          rows={2}
          className="field min-h-12 flex-1 resize-y"
          placeholder="Écris ton message…"
          aria-invalid={state?.fieldErrors?.body ? true : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <SubmitButton pendingLabel="…">Envoyer</SubmitButton>
      </div>
      <p className="text-xs text-faint">Entrée pour envoyer, Maj + Entrée pour aller à la ligne. Texte uniquement, 2 000 caractères maximum.</p>
    </form>
  );
}
