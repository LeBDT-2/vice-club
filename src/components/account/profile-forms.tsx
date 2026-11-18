"use client";
import { useKeepValues } from "@/components/ui/use-keep-values";
import { useActionState, useState } from "react";
import Image from "next/image";
import { type AvatarPreset, presetSrc } from "@/config/avatars";
import {
  chooseAvatarPresetAction,
  chooseUsernameAction,
  saveHandleAction,
  setAvailabilityAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/server/actions/profile";
import { CheckboxGroup, FieldError, FormMessage, SelectField, TextArea, TextField } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  HANDLE_NETWORKS,
  HANDLE_VISIBILITY,
  LANGUAGES,
  PLAY_DAYS,
  PLAY_SLOTS,
  PLAY_STYLES,
} from "@/lib/validation/profile";

export function UsernameForm({ next }: { next: string }) {
  const [state, action] = useActionState(chooseUsernameAction, null);
  const keep = useKeepValues(state);
  return (
    <form {...keep} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField
        label="Ton pseudo public"
        name="username"
        required
        minLength={3}
        maxLength={20}
        pattern="[A-Za-z0-9_]{3,20}"
        autoComplete="nickname"
        errors={state?.fieldErrors?.username}
        hint="3 à 20 caractères : lettres sans accent, chiffres et _. Visible par tous, modifiable une fois tous les 30 jours."
      />
      <SubmitButton pendingLabel="Enregistrement…">Valider mon pseudo</SubmitButton>
    </form>
  );
}

type ProfileDefaults = {
  bio: string;
  languages: string[];
  play_styles: string[];
  play_slots: string[];
  play_days: string[];
  has_mic: boolean | null;
  timezone: string;
  show_badges: boolean;
  show_results: boolean;
  game_platform_ids: string[];
};

