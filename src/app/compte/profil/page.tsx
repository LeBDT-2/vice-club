import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { listGamePlatforms } from "@/server/data/catalog";
import { clearAvailabilityAction, deleteHandleAction, removeAvatarAction } from "@/server/actions/profile";
import { AvailabilityForm, AvatarForm, AvatarPresetForm, HandleForm, ProfileForm } from "@/components/account/profile-forms";
import { PRESET_PREFIX, readyPresets } from "@/config/avatars";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { HANDLE_NETWORKS, HANDLE_VISIBILITY } from "@/lib/validation/profile";

export const metadata: Metadata = { title: "Modifier mon profil", robots: { index: false } };

const PREFERRED_TZ = ["Europe/Paris", "Europe/Brussels", "Europe/Zurich", "Europe/Luxembourg", "America/Montreal", "America/Toronto", "Africa/Casablanca", "Africa/Algiers", "Africa/Tunis", "Africa/Dakar", "Africa/Abidjan", "Indian/Reunion", "America/Martinique", "America/Guadeloupe", "Pacific/Noumea", "Pacific/Tahiti"];

function fmt(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}

export default async function EditProfilePage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const viewer = await requireProfile("/compte/profil");
  const { bienvenue } = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: myGames }, { data: handles }, { data: availability }, gamePlatforms] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", viewer.id).single(),
    supabase.from("profile_games").select("game_platform_id").eq("profile_id", viewer.id),
    supabase.from("profile_handles").select("id, network, handle, visibility").eq("profile_id", viewer.id).order("network"),
    supabase.from("availabilities").select("*").eq("profile_id", viewer.id).maybeSingle(),
    listGamePlatforms(),
  ]);
  if (!profile) return null;
  const allTz = Intl.supportedValuesOf("timeZone");
  const timezones = [...PREFERRED_TZ.filter((t) => allTz.includes(t)), ...allTz.filter((t) => !PREFERRED_TZ.includes(t))];
  const myGameIds = (myGames ?? []).map((g) => g.game_platform_id);
  const myGameOptions = gamePlatforms.filter((g) => myGameIds.includes(g.id));
  const activeAvailability = availability && new Date(availability.ends_at) > new Date() ? availability : null;

  return (
    <div className="container-site max-w-4xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">Mon profil</h1>
          <p className="mt-2 text-muted">Ce que les autres joueurs voient de toi. Ton e-mail n&apos;y figure jamais.</p>
        </div>
        <Link href={`/joueurs/${viewer.username}`} className={buttonClass("secondary", "sm")}>
          Voir mon profil public
        </Link>
      </div>
      {bienvenue && (
        <Notice tone="success" className="mt-6" title={`Bienvenue, ${viewer.username} !`}>
          Complète ton profil pour apparaître dans la recherche de joueurs.
        </Notice>
      )}
      {viewer.sanction && (
        <Notice tone="warning" className="mt-6" title="Compte restreint">
          Tu ne peux pas modifier ton profil pendant une restriction.
        </Notice>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <section aria-labelledby="h-avatar" className="h-fit rounded-[var(--radius-card)] border border-line bg-panel p-5">
          <h2 id="h-avatar" className="text-lg font-bold">
            Avatar
          </h2>
          <div className="my-4 flex items-center gap-4">
            <Avatar username={viewer.username} path={profile.avatar_path} size={88} />
            {profile.avatar_path && (
              <form action={removeAvatarAction}>
                <Button variant="ghost" size="sm" type="submit">
                  Retirer
                </Button>
              </form>
            )}
          </div>
          {readyPresets().length > 0 && (
            <div className="mb-5 border-b border-line pb-5">
              <h3 className="mb-3 text-sm font-bold">Choisis ton personnage</h3>
              <AvatarPresetForm
                presets={readyPresets()}
                current={profile.avatar_path?.startsWith(PRESET_PREFIX) ? profile.avatar_path.slice(PRESET_PREFIX.length) : null}
              />
            </div>
          )}
          <h3 className="mb-3 text-sm font-bold">Ou envoie ta propre image</h3>
          <AvatarForm />
        </section>

        <section aria-labelledby="h-dispo" className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
          <h2 id="h-dispo" className="text-lg font-bold">
            Disponibilité
          </h2>
          {activeAvailability ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
              <p>
                <span className="font-semibold text-success">● {activeAvailability.kind === "now" ? "Disponible" : "Disponibilité prévue"}</span>{" "}
                {activeAvailability.kind === "planned" && `à partir de ${fmt(activeAvailability.starts_at)} `}
                jusqu&apos;à {fmt(activeAvailability.ends_at)} (heure de Paris)
                {activeAvailability.note && <> — « {activeAvailability.note} »</>}
              </p>
              <form action={clearAvailabilityAction}>
                <Button variant="secondary" size="sm" type="submit">
                  Ne plus être disponible
                </Button>
              </form>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Tu n&apos;es pas affiché comme disponible.</p>
          )}
          <div className="mt-5">
            <AvailabilityForm gamePlatforms={myGameOptions} />
          </div>
        </section>
      </div>

      <section aria-labelledby="h-infos" className="mt-6 rounded-[var(--radius-card)] border border-line bg-panel p-5 sm:p-6">
        <h2 id="h-infos" className="text-lg font-bold">
          Informations de jeu
        </h2>
        <div className="mt-4">
          <ProfileForm
            gamePlatforms={gamePlatforms}
            timezones={timezones}
            defaults={{
              bio: profile.bio,
              languages: profile.languages,
              play_styles: profile.play_styles,
              play_slots: profile.play_slots,
              play_days: profile.play_days,
              has_mic: profile.has_mic,
              timezone: profile.timezone,
              show_badges: profile.show_badges,
              show_results: profile.show_results,
              game_platform_ids: myGameIds,
            }}
          />
        </div>
      </section>

      <section aria-labelledby="h-handles" className="mt-6 rounded-[var(--radius-card)] border border-line bg-panel p-5 sm:p-6">
        <h2 id="h-handles" className="text-lg font-bold">
          Pseudos de jeu
        </h2>
        <p className="mt-1 text-sm text-muted">
          Uniquement tes pseudos publics. Ne saisis jamais un e-mail ou un mot de passe. Tu choisis qui peut les voir.
        </p>
        {handles && handles.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {handles.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <strong>{HANDLE_NETWORKS[h.network as keyof typeof HANDLE_NETWORKS]}</strong> : {h.handle}
                  <span className="ml-2 text-muted">— visible par : {HANDLE_VISIBILITY[h.visibility as keyof typeof HANDLE_VISIBILITY].toLowerCase()}</span>
                </span>
                <form action={deleteHandleAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <Button variant="ghost" size="sm" type="submit">
                    Supprimer<span className="sr-only"> le pseudo {h.handle}</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <HandleForm />
        </div>
      </section>
    </div>
  );
}
