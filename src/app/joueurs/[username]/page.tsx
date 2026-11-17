import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass, Button } from "@/components/ui/button";
import { Notice, Tag } from "@/components/ui/notice";
import { AvailabilityPill } from "@/components/players/player-card";
import { ContactRequestForm, ReportForm } from "@/components/social/forms";
import { blockUserAction } from "@/server/actions/social";
import { HANDLE_NETWORKS, LANGUAGES, PLAY_DAYS, PLAY_SLOTS, PLAY_STYLES } from "@/lib/validation/profile";
import { KIND_LABEL } from "@/lib/games/catalog";
import type { GameKind } from "@/lib/games/scoring";

const loadProfile = cache(async (username: string) => {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_path, bio, languages, play_styles, play_slots, play_days, has_mic, timezone, last_seen_at, show_badges, created_at")
    .eq("username_normalized", username.toLowerCase())
    .not("username", "is", null)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const p = await loadProfile(decodeURIComponent(username));
  if (!p) return { title: "Joueur introuvable", robots: { index: false } };
  // Profils non indexés par défaut (vie privée) mais partageables.
  return { title: p.username!, description: `Profil de ${p.username} sur VICE CLUB.`, robots: { index: false, follow: false } };
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await loadProfile(decodeURIComponent(username));
  if (!profile) notFound();
  const viewer = await getViewer();
  const supabase = await createClient();
  const isMe = viewer?.id === profile.id;

  const [{ data: games }, { data: handles }, { data: availability }, { data: garages }, { data: badges }, { data: stats }] = await Promise.all([
    supabase.from("profile_games").select("game_platforms(id, version_label, games(name), platforms(name))").eq("profile_id", profile.id),
    supabase.from("profile_handles").select("network, handle, visibility").eq("profile_id", profile.id),
    supabase.from("availabilities").select("kind, starts_at, ends_at, note").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("garages").select("id, name, share_slug, garage_vehicles(vehicle_id)").eq("owner_id", profile.id).eq("visibility", "public").is("hidden_at", null).order("updated_at", { ascending: false }).limit(6),
    supabase.from("user_badges").select("awarded_at, badges(slug, name, description)").eq("user_id", profile.id),
    supabase.rpc("public_player_stats", { p_user: profile.id }),
  ]);

  let relation: { kind: "none" | "pending_out" | "pending_in" | "contacts"; conversationId?: string; requestId?: string } = { kind: "none" };
  if (viewer && !isMe) {
    const [{ data: conv }, { data: req }] = await Promise.all([
      supabase.from("conversations").select("id").or(`user_low.eq.${profile.id},user_high.eq.${profile.id}`).maybeSingle(),
      supabase
        .from("contact_requests")
        .select("id, sender_id")
        .eq("status", "pending")
        .or(`and(sender_id.eq.${viewer.id},recipient_id.eq.${profile.id}),and(sender_id.eq.${profile.id},recipient_id.eq.${viewer.id})`)
        .maybeSingle(),
    ]);
    if (conv) relation = { kind: "contacts", conversationId: conv.id };
    else if (req) relation = { kind: req.sender_id === viewer.id ? "pending_out" : "pending_in", requestId: req.id };
  }

  const av = availability && new Date(availability.ends_at) > new Date() ? availability : null;
  const memberSince = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(profile.created_at));

  return (
    <div className="container-site py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-[var(--radius-card)] border border-line bg-panel p-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar username={profile.username} path={profile.avatar_path} size={112} className="rounded-2xl" />
            <div className="min-w-0">
              <h1 className="display break-words text-4xl">{profile.username}</h1>
              <p className="mt-1 text-sm text-muted">Membre depuis {memberSince}</p>
              <div className="mt-2">
                <AvailabilityPill
                  availability={av ? { kind: av.kind as "now" | "planned", startsAt: av.starts_at, endsAt: av.ends_at, note: av.note } : null}
                  lastSeenAt={profile.last_seen_at}
                />
                {av?.note && <p className="mt-1 text-sm text-muted">« {av.note} »</p>}
              </div>
            </div>
          </div>

          {profile.bio && <p className="mt-6 whitespace-pre-line text-ink/90">{profile.bio}</p>}

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-muted">Jeux et plateformes</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {(games ?? []).length === 0 && <span className="text-sm text-faint">Non renseigné</span>}
                {(games ?? []).map((g) =>
                  g.game_platforms ? (
                    <Tag key={g.game_platforms.id} tone="cyan">
                      {g.game_platforms.games.name} · {g.game_platforms.platforms.name}
                      {g.game_platforms.version_label && ` (${g.game_platforms.version_label})`}
                    </Tag>
                  ) : null,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Styles</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.play_styles.length === 0 && <span className="text-sm text-faint">Non renseigné</span>}
                {profile.play_styles.map((s) => (
                  <Tag key={s} tone="pink">
                    {PLAY_STYLES[s as keyof typeof PLAY_STYLES] ?? s}
                  </Tag>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Langues</dt>
              <dd className="mt-1.5 text-sm">{profile.languages.map((l) => LANGUAGES[l as keyof typeof LANGUAGES] ?? l).join(", ") || "Non renseigné"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Micro</dt>
              <dd className="mt-1.5 text-sm">{profile.has_mic === null ? "Non précisé" : profile.has_mic ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Horaires habituels</dt>
              <dd className="mt-1.5 text-sm">
                {[...profile.play_slots.map((s) => PLAY_SLOTS[s as keyof typeof PLAY_SLOTS]), ...profile.play_days.map((d) => PLAY_DAYS[d as keyof typeof PLAY_DAYS])].join(", ") ||
                  "Non renseigné"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Fuseau horaire</dt>
              <dd className="mt-1.5 text-sm">{profile.timezone.replace(/_/g, " ")}</dd>
            </div>
          </dl>

          {(handles ?? []).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-muted">Pseudos de jeu</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {handles!.map((h) => (
                  <li key={h.network}>
                    <strong>{HANDLE_NETWORKS[h.network as keyof typeof HANDLE_NETWORKS]}</strong> : {h.handle}
                    {h.visibility === "contacts" && <span className="ml-2 text-xs text-faint">(visible par ses contacts)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {isMe ? (
            <div className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
              <p className="text-sm text-muted">C&apos;est ton profil tel que les autres le voient.</p>
              <Link href="/compte/profil" className={buttonClass("secondary", "md", "mt-3 w-full")}>
                Modifier mon profil
              </Link>
            </div>
          ) : !viewer ? (
            <div className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
              <p className="text-sm text-muted">Connecte-toi pour envoyer une demande de contact à {profile.username}.</p>
              <Link href={`/connexion?next=/joueurs/${profile.username}`} className={buttonClass("pink", "md", "mt-3 w-full")}>
                Se connecter
              </Link>
            </div>
          ) : (
            <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-panel p-5">
              {relation.kind === "contacts" && (
                <Link href={`/messages/${relation.conversationId}`} className={buttonClass("primary", "md", "w-full")}>
                  Envoyer un message
                </Link>
              )}
              {relation.kind === "pending_out" && <Notice tone="info">Ta demande de contact est en attente de réponse.</Notice>}
              {relation.kind === "pending_in" && (
                <Notice tone="info" title={`${profile.username} veut entrer en contact`}>
                  <Link href="/demandes">Répondre à la demande</Link>
                </Notice>
              )}
              {relation.kind === "none" && !viewer.username && (
                <Notice tone="info">
                  <Link href="/bienvenue">Choisis ton pseudo</Link> pour contacter des joueurs.
                </Notice>
              )}
              {relation.kind === "none" && viewer.username && !viewer.sanction && <ContactRequestForm recipientId={profile.id} username={profile.username!} />}
              <ReportForm targetType="profile" targetId={profile.id} label="Signaler ce profil" />
              <form action={blockUserAction}>
                <input type="hidden" name="user_id" value={profile.id} />
                <Button type="submit" variant="ghost" size="sm" className="w-full">
                  Bloquer {profile.username}
                </Button>
              </form>
            </div>
          )}

          {(badges ?? []).length > 0 && profile.show_badges && (
            <section className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
              <h2 className="font-bold">Badges</h2>
              <ul className="mt-3 space-y-2">
                {badges!.map((b) => (
                  <li key={b.badges.slug} className="flex items-start gap-3 text-sm">
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                      ★
                    </span>
                    <span>
                      <strong>{b.badges.name}</strong>
                      <span className="block text-muted">{b.badges.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(stats ?? []).length > 0 && (
            <section className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
              <h2 className="font-bold">Résultats</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {stats!.map((s) => (
                  <li key={s.game_kind} className="flex justify-between gap-3">
                    <span>{KIND_LABEL[s.game_kind as GameKind]}</span>
                    <span className="text-muted">
                      record {s.best_score.toLocaleString("fr-FR")} · {s.games_played} partie{s.games_played > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(garages ?? []).length > 0 && (
            <section className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
              <h2 className="font-bold">Garages publics</h2>
              <ul className="mt-3 space-y-2">
                {garages!.map((g) => (
                  <li key={g.id}>
                    <Link href={`/garage/${g.share_slug}`} className="flex justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2">
                      <span>{g.name}</span>
                      <span className="text-muted">{g.garage_vehicles.length} véhicule{g.garage_vehicles.length > 1 ? "s" : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
