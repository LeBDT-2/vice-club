-- VICE CLUB — fondations : schéma privé, rôles, profils, sanctions, audit, limitation de débit.
--
-- Principes appliqués dans toutes les migrations :
--   * RLS activée sur chaque table du schéma public, avec des politiques explicites.
--   * Les privilèges par défaut de Supabase (anon/authenticated = tout) sont retirés
--     puis réattribués au cas par cas (colonnes modifiables comprises).
--   * Les fonctions SECURITY DEFINER fixent search_path = '' et qualifient tous les objets.
--   * Les données sensibles (solutions des jeux, compteurs anti-abus) ne sont jamais
--     accordées aux rôles anon/authenticated.

-- ---------------------------------------------------------------------------
-- Schéma privé : jamais exposé par l'API. Seules quelques fonctions d'aide aux
-- politiques RLS y sont exécutables par les rôles clients.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

-- Les nouvelles tables/fonctions du schéma public ne sont plus ouvertes par défaut.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Date « métier » du site : Europe/Paris.
create or replace function private.today_paris()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Paris')::date;
$$;

-- Jeton aléatoire URL-safe (partage de garage, etc.)
create or replace function private.random_slug(bytes int default 9)
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(bytes), 'base64'), '+/=', '-_');
$$;

-- ---------------------------------------------------------------------------
-- Rôles applicatifs
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('user', 'moderator', 'admin');

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  granted_by uuid,
  granted_at timestamptz not null default now()
);
comment on table public.user_roles is
  'Rôle applicatif. Aucune écriture possible depuis les clients : uniquement via admin_set_role() ou la console SQL.';

alter table public.user_roles enable row level security;

create or replace function private.current_role_of(p_user uuid)
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select r.role from public.user_roles r where r.user_id = p_user), 'user'::public.app_role);
$$;

create or replace function private.has_role(p_min public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and case p_min
           when 'user' then true
           when 'moderator' then private.current_role_of(auth.uid()) in ('moderator', 'admin')
           when 'admin' then private.current_role_of(auth.uid()) = 'admin'
         end;
$$;

-- Niveau d'authentification de la session (aal2 = MFA validée).
create or replace function private.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- Lève une exception si l'appelant n'est pas membre de l'équipe avec MFA.
create or replace function private.require_staff(p_min public.app_role)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not private.has_role(p_min) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not private.is_aal2() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create policy "user_roles: lecture de son propre rôle"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role('moderator'));

-- ---------------------------------------------------------------------------
-- Journal d'audit (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check (char_length(action) between 3 and 80),
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
alter table public.audit_log enable row level security;

create policy "audit_log: lecture administrateurs MFA"
  on public.audit_log for select to authenticated
  using (private.has_role('admin') and private.is_aal2());

