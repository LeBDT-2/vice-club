-- VICE CLUB — moteur des mini-jeux, défi du jour, résultats, classements, badges.
--
-- Anti-triche :
--   * Les sessions et manches (avec références aux solutions) ne sont accessibles
--     qu'au serveur (clé service). Aucun privilège client.
--   * Le score est calculé par le serveur ; la transition d'état est atomique
--     (verrou de ligne + contrôle de position + compteur d'essais attendu).
--   * Un seul essai classé par compte et par défi (index unique).

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  game_kind text not null check (game_kind in ('where', 'mystery', 'higher_lower', 'reality')),
  title text not null default '' check (char_length(title) <= 80),
  round_count smallint not null check (round_count between 1 and 20),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger daily_challenges_updated_at before update on public.daily_challenges for each row execute function private.set_updated_at();
alter table public.daily_challenges enable row level security;

-- SECRET : contenu des manches de chaque défi.
create table public.daily_challenge_items (
  challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  position smallint not null check (position >= 1),
  ref_type text not null check (ref_type in ('geo_location', 'mystery_puzzle', 'reality_item', 'vehicle', 'property')),
  ref_id uuid not null,
  ref_b_type text check (ref_b_type in ('vehicle', 'property')),
  ref_b_id uuid,
  primary key (challenge_id, position)
);
alter table public.daily_challenge_items enable row level security;

create policy "daily_challenges: lecture des défis publiés passés ou du jour" on public.daily_challenges
  for select to anon, authenticated
  using (status = 'published' and challenge_date <= private.today_paris());

create or replace function private.price_item_ok(p_type text, p_id uuid)
returns table (ok boolean, game_id uuid, price_type text)
language sql
stable
security definer
set search_path = ''
as $$
  select true, v.game_id, v.game_price_type from public.vehicles v
   where p_type = 'vehicle' and v.id = p_id and v.status = 'published' and v.game_price is not null
  union all
  select true, p.game_id, p.game_price_type from public.properties p
   where p_type = 'property' and p.id = p_id and p.status = 'published';
$$;

-- Refuse la publication d'un défi incomplet ou incohérent.
create or replace function private.daily_challenge_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_count int;
  v_a record;
  v_b record;
begin
  if tg_op = 'UPDATE' and old.status = 'published' and old.challenge_date <= private.today_paris() then
    if new.status <> old.status or new.challenge_date <> old.challenge_date or new.game_kind <> old.game_kind
       or new.round_count <> old.round_count then
      raise exception 'challenge_already_live' using errcode = '23514';
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if new.challenge_date < private.today_paris() then
      raise exception 'challenge_in_past' using errcode = '23514';
    end if;
    select count(*) into v_count from public.daily_challenge_items where challenge_id = new.id;
    if v_count <> new.round_count then
      raise exception 'challenge_incomplete' using errcode = '23514';
    end if;
    if new.game_kind = 'mystery' and new.round_count <> 1 then raise exception 'challenge_bad_round_count' using errcode = '23514'; end if;
    if new.game_kind = 'where' and new.round_count not between 3 and 10 then raise exception 'challenge_bad_round_count' using errcode = '23514'; end if;
    if new.game_kind in ('reality', 'higher_lower') and new.round_count not between 5 and 20 then raise exception 'challenge_bad_round_count' using errcode = '23514'; end if;

    for v_item in select * from public.daily_challenge_items where challenge_id = new.id order by position loop
      if v_item.position > new.round_count then raise exception 'challenge_incomplete' using errcode = '23514'; end if;
      if new.game_kind = 'where' then
        if v_item.ref_type <> 'geo_location' or not exists (select 1 from public.geo_locations g where g.id = v_item.ref_id and g.status = 'published') then
          raise exception 'challenge_item_invalid' using errcode = '23514';
        end if;
      elsif new.game_kind = 'mystery' then
        if v_item.ref_type <> 'mystery_puzzle' or not exists (select 1 from public.mystery_puzzles m where m.id = v_item.ref_id and m.status = 'published') then
          raise exception 'challenge_item_invalid' using errcode = '23514';
        end if;
      elsif new.game_kind = 'reality' then
        if v_item.ref_type <> 'reality_item' or not exists (select 1 from public.reality_items r where r.id = v_item.ref_id and r.status = 'published') then
          raise exception 'challenge_item_invalid' using errcode = '23514';
        end if;
      elsif new.game_kind = 'higher_lower' then
        if v_item.ref_b_id is null then raise exception 'challenge_item_invalid' using errcode = '23514'; end if;
        select * into v_a from private.price_item_ok(v_item.ref_type, v_item.ref_id);
        select * into v_b from private.price_item_ok(v_item.ref_b_type, v_item.ref_b_id);
        if v_a.ok is null or v_b.ok is null or v_a.game_id <> v_b.game_id or v_a.price_type <> v_b.price_type then
          raise exception 'challenge_item_invalid' using errcode = '23514';
        end if;
      end if;
    end loop;
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger daily_challenges_guard before insert or update on public.daily_challenges
  for each row execute function private.daily_challenge_guard();

create or replace function private.daily_items_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.daily_challenges c
              where c.id = coalesce(new.challenge_id, old.challenge_id) and c.status = 'published') then
    raise exception 'challenge_published_locked' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger daily_items_guard before insert or update or delete on public.daily_challenge_items
  for each row execute function private.daily_items_guard();

