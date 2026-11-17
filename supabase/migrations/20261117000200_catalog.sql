-- VICE CLUB — catalogue : jeux, plateformes, médias, véhicules, propriétés, cartes,
-- contenus des mini-jeux. Toutes les écritures passent par le back-office serveur
-- (clé service, après contrôle du rôle administrateur + MFA) et sont journalisées.

create type public.content_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- Paramètres applicatifs publics (budget du garage, limites…)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key text primary key check (key ~ '^[a-z_]{3,40}$'),
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "app_settings: lecture publique" on public.app_settings for select to anon, authenticated using (true);

insert into public.app_settings (key, value, description) values
  ('garage_budget', '10000000', 'Budget fictif (VC$) du mini-jeu Garage ultime. Sans rapport avec les prix du jeu.'),
  ('garage_max_vehicles', '5', 'Nombre maximal de véhicules par garage.'),
  ('garage_max_per_user', '10', 'Nombre maximal de garages par compte.');

create or replace function private.setting_int(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::int from public.app_settings s where s.key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- Jeux, plateformes, compatibilités
-- ---------------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  short_name text not null check (char_length(short_name) between 2 and 24),
  description text not null default '' check (char_length(description) <= 500),
  status public.content_status not null default 'draft',
  sort_order int not null default 100,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  short_name text not null check (char_length(short_name) between 2 and 16),
  status public.content_status not null default 'draft',
  sort_order int not null default 100,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une combinaison jeu × plateforme × version réellement jouable. La recherche de
-- partenaires n'est proposée que si matchmaking_enabled est vrai. Deux entrées sont
-- compatibles si elles sont identiques ou partagent le même crossplay_group.
create table public.game_platforms (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  platform_id uuid not null references public.platforms (id) on delete cascade,
  version_label text not null default '' check (char_length(version_label) <= 60),
  matchmaking_enabled boolean not null default false,
  crossplay_group text check (crossplay_group is null or crossplay_group ~ '^[a-z0-9-]{2,40}$'),
  notes text not null default '' check (char_length(notes) <= 500),
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, platform_id, version_label)
);
create index game_platforms_game_idx on public.game_platforms (game_id);

-- ---------------------------------------------------------------------------
-- Médias et provenance
-- ---------------------------------------------------------------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('public-media', 'game-media')),
  path text not null,
  mime_type text not null check (mime_type in ('image/webp', 'image/jpeg', 'image/png')),
  width int not null check (width between 1 and 8000),
  height int not null check (height between 1 and 8000),
  bytes int not null check (bytes between 1 and 15000000),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  source text not null check (char_length(source) between 2 and 500),
  author text not null check (char_length(author) between 2 and 200),
  license text not null check (char_length(license) between 2 and 200),
  usage_justification text not null default '' check (char_length(usage_justification) <= 1000),
  is_ai_generated boolean not null default false,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'approved', 'rejected')),
  validated_by uuid,
  validated_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

-- ---------------------------------------------------------------------------
-- Véhicules (Garage ultime, Voiture mystère, Plus cher ou moins cher)
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  manufacturer text not null default '' check (char_length(manufacturer) <= 60),
  category text not null check (category in ('sport','super','muscle','classique','tout_terrain','berline','suv','compacte','moto','utilitaire','autre')),
  -- Prix dans le jeu (si connu). Toujours accompagné de son type, sa source et sa date.
  game_price bigint check (game_price is null or game_price >= 0),
  game_price_type text check (game_price_type in ('standard','promo','echange')),
  game_price_note text not null default '' check (char_length(game_price_note) <= 200),
  price_source text check (char_length(price_source) <= 500),
  price_verified_at date,
  -- Coût fictif attribué pour équilibrer le mini-jeu Garage ultime.
  garage_cost int not null check (garage_cost between 1 and 100000000),
  image_id uuid references public.media_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, slug),
  constraint vehicles_price_documented check (
    game_price is null
    or (game_price_type is not null and price_source is not null and price_verified_at is not null)
  )
);
create index vehicles_published_idx on public.vehicles (game_id, category, name) where status = 'published';
create index vehicles_name_search_idx on public.vehicles (lower(name) text_pattern_ops);

-- ---------------------------------------------------------------------------
-- Propriétés (Plus cher ou moins cher)
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('appartement','maison','garage','bureau','entreprise','club','autre')),
  location_label text not null default '' check (char_length(location_label) <= 80),
  game_price bigint not null check (game_price >= 0),
  game_price_type text not null check (game_price_type in ('standard','promo','echange')),
  game_price_note text not null default '' check (char_length(game_price_note) <= 200),
  price_source text not null check (char_length(price_source) between 2 and 500),
  price_verified_at date not null,
  image_id uuid references public.media_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, slug)
);

-- ---------------------------------------------------------------------------
-- Cartes (Où suis-je ?). Les coordonnées sont exprimées dans le repère propre à la
-- carte (0..width, 0..height). Une distance réelle n'est affichée que si l'échelle
-- a été vérifiée (scale_verified + meters_per_unit).
-- ---------------------------------------------------------------------------
create table public.game_maps (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  image_id uuid references public.media_assets (id) on delete set null,
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  scale_verified boolean not null default false,
  meters_per_unit numeric check (meters_per_unit is null or meters_per_unit > 0),
  scale_source text,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_maps_scale check (not scale_verified or (meters_per_unit is not null and scale_source is not null))
);