create or replace function private.audit(p_action text, p_target_type text, p_target_id text, p_metadata jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- Variante appelée par le serveur (clé service) : l'acteur est fourni explicitement.
create or replace function public.write_audit(p_actor uuid, p_action text, p_target_type text, p_target_id text, p_metadata jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (p_actor, p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke all on function public.write_audit(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.write_audit(uuid, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Profils publics / données privées
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  username_normalized text generated always as (lower(username)) stored,
  username_changed_at timestamptz,
  avatar_path text,
  bio text not null default '' check (char_length(bio) <= 300),
  languages text[] not null default '{}'
    check (cardinality(languages) <= 6 and languages <@ array['fr','en','es','de','it','pt','nl','ar','pl','tr']),
  play_styles text[] not null default '{}'
    check (cardinality(play_styles) <= 8 and play_styles <@ array['chill','courses','exploration','braquages','missions','roleplay','photo','combat','business']),
  has_mic boolean,
  timezone text not null default 'Europe/Paris' check (char_length(timezone) <= 64),
  play_slots text[] not null default '{}'
    check (play_slots <@ array['matin','midi','apres_midi','soir','nuit']),
  play_days text[] not null default '{}'
    check (play_days <@ array['semaine','week_end']),
  show_badges boolean not null default true,
  show_results boolean not null default true,
  hidden_at timestamptz,
  hidden_reason text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$'),
  constraint profiles_bio_plain check (bio !~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')
);
create unique index profiles_username_unique on public.profiles (username_normalized) where username is not null;
create index profiles_visible_idx on public.profiles (created_at desc) where username is not null and hidden_at is null;
create index profiles_languages_idx on public.profiles using gin (languages);
create index profiles_styles_idx on public.profiles using gin (play_styles);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

comment on table public.profiles is 'Données de profil PUBLIQUES uniquement. Aucune donnée de contact privée ici.';

create table public.profile_private (
  id uuid primary key references auth.users (id) on delete cascade,
  age_confirmed_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  terms_version text not null,
  created_at timestamptz not null default now()
);
comment on table public.profile_private is 'Données privées du compte, visibles uniquement par leur propriétaire.';

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

create or replace function private.reserved_username(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_name) = any (array[
    'admin','administrateur','administrator','moderateur','moderator','modo','staff','support',
    'viceclub','vice_club','rockstar','rockstargames','taketwo','take_two','system','systeme',
    'root','null','undefined','anonyme','anonymous','compte','api','help','aide','contact'
  ]);
$$;

-- Contrôles d'intégrité côté base : format du pseudo, fuseau horaire valide,
-- fréquence des changements de pseudo, colonnes réservées à la modération.
create or replace function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    if new.username is null then
      raise exception 'username_required' using errcode = '23514';
    end if;
    if private.reserved_username(new.username) then
      raise exception 'username_reserved' using errcode = '23514';
    end if;
    if old.username is not null and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '30 days'
       and lower(old.username) <> lower(new.username)
       and current_user in ('authenticated', 'anon') then
      raise exception 'username_change_too_soon' using errcode = '23514';
    end if;
    new.username_changed_at := now();
  end if;

  if new.timezone is distinct from old.timezone then
    if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
      raise exception 'invalid_timezone' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function private.profiles_guard();

-- Création automatique du profil à l'inscription. La déclaration de majorité et
-- l'acceptation des conditions sont exigées ici : un appel direct à l'API Auth
-- sans ces métadonnées échoue.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if coalesce(v_meta ->> 'age_confirmed', '') <> 'true' then
    raise exception 'age_confirmation_required' using errcode = '23514';
  end if;
  if coalesce(v_meta ->> 'terms_version', '') = '' then
    raise exception 'terms_acceptance_required' using errcode = '23514';
  end if;

  insert into public.profiles (id) values (new.id);
  insert into public.profile_private (id, age_confirmed_at, terms_accepted_at, terms_version)
  values (new.id, now(), now(), left(v_meta ->> 'terms_version', 32));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sanctions (suspension / bannissement)
-- ---------------------------------------------------------------------------
create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('suspension', 'ban')),
  reason text not null check (char_length(reason) between 3 and 1000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  report_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  constraint sanctions_duration check (
    (kind = 'ban' and ends_at is null) or (kind = 'suspension' and ends_at is not null and ends_at > starts_at)
  )
);
create index sanctions_user_idx on public.sanctions (user_id, created_at desc);
alter table public.sanctions enable row level security;

create policy "sanctions: lecture par la personne concernée et l'équipe"
  on public.sanctions for select to authenticated
  using (user_id = (select auth.uid()) or (private.has_role('moderator') and private.is_aal2()));

create or replace function private.is_sanctioned(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sanctions s
    where s.user_id = p_user
      and s.revoked_at is null
      and s.starts_at <= now()
      and (s.ends_at is null or s.ends_at > now())
  );
$$;

-- L'appelant est connecté et n'est ni suspendu ni banni.
create or replace function private.can_act()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and not private.is_sanctioned(auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Blocages (nécessaires aux politiques des profils)
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;

create or replace function private.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- Le blocage n'est visible que par celui qui l'a posé.
create policy "blocks: lecture de ses blocages"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

-- Profil visible publiquement ?
create or replace function private.profile_is_listed(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id and p.username is not null and p.hidden_at is null
  ) and not exists (
    select 1 from public.sanctions s
    where s.user_id = p_id and s.kind = 'ban' and s.revoked_at is null and s.starts_at <= now()
  );
$$;

create policy "profiles: lecture publique des profils actifs"
  on public.profiles for select to anon, authenticated
  using (
    id = (select auth.uid())
    or (
      username is not null
      and hidden_at is null
      and private.profile_is_listed(id)
      and ((select auth.uid()) is null or not private.is_blocked_between(id, (select auth.uid())))
    )
    or (private.has_role('moderator') and private.is_aal2())
  );

create policy "profiles: modification par le propriétaire non sanctionné"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and private.can_act())
  with check (id = (select auth.uid()) and private.can_act());

create policy "profile_private: lecture par le propriétaire"
  on public.profile_private for select to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Limitation de débit persistante (compatible serverless)
-- ---------------------------------------------------------------------------
create table private.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
create index rate_limits_window_idx on private.rate_limits (window_start);

-- Fenêtre fixe. Retourne true si l'action est autorisée (et la comptabilise).
create or replace function private.hit_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into private.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_max;
end;
$$;

-- Point d'entrée serveur (clé service uniquement) pour inscription, connexion, uploads…
create or replace function public.consume_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select private.hit_rate_limit(p_bucket, p_max, p_window_seconds);
$$;
revoke all on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;

-- Exécution des fonctions d'aide RLS par les clients (lecture seule, sans effet de bord).
revoke all on all functions in schema private from public;
grant execute on function private.has_role(public.app_role) to anon, authenticated;
grant execute on function private.is_aal2() to anon, authenticated;
grant execute on function private.can_act() to anon, authenticated;
grant execute on function private.is_blocked_between(uuid, uuid) to anon, authenticated;
grant execute on function private.profile_is_listed(uuid) to anon, authenticated;
grant execute on function private.today_paris() to anon, authenticated;
grant execute on function private.set_updated_at() to anon, authenticated;
grant execute on function private.profiles_guard() to authenticated;