-- ---------------------------------------------------------------------------
-- Sessions et manches (SECRET)
-- ---------------------------------------------------------------------------
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_kind text not null check (game_kind in ('where', 'mystery', 'higher_lower', 'reality')),
  mode text not null check (mode in ('training', 'daily')),
  user_id uuid references auth.users (id) on delete cascade,
  guest_token_hash text,
  challenge_id uuid references public.daily_challenges (id) on delete set null,
  challenge_date date,
  ranked boolean not null default false,
  status text not null default 'active' check (status in ('active', 'finished', 'expired')),
  current_position smallint not null default 1,
  total_rounds smallint,
  score int not null default 0,
  max_score int,
  meta jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  constraint game_sessions_owner check (user_id is not null or guest_token_hash is not null),
  constraint game_sessions_daily check ((mode = 'daily') = (challenge_date is not null)),
  constraint game_sessions_ranked check (not ranked or (user_id is not null and mode = 'daily' and challenge_id is not null))
);
create unique index game_sessions_one_ranked on public.game_sessions (user_id, challenge_id) where ranked;
create index game_sessions_user_idx on public.game_sessions (user_id, started_at desc);
create index game_sessions_active_idx on public.game_sessions (expires_at) where status = 'active';

create table public.game_rounds (
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  position smallint not null check (position >= 1),
  ref_type text not null,
  ref_id uuid not null,
  ref_b_type text,
  ref_b_id uuid,
  max_attempts smallint not null default 1 check (max_attempts between 1 and 6),
  attempts smallint not null default 0,
  answers jsonb not null default '[]'::jsonb,
  result jsonb,
  score int,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (session_id, position),
  constraint game_rounds_attempts check (attempts <= max_attempts)
);

alter table public.game_sessions enable row level security;
alter table public.game_rounds enable row level security;
-- Aucune politique : inaccessible à anon/authenticated.

-- ---------------------------------------------------------------------------
-- Résultats publics (sans aucune donnée de solution)
-- ---------------------------------------------------------------------------
create table public.game_results (
  session_id uuid primary key references public.game_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_kind text not null,
  mode text not null,
  ranked boolean not null,
  challenge_id uuid references public.daily_challenges (id) on delete set null,
  challenge_date date,
  score int not null,
  max_score int,
  duration_ms int not null,
  share_text text not null default '',
  completed_at timestamptz not null default now()
);
create index game_results_daily_idx on public.game_results (challenge_date, score desc, duration_ms asc) where ranked;
create index game_results_user_idx on public.game_results (user_id, game_kind, completed_at desc);
alter table public.game_results enable row level security;

create policy "game_results: lecture des siens" on public.game_results for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Badges (récompenses purement visuelles)
-- ---------------------------------------------------------------------------
create table public.badges (
  slug text primary key check (slug ~ '^[a-z0-9_]{3,40}$'),
  name text not null,
  description text not null,
  sort_order int not null default 100
);
alter table public.badges enable row level security;
create policy "badges: lecture publique" on public.badges for select to anon, authenticated using (true);

