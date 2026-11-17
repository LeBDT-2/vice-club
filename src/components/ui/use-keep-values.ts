"use client";

import { useEffect, useRef, type FormEvent } from "react";
import type { ActionState } from "@/lib/validation/common";

/**
 * React réinitialise un formulaire après chaque action serveur. En cas d'erreur, on
 * restaure ce que la personne avait saisi (sauf les mots de passe), pour qu'elle
 * n'ait qu'à corriger le champ signalé.
 *
 * Usage : const keep = useKeepValues(state); <form action={action} {...keep}>
 */
export function useKeepValues(state: ActionState) {
  const ref = useRef<HTMLFormElement>(null);
  const snapshot = useRef<[string, string][] | null>(null);

  useEffect(() => {
    const form = ref.current;
    const saved = snapshot.current;
    if (!form || !saved || !state || state.ok) return;
    const byName = new Map<string, string[]>();
    for (const [k, v] of saved) byName.set(k, [...(byName.get(k) ?? []), v]);
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) || !el.name) continue;
      if (el instanceof HTMLInputElement) {
        if (el.type === "password" || el.type === "file" || el.type === "hidden" || el.type === "submit") continue;
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = (byName.get(el.name) ?? []).includes(el.value);
          continue;
        }
      }
      if (el instanceof HTMLSelectElement && el.multiple) {
        const values = byName.get(el.name) ?? [];
        for (const o of Array.from(el.options)) o.selected = values.includes(o.value);
        continue;
      }
      const v = byName.get(el.name);
      if (v) el.value = v[0];
    }
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const data = new FormData(e.currentTarget);
    snapshot.current = [...data.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string");
  };

  return { ref, onSubmit };
}
