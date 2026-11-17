-- VICE CLUB — Garage ultime : collection sur le site (aucune synchronisation avec GTA).

create table public.garages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60 and name !~ '[\x00-\x1F\x7F]'),
  description text not null default '' check (char_length(description) <= 500 and description !~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  share_slug text not null unique default private.random_slug(9),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index garages_owner_idx on public.garages (owner_id, updated_at desc);
create index garages_public_idx on public.garages (updated_at desc) where visibility = 'public' and hidden_at is null;
create trigger garages_updated_at before update on public.garages for each row execute function private.set_updated_at();

create table public.garage_vehicles (
  garage_id uuid not null references public.garages (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  added_at timestamptz not null default now(),
  primary key (garage_id, vehicle_id),
  unique (garage_id, position)
);
create index garage_vehicles_vehicle_idx on public.garage_vehicles (vehicle_id);

alter table public.garages enable row level security;
alter table public.garage_vehicles enable row level security;

-- Limite du nombre de garages par compte.
create or replace function private.garages_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('garage-limit:' || new.owner_id::text, 0));
  if (select count(*) from public.garages where owner_id = new.owner_id) >= private.setting_int('garage_max_per_user', 10) then
    raise exception 'garage_limit_reached' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger garages_limit before insert on public.garages for each row execute function private.garages_limit();

-- Le propriétaire et le masquage ne sont pas modifiables par le client (droits colonnes),
-- ce déclencheur est une seconde barrière.
create or replace function private.garages_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id or new.share_slug <> old.share_slug then
    raise exception 'immutable_column' using errcode = '42501';
  end if;
  if new.hidden_at is distinct from old.hidden_at and current_user in ('authenticated', 'anon') then
    raise exception 'immutable_column' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger garages_guard before update on public.garages for each row execute function private.garages_guard();

-- Contrôle serveur du nombre de véhicules, des doublons (clé primaire) et du budget.
create or replace function private.garage_vehicles_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_total bigint;
  v_budget int := private.setting_int('garage_budget', 10000000);
  v_max int := private.setting_int('garage_max_vehicles', 5);
begin
  perform 1 from public.garages where id = new.garage_id for update;
  if not exists (select 1 from public.vehicles v where v.id = new.vehicle_id and v.status = 'published') then
    raise exception 'vehicle_unavailable' using errcode = '23514';
  end if;
  select count(*), coalesce(sum(v.garage_cost), 0) into v_count, v_total
    from public.garage_vehicles gv join public.vehicles v on v.id = gv.vehicle_id
   where gv.garage_id = new.garage_id and gv.vehicle_id <> new.vehicle_id;
  if v_count + 1 > v_max then
    raise exception 'garage_full' using errcode = '23514';
  end if;
  if new.position > v_max then
    raise exception 'garage_full' using errcode = '23514';
  end if;
  if v_total + (select garage_cost from public.vehicles where id = new.vehicle_id) > v_budget then
    raise exception 'garage_over_budget' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger garage_vehicles_check before insert or update on public.garage_vehicles
  for each row execute function private.garage_vehicles_check();

create or replace function private.garage_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.garages set updated_at = now() where id = coalesce(new.garage_id, old.garage_id);
  return null;
end;
$$;
create trigger garage_vehicles_touch after insert or delete on public.garage_vehicles
  for each row execute function private.garage_touch();

create or replace function private.garage_visible(p_garage uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.garages g
    where g.id = p_garage
      and (g.owner_id = auth.uid()
           or (g.visibility = 'public' and g.hidden_at is null and private.profile_is_listed(g.owner_id)
               and (auth.uid() is null or not private.is_blocked_between(g.owner_id, auth.uid()))))
  );
$$;

create or replace function private.owns_garage(p_garage uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.garages g where g.id = p_garage and g.owner_id = auth.uid());
$$;

create policy "garages: lecture propriétaire ou public" on public.garages for select to anon, authenticated
  using (owner_id = (select auth.uid())
         or (visibility = 'public' and hidden_at is null and private.profile_is_listed(owner_id)
             and ((select auth.uid()) is null or not private.is_blocked_between(owner_id, (select auth.uid())))));
create policy "garages: création par un compte actif" on public.garages for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.can_act() and hidden_at is null);
create policy "garages: modification par le propriétaire" on public.garages for update to authenticated
  using (owner_id = (select auth.uid()) and private.can_act())
  with check (owner_id = (select auth.uid()));
create policy "garages: suppression par le propriétaire" on public.garages for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "garage_vehicles: lecture si garage visible" on public.garage_vehicles for select to anon, authenticated
  using (private.garage_visible(garage_id));
create policy "garage_vehicles: ajout par le propriétaire" on public.garage_vehicles for insert to authenticated
  with check (private.owns_garage(garage_id) and private.can_act());
create policy "garage_vehicles: modification par le propriétaire" on public.garage_vehicles for update to authenticated
  using (private.owns_garage(garage_id) and private.can_act())
  with check (private.owns_garage(garage_id));
create policy "garage_vehicles: retrait par le propriétaire" on public.garage_vehicles for delete to authenticated
  using (private.owns_garage(garage_id) and private.can_act());

-- Enregistrement atomique d'un garage (création ou mise à jour). SECURITY INVOKER :
-- les politiques RLS et les déclencheurs ci-dessus s'appliquent intégralement.
create or replace function public.save_garage(
  p_garage uuid,
  p_name text,
  p_description text,
  p_visibility text,
  p_vehicle_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_garage;
  v_i int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not private.can_act() then raise exception 'account_restricted' using errcode = '42501'; end if;
  if p_vehicle_ids is null then p_vehicle_ids := '{}'; end if;
  if cardinality(p_vehicle_ids) <> (select count(distinct x) from unnest(p_vehicle_ids) x) then
    raise exception 'duplicate_vehicle' using errcode = '23505';
  end if;
  if not private.hit_rate_limit('garage_save:1m:' || auth.uid(), 20, 60) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  if v_id is null then
    insert into public.garages (owner_id, name, description, visibility)
    values (auth.uid(), btrim(p_name), btrim(coalesce(p_description, '')), p_visibility)
    returning id into v_id;
  else
    update public.garages
       set name = btrim(p_name), description = btrim(coalesce(p_description, '')), visibility = p_visibility
     where id = v_id and owner_id = auth.uid();
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    delete from public.garage_vehicles where garage_id = v_id;
  end if;

  for v_i in 1 .. coalesce(array_length(p_vehicle_ids, 1), 0) loop
    insert into public.garage_vehicles (garage_id, vehicle_id, position) values (v_id, p_vehicle_ids[v_i], v_i);
  end loop;
  return v_id;
end;
$$;