export function ProfileForm({
  defaults,
  gamePlatforms,
  timezones,
}: {
  defaults: ProfileDefaults;
  gamePlatforms: { id: string; label: string; matchmaking: boolean }[];
  timezones: string[];
}) {
  const [state, action] = useActionState(updateProfileAction, null);
  const keep = useKeepValues(state);
  const gpOptions = Object.fromEntries(gamePlatforms.map((g) => [g.id, g.matchmaking ? g.label : `${g.label} — pas de recherche de partenaires`]));
  return (
    <form {...keep} action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <TextArea
        label="Présentation"
        name="bio"
        maxLength={300}
        defaultValue={defaults.bio}
        errors={state?.fieldErrors?.bio}
        hint="Texte brut, 300 caractères maximum. Ne partage pas d'informations personnelles."
      />
      {gamePlatforms.length > 0 ? (
        <CheckboxGroup
          legend="Jeux et plateformes"
          name="game_platform_ids"
          options={gpOptions}
          defaultValues={defaults.game_platform_ids}
          errors={state?.fieldErrors?.game_platform_ids}
          hint="Seules les combinaisons configurées par l'équipe sont proposées."
        />
      ) : (
        <p className="text-sm text-muted">Aucun jeu n&apos;est encore configuré par l&apos;équipe.</p>
      )}
      <CheckboxGroup legend="Langues parlées" name="languages" options={LANGUAGES} defaultValues={defaults.languages} errors={state?.fieldErrors?.languages} />
      <CheckboxGroup legend="Styles de jeu" name="play_styles" options={PLAY_STYLES} defaultValues={defaults.play_styles} errors={state?.fieldErrors?.play_styles} />
      <div className="grid gap-6 sm:grid-cols-2">
        <CheckboxGroup legend="Moments de jeu" name="play_slots" options={PLAY_SLOTS} defaultValues={defaults.play_slots} />
        <CheckboxGroup legend="Jours" name="play_days" options={PLAY_DAYS} defaultValues={defaults.play_days} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Micro" name="has_mic" defaultValue={defaults.has_mic === null ? "unknown" : defaults.has_mic ? "yes" : "no"}>
          <option value="yes">J&apos;ai un micro</option>
          <option value="no">Pas de micro</option>
          <option value="unknown">Je préfère ne pas l&apos;indiquer</option>
        </SelectField>
        <SelectField label="Fuseau horaire" name="timezone" defaultValue={defaults.timezone} errors={state?.fieldErrors?.timezone}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </SelectField>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold">Ce qui apparaît sur mon profil public</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="show_badges" defaultChecked={defaults.show_badges} className="size-5 accent-[#2de2d0]" />
          Mes badges
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="show_results" defaultChecked={defaults.show_results} className="size-5 accent-[#2de2d0]" />
          Mes résultats aux mini-jeux et ma présence dans les classements
        </label>
      </fieldset>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer mon profil</SubmitButton>
    </form>
  );
}

export function AvatarForm() {
  const [state, action] = useActionState(uploadAvatarAction, null);
  const keep = useKeepValues(state);
  return (
    <form {...keep} action={action} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="f-avatar" className="mb-1.5 block text-sm font-semibold">
          Nouvelle image
        </label>
        <input
          id="f-avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-panel-2 file:px-3 file:text-ink"
          aria-describedby="f-avatar-hint"
        />
        <p id="f-avatar-hint" className="mt-1.5 text-sm text-muted">
          JPEG, PNG ou WebP, 2 Mo maximum. L&apos;image est recadrée et ses métadonnées (dont la position GPS) sont supprimées.
        </p>
        <FieldError id="f-avatar-err" errors={state?.fieldErrors?.avatar} />
      </div>
      <SubmitButton variant="secondary" pendingLabel="Envoi…">
        Mettre à jour l&apos;avatar
      </SubmitButton>
    </form>
  );
}

/** Grille de personnages tout prêts façon GTA, regroupés par genre. */
export function AvatarPresetForm({ presets, current }: { presets: AvatarPreset[]; current: string | null }) {
  const [state, action] = useActionState(chooseAvatarPresetAction, null);
  const keep = useKeepValues(state);
  const groups = [
    ["homme", "Hommes"],
    ["femme", "Femmes"],
  ] as const;
  return (
    <form {...keep} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {groups.map(([g, title]) => {
        const list = presets.filter((a) => a.group === g);
        if (list.length === 0) return null;
        return (
          <fieldset key={g}>
            <legend className="mb-2 text-sm font-semibold">{title}</legend>
            <div className="grid grid-cols-4 gap-2">
              {list.map((a) => (
                <label key={a.id} title={a.label} className="group relative block cursor-pointer">
                  <input type="radio" name="preset" value={a.id} defaultChecked={current === a.id} className="peer sr-only" />
                  <Image
                    src={presetSrc(a.id)}
                    alt={a.label}
                    width={96}
                    height={96}
                    sizes="4rem"
                    className="aspect-square w-full rounded-xl border-2 border-line object-cover transition-transform group-hover:scale-105 peer-checked:border-cyan peer-checked:shadow-[0_0_14px_rgb(45_226_208/0.6)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      <FieldError id="f-preset-err" errors={state?.fieldErrors?.preset} />
      <SubmitButton variant="secondary" pendingLabel="Enregistrement…">
        Prendre ce personnage
      </SubmitButton>
    </form>
  );
}

export function HandleForm() {
  const [state, action] = useActionState(saveHandleAction, null);
  const keep = useKeepValues(state);
  return (
    <form {...keep} action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" noValidate>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
      <SelectField label="Réseau" name="network" errors={state?.fieldErrors?.network}>
        {Object.entries(HANDLE_NETWORKS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectField>
      <TextField label="Pseudo public" name="handle" maxLength={40} required errors={state?.fieldErrors?.handle} />
      <SelectField label="Visible par" name="visibility" defaultValue="contacts">
        {Object.entries(HANDLE_VISIBILITY).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SelectField>
      <SubmitButton variant="secondary" pendingLabel="…">
        Ajouter
      </SubmitButton>
    </form>
  );
}

export function AvailabilityForm({ gamePlatforms }: { gamePlatforms: { id: string; label: string }[] }) {
  const [state, action] = useActionState(setAvailabilityAction, null);
  const keep = useKeepValues(state);
  const [kind, setKind] = useState<"now" | "planned">("now");
  const [localStart, setLocalStart] = useState("");
  // datetime-local n'a pas de fuseau : on convertit en ISO (UTC) dans le navigateur.
  const isoStart = localStart ? new Date(localStart).toISOString() : "";
  return (
    <form {...keep} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Quand ?</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["now", "Maintenant"],
              ["planned", "Plus tard"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 text-sm has-[:checked]:border-cyan has-[:checked]:bg-cyan/10">
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="accent-[#2de2d0]" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "planned" && (
          <>
            <TextField
              label="Début (heure locale)"
              name="starts_at_local"
              type="datetime-local"
              required
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              errors={state?.fieldErrors?.starts_at}
            />
            <input type="hidden" name="starts_at" value={isoStart} />
          </>
        )}
        <SelectField label="Durée" name="duration_minutes" defaultValue="120" errors={state?.fieldErrors?.duration_minutes}>
          <option value="30">30 minutes</option>
          <option value="60">1 heure</option>
          <option value="120">2 heures</option>
          <option value="180">3 heures</option>
          <option value="360">6 heures (maximum)</option>
        </SelectField>
        <SelectField label="Sur quel jeu ?" name="game_platform_id" errors={state?.fieldErrors?.game_platform_id}>
          <option value="">Peu importe</option>
          {gamePlatforms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Note (facultatif)" name="note" maxLength={120} placeholder="Ex. : braquages, débutants bienvenus" errors={state?.fieldErrors?.note} />
      </div>
      <p className="text-sm text-muted">Ta disponibilité s&apos;efface automatiquement à la fin de la durée choisie.</p>
      <SubmitButton pendingLabel="…">Me déclarer disponible</SubmitButton>
    </form>
  );
}