-- ---------------------------------------------------------------------------
-- Contenus SECRETS des mini-jeux : aucun privilège pour anon/authenticated.
-- ---------------------------------------------------------------------------
create table public.geo_locations (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.game_maps (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  screenshot_id uuid references public.media_assets (id) on delete set null,
  x numeric not null check (x >= 0),
  y numeric not null check (y >= 0),
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.geo_locations is 'SECRET : solutions de « Où suis-je ? ». Jamais exposée aux clients.';

create table public.mystery_puzzles (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  source_media_id uuid references public.media_assets (id) on delete set null,
  -- 6 variantes générées côté serveur (de la plus cachée à la plus lisible) + révélation.
  stage_paths text[] not null default '{}' check (cardinality(stage_paths) in (0, 6)),
  reveal_path text,
  hints text[] not null default '{}' check (cardinality(hints) <= 5),
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.mystery_puzzles is 'SECRET : réponses de « Voiture mystère ». Jamais exposée aux clients.';

create table public.reality_items (
  id uuid primary key default gen_random_uuid(),
  media_id uuid references public.media_assets (id) on delete set null,
  answer text not null check (answer in ('gta', 'reality')),
  explanation text not null check (char_length(explanation) between 10 and 1000),
  game_id uuid references public.games (id) on delete set null,
  status public.content_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.reality_items is 'SECRET : réponses de « GTA ou réalité ? ». Jamais exposée aux clients.';

-- Publication : un contenu publié doit être complet et ses médias validés.
create or replace function private.media_approved(p_media uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.media_assets m where m.id = p_media and m.validation_status = 'approved');
$$;

create or replace function private.check_publishable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_map public.game_maps%rowtype;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if tg_table_name = 'geo_locations' then
    select * into v_map from public.game_maps where id = new.map_id;
    if v_map.status <> 'published' then raise exception 'publish_map_not_published' using errcode = '23514'; end if;
    if new.screenshot_id is null or not private.media_approved(new.screenshot_id) then
      raise exception 'publish_media_not_approved' using errcode = '23514';
    end if;
    if new.x > v_map.width or new.y > v_map.height then
      raise exception 'publish_coordinates_out_of_map' using errcode = '23514';
    end if;
  elsif tg_table_name = 'mystery_puzzles' then
    if cardinality(new.stage_paths) <> 6 or new.reveal_path is null then
      raise exception 'publish_variants_missing' using errcode = '23514';
    end if;
    if new.source_media_id is null or not private.media_approved(new.source_media_id) then
      raise exception 'publish_media_not_approved' using errcode = '23514';
    end if;
    if not exists (select 1 from public.vehicles v where v.id = new.vehicle_id and v.status = 'published') then
      raise exception 'publish_vehicle_not_published' using errcode = '23514';
    end if;
  elsif tg_table_name = 'reality_items' then
    if new.media_id is null or not private.media_approved(new.media_id) then
      raise exception 'publish_media_not_approved' using errcode = '23514';
    end if;
  elsif tg_table_name = 'game_maps' then
    if new.image_id is null or not private.media_approved(new.image_id) then
      raise exception 'publish_media_not_approved' using errcode = '23514';
    end if;
  elsif tg_table_name in ('vehicles', 'properties') then
    if new.image_id is not null and not private.media_approved(new.image_id) then
      raise exception 'publish_media_not_approved' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['games','platforms','game_platforms','media_assets','vehicles','properties','game_maps','geo_locations','mystery_puzzles','reality_items'] loop
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()', t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['vehicles','properties','game_maps','geo_locations','mystery_puzzles','reality_items'] loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function private.check_publishable()', t || '_publishable', t);
  end loop;
end;
$$;

-- Lecture publique du catalogue publié uniquement. Pas d'écriture client.
create policy "games: lecture des jeux publiés" on public.games for select to anon, authenticated using (status = 'published');
create policy "platforms: lecture des plateformes publiées" on public.platforms for select to anon, authenticated using (status = 'published');
create policy "game_platforms: lecture des combinaisons publiées" on public.game_platforms for select to anon, authenticated
  using (status = 'published'
         and exists (select 1 from public.games g where g.id = game_id and g.status = 'published')
         and exists (select 1 from public.platforms p where p.id = platform_id and p.status = 'published'));
create policy "media_assets: lecture des médias publics validés" on public.media_assets for select to anon, authenticated
  using (bucket = 'public-media' and validation_status = 'approved');
create policy "vehicles: lecture des véhicules publiés" on public.vehicles for select to anon, authenticated using (status = 'published');
create policy "properties: lecture des propriétés publiées" on public.properties for select to anon, authenticated using (status = 'published');
create policy "game_maps: lecture des cartes publiées" on public.game_maps for select to anon, authenticated using (status = 'published');
-- geo_locations, mystery_puzzles, reality_items : RLS activée, AUCUNE politique, AUCUN privilège.
