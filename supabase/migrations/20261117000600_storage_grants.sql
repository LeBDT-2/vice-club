-- VICE CLUB — Storage, Realtime et privilèges explicites.

-- ---------------------------------------------------------------------------
-- Buckets. Aucune écriture client : tous les fichiers sont ré-encodés par le
-- serveur (sharp) puis déposés avec la clé service sous un nom généré.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 524288, array['image/webp']),
  ('public-media', 'public-media', true, 5242880, array['image/webp']),
  ('game-media', 'game-media', false, 5242880, array['image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Aucune politique sur storage.objects pour anon/authenticated : ni listage, ni dépôt,
-- ni suppression. Les buckets publics restent lisibles par URL publique uniquement.

-- ---------------------------------------------------------------------------
-- Realtime : nouveaux messages (la diffusion respecte la politique RLS de lecture).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilèges : on part de zéro puis on accorde le strict nécessaire.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

-- Catalogue public (lecture seule, filtrée par RLS)
grant select on public.app_settings, public.games, public.platforms, public.game_platforms, public.media_assets,
  public.vehicles, public.properties, public.game_maps, public.badges, public.user_badges, public.daily_challenges
  to anon, authenticated;

-- Profils
grant select on public.profiles to anon, authenticated;
grant update (username, bio, languages, play_styles, has_mic, timezone, play_slots, play_days, show_badges, show_results)
  on public.profiles to authenticated;
grant select on public.profile_private, public.user_roles to authenticated;

grant select on public.profile_games to anon, authenticated;
grant insert (profile_id, game_platform_id), delete on public.profile_games to authenticated;

grant select on public.profile_handles to anon, authenticated;
grant insert (profile_id, network, handle, visibility), update (handle, visibility), delete on public.profile_handles to authenticated;

grant select on public.availabilities to anon, authenticated;
grant insert (profile_id, game_platform_id, kind, starts_at, ends_at, note),
      update (game_platform_id, kind, starts_at, ends_at, note), delete
  on public.availabilities to authenticated;

-- Social (écritures via fonctions RPC uniquement)
grant select, delete on public.blocks to authenticated;
grant select on public.contact_requests, public.conversations, public.conversation_participants, public.messages to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.reports, public.moderation_actions, public.sanctions, public.audit_log to authenticated;

-- Garage
grant select on public.garages, public.garage_vehicles to anon, authenticated;
grant insert (owner_id, name, description, visibility), update (name, description, visibility), delete on public.garages to authenticated;
grant insert (garage_id, vehicle_id, position), update (position), delete on public.garage_vehicles to authenticated;

-- Jeux : résultats personnels uniquement. game_sessions, game_rounds,
-- daily_challenge_items, geo_locations, mystery_puzzles, reality_items : AUCUN droit.
grant select on public.game_results to authenticated;

-- Fonctions RPC
grant execute on function
  public.send_contact_request(uuid, text),
  public.respond_contact_request(uuid, boolean),
  public.withdraw_contact_request(uuid),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.send_message(uuid, text),
  public.mark_conversation_read(uuid),
  public.my_conversations(int, int),
  public.unread_counts(),
  public.report_content(text, text, text, text),
  public.mod_list_reports(text, int, int),
  public.mod_get_report(uuid),
  public.mod_close_report(uuid, text, text),
  public.mod_sanction_user(uuid, text, text, int, uuid),
  public.mod_revoke_sanction(uuid, text),
  public.mod_set_profile_hidden(uuid, boolean, text),
  public.mod_hide_message(bigint, text, uuid),
  public.admin_set_role(uuid, public.app_role, text),
  public.save_garage(uuid, text, text, text, uuid[])
  to authenticated;
grant execute on function
  public.leaderboard_daily(date, int),
  public.leaderboard_period(date, date, int),
  public.public_player_stats(uuid)
  to anon, authenticated;

-- Fonctions serveur (clé service uniquement)
grant execute on function public.consume_rate_limit(text, int, int), public.write_audit(uuid, text, text, text, jsonb),
  public.game_commit_answer(uuid, int, int, jsonb, jsonb, int, boolean, boolean, jsonb, text)
  to service_role;

-- Fonctions d'aide utilisées par les politiques RLS / déclencheurs (sans effet de bord
-- sauf hit_rate_limit, nécessaire à save_garage qui s'exécute avec les droits de l'appelant).
grant execute on function
  private.has_role(public.app_role),
  private.is_aal2(),
  private.can_act(),
  private.is_blocked_between(uuid, uuid),
  private.profile_is_listed(uuid),
  private.today_paris(),
  private.is_participant(uuid, uuid),
  private.are_contacts(uuid, uuid),
  private.garage_visible(uuid),
  private.owns_garage(uuid),
  private.hit_rate_limit(text, int, int),
  private.random_slug(int),
  private.set_updated_at(),
  private.profiles_guard(),
  private.garages_limit(),
  private.garages_guard(),
  private.garage_vehicles_check(),
  private.garage_touch(),
  private.setting_int(text, int),
  private.reserved_username(text)
  to anon, authenticated;

grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;
grant execute on all functions in schema private to service_role;
revoke execute on function private.bootstrap_admin(text) from service_role;