insert into public.badges (slug, name, description, sort_order) values
  ('premier_defi', 'Première virée', 'A terminé son premier défi du jour classé.', 10),
  ('sans_faute', 'Sans faute', 'A obtenu le score maximal à un défi du jour.', 20),
  ('serie_7', 'Semaine complète', 'A terminé le défi du jour 7 jours de suite.', 30),
  ('serie_30', 'Habitué du club', 'A terminé le défi du jour 30 jours de suite.', 40);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_slug text not null references public.badges (slug) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);
alter table public.user_badges enable row level security;
create policy "user_badges: lecture des siens ou publics" on public.user_badges for select to anon, authenticated
  using (user_id = (select auth.uid())
         or (private.profile_is_listed(user_id)
             and exists (select 1 from public.profiles p where p.id = user_id and p.show_badges)));

create or replace function private.award_badge(p_user uuid, p_badge text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_badges (user_id, badge_slug) values (p_user, p_badge) on conflict do nothing;
  if found then
    perform private.notify(p_user, 'badge', jsonb_build_object('badge', p_badge));
  end if;
end;
$$;

create or replace function private.daily_streak(p_user uuid, p_until date)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  with recursive days as (
    select p_until as d, 1 as n
     where exists (select 1 from public.game_results r where r.user_id = p_user and r.ranked and r.challenge_date = p_until)
    union all
    select d - 1, n + 1 from days
     where exists (select 1 from public.game_results r where r.user_id = p_user and r.ranked and r.challenge_date = days.d - 1)
       and n < 400
  )
  select coalesce(max(n), 0) from days;
$$;

-- ---------------------------------------------------------------------------
-- Transition atomique d'une manche (appelée uniquement par le serveur).
-- ---------------------------------------------------------------------------
create or replace function public.game_commit_answer(
  p_session uuid,
  p_position int,
  p_expected_attempts int,
  p_answer jsonb,
  p_result jsonb,
  p_round_score int,
  p_round_complete boolean,
  p_session_complete boolean,
  p_next_round jsonb default null,
  p_share_text text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.game_sessions%rowtype;
  v_r public.game_rounds%rowtype;
  v_max_round int;
  v_streak int;
begin
  select * into v_s from public.game_sessions where id = p_session for update;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  if v_s.status <> 'active' then raise exception 'session_closed' using errcode = '22023'; end if;
  if v_s.expires_at <= now() then
    update public.game_sessions set status = 'expired' where id = p_session;
    return jsonb_build_object('error', 'session_expired');
  end if;
  if v_s.current_position <> p_position then raise exception 'round_mismatch' using errcode = '22023'; end if;

  select * into v_r from public.game_rounds where session_id = p_session and position = p_position for update;
  if not found then raise exception 'round_not_found' using errcode = 'P0002'; end if;
  if v_r.answered_at is not null then raise exception 'round_already_answered' using errcode = '22023'; end if;
  if v_r.attempts <> p_expected_attempts then raise exception 'stale_attempt' using errcode = '40001'; end if;
  if v_r.attempts + 1 > v_r.max_attempts then raise exception 'no_attempts_left' using errcode = '22023'; end if;

  v_max_round := case v_s.game_kind when 'where' then 5000 when 'mystery' then 1000 when 'higher_lower' then 1 when 'reality' then 100 end;
  if p_round_score < 0 or p_round_score > v_max_round then raise exception 'invalid_score' using errcode = '22023'; end if;
  if not p_round_complete and p_round_score <> 0 then raise exception 'invalid_score' using errcode = '22023'; end if;
  if v_s.total_rounds is not null and p_session_complete and p_position < v_s.total_rounds and p_next_round is not null then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.game_rounds
     set attempts = attempts + 1,
         answers = answers || jsonb_build_array(p_answer),
         result = p_result,
         score = case when p_round_complete then p_round_score else null end,
         answered_at = case when p_round_complete then now() else null end
   where session_id = p_session and position = p_position;

  if p_round_complete then
    update public.game_sessions
       set score = score + p_round_score,
           current_position = current_position + 1
     where id = p_session
    returning * into v_s;

    if p_next_round is not null and not p_session_complete then
      insert into public.game_rounds (session_id, position, ref_type, ref_id, ref_b_type, ref_b_id, max_attempts)
      values (p_session, p_position + 1, p_next_round ->> 'ref_type', (p_next_round ->> 'ref_id')::uuid,
              p_next_round ->> 'ref_b_type', (p_next_round ->> 'ref_b_id')::uuid,
              coalesce((p_next_round ->> 'max_attempts')::int, 1));
    end if;
  end if;

  if p_session_complete then
    update public.game_sessions set status = 'finished', finished_at = now() where id = p_session
    returning * into v_s;

    if v_s.user_id is not null then
      insert into public.game_results (session_id, user_id, game_kind, mode, ranked, challenge_id, challenge_date,
                                       score, max_score, duration_ms, share_text)
      values (v_s.id, v_s.user_id, v_s.game_kind, v_s.mode, v_s.ranked, v_s.challenge_id, v_s.challenge_date,
              v_s.score, v_s.max_score,
              least(extract(epoch from (v_s.finished_at - v_s.started_at)) * 1000, 2147483647)::int,
              left(coalesce(p_share_text, ''), 500));

      if v_s.ranked then
        perform private.award_badge(v_s.user_id, 'premier_defi');
        if v_s.max_score is not null and v_s.score >= v_s.max_score then
          perform private.award_badge(v_s.user_id, 'sans_faute');
        end if;
        v_streak := private.daily_streak(v_s.user_id, v_s.challenge_date);
        if v_streak >= 7 then perform private.award_badge(v_s.user_id, 'serie_7'); end if;
        if v_streak >= 30 then perform private.award_badge(v_s.user_id, 'serie_30'); end if;
      end if;
    end if;
  end if;

  return jsonb_build_object('status', v_s.status, 'score', v_s.score, 'current_position', v_s.current_position);
end;
$$;
revoke all on function public.game_commit_answer(uuid, int, int, jsonb, jsonb, int, boolean, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.game_commit_answer(uuid, int, int, jsonb, jsonb, int, boolean, boolean, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- Classements (règles explicites, uniquement des parties classées) :
--   * Quotidien : score décroissant, puis durée croissante, puis heure de fin.
--   * Période (mois / global) : somme des scores des défis du jour classés,
--     puis nombre de participations, puis meilleur score.
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_daily(p_date date, p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_path text, score int, max_score int, duration_ms int)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by r.score desc, r.duration_ms asc),
         r.user_id, p.username, p.avatar_path, r.score, r.max_score, r.duration_ms
    from public.game_results r
    join public.profiles p on p.id = r.user_id
   where r.ranked and r.challenge_date = p_date and p_date <= private.today_paris()
     and private.profile_is_listed(r.user_id) and p.show_results
   order by r.score desc, r.duration_ms asc, r.completed_at asc
   limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.leaderboard_period(p_from date, p_to date, p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_path text, total_score bigint, participations bigint, best_score int)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by sum(r.score) desc, count(*) desc, max(r.score) desc),
         r.user_id, p.username, p.avatar_path, sum(r.score)::bigint, count(*), max(r.score)
    from public.game_results r
    join public.profiles p on p.id = r.user_id
   where r.ranked and r.challenge_date between p_from and least(p_to, private.today_paris())
     and private.profile_is_listed(r.user_id) and p.show_results
   group by r.user_id, p.username, p.avatar_path
   order by sum(r.score) desc, count(*) desc, max(r.score) desc
   limit least(greatest(p_limit, 1), 100);
$$;

-- Résultats publics d'un joueur (si choisis comme publics).
create or replace function public.public_player_stats(p_user uuid)
returns table (game_kind text, best_score int, games_played bigint, daily_played bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.game_kind, max(r.score), count(*), count(*) filter (where r.ranked)
    from public.game_results r
    join public.profiles p on p.id = r.user_id
   where r.user_id = p_user and p.show_results and private.profile_is_listed(p_user)
     and (auth.uid() is null or not private.is_blocked_between(p_user, auth.uid()))
   group by r.game_kind;
$$;
