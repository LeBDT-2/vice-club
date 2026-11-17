-- VICE CLUB — social : jeux du profil, disponibilités, demandes de contact,
-- messagerie, notifications, signalements, modération.

-- ---------------------------------------------------------------------------
-- Jeux / plateformes déclarés sur le profil + pseudo de jeu public facultatif
-- ---------------------------------------------------------------------------
create table public.profile_games (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  game_platform_id uuid not null references public.game_platforms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_platform_id)
);
create index profile_games_gp_idx on public.profile_games (game_platform_id);
alter table public.profile_games enable row level security;

-- Coordonnées de jeu : uniquement des pseudos publics (PSN, Xbox, Steam, Rockstar…).
-- Visibilité au choix du propriétaire : public, contacts acceptés, ou personne.
create table public.profile_handles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  network text not null check (network in ('psn','xbox','steam','rockstar','discord','epic')),
  handle text not null check (char_length(handle) between 2 and 40 and handle !~ '[\x00-\x1F\x7F<>]'),
  visibility text not null default 'contacts' check (visibility in ('public','contacts','private')),
  created_at timestamptz not null default now(),
  unique (profile_id, network)
);
alter table public.profile_handles enable row level security;

-- ---------------------------------------------------------------------------
-- Disponibilité déclarée (expire toujours). Distincte de la présence technique
-- (profiles.last_seen_at, mise à jour par le serveur).
-- ---------------------------------------------------------------------------
create table public.availabilities (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  game_platform_id uuid references public.game_platforms (id) on delete set null,
  kind text not null check (kind in ('now', 'planned')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '' check (char_length(note) <= 120 and note !~ '[\x00-\x1F\x7F]'),
  created_at timestamptz not null default now(),
  constraint availabilities_window check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours'),
  constraint availabilities_horizon check (starts_at <= created_at + interval '7 days')
);
create index availabilities_ends_idx on public.availabilities (ends_at);
alter table public.availabilities enable row level security;

-- ---------------------------------------------------------------------------
-- Demandes de contact et conversations
-- ---------------------------------------------------------------------------
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 280),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint contact_requests_not_self check (sender_id <> recipient_id)
);
create unique index contact_requests_one_pending on public.contact_requests
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id)) where status = 'pending';
create index contact_requests_recipient_idx on public.contact_requests (recipient_id, status, created_at desc);
create index contact_requests_sender_idx on public.contact_requests (sender_id, status, created_at desc);
alter table public.contact_requests enable row level security;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_order check (user_low < user_high),
  unique (user_low, user_high)
);
alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);
alter table public.conversation_participants enable row level security;

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_by uuid
);
create index messages_conversation_idx on public.messages (conversation_id, id desc);
alter table public.messages enable row level security;

create or replace function private.is_participant(p_conversation uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation and cp.user_id = p_user
  );
$$;

create or replace function private.are_contacts(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.conversations c
    where c.user_low = least(p_a, p_b) and c.user_high = greatest(p_a, p_b)
  ) and not private.is_blocked_between(p_a, p_b);
$$;

-- ---------------------------------------------------------------------------
-- Notifications internes
-- ---------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('contact_request','contact_accepted','report_update','sanction','badge','system')),
  -- Charge utile minimale, jamais de contenu de message privé.
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;

create or replace function private.notify(p_user uuid, p_kind text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, payload) values (p_user, p_kind, coalesce(p_payload, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Signalements et modération
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_type text not null check (target_type in ('profile','message','garage')),
  target_id text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  reason text not null check (reason in ('harcelement','haine','spam','arnaque','contenu_sexuel','mineur','usurpation','triche','autre')),
  details text not null default '' check (char_length(details) <= 1000),
  -- Uniquement le contenu signalé et le contexte nécessaire (jamais la conversation entière).
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  handled_by uuid,
  handled_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create unique index reports_one_open_per_target on public.reports (reporter_id, target_type, target_id) where status = 'open';
alter table public.reports enable row level security;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('suspend','ban','revoke_sanction','hide_profile','unhide_profile','hide_garage','unhide_garage','hide_message','resolve_report','dismiss_report','set_role')),
  reason text not null check (char_length(reason) between 3 and 1000),
  duration_hours int check (duration_hours is null or duration_hours between 1 and 8760),
  report_id uuid references public.reports (id) on delete set null,
  target_type text,
  target_id text,
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_user_id, created_at desc);
alter table public.moderation_actions enable row level security;

-- ===========================================================================
-- Politiques RLS
-- ===========================================================================
create policy "profile_games: lecture si profil visible" on public.profile_games for select to anon, authenticated
  using (profile_id = (select auth.uid()) or private.profile_is_listed(profile_id));
create policy "profile_games: ajout par le propriétaire" on public.profile_games for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.can_act()
              and exists (select 1 from public.game_platforms gp where gp.id = game_platform_id and gp.status = 'published'));
create policy "profile_games: retrait par le propriétaire" on public.profile_games for delete to authenticated
  using (profile_id = (select auth.uid()));

create policy "profile_handles: lecture selon la visibilité choisie" on public.profile_handles for select to anon, authenticated
  using (
    profile_id = (select auth.uid())
    or (visibility = 'public' and private.profile_is_listed(profile_id)
        and ((select auth.uid()) is null or not private.is_blocked_between(profile_id, (select auth.uid()))))
    or (visibility = 'contacts' and private.are_contacts(profile_id, (select auth.uid())))
  );
create policy "profile_handles: ajout par le propriétaire" on public.profile_handles for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.can_act());
create policy "profile_handles: modification par le propriétaire" on public.profile_handles for update to authenticated
  using (profile_id = (select auth.uid()) and private.can_act())
  with check (profile_id = (select auth.uid()));
create policy "profile_handles: suppression par le propriétaire" on public.profile_handles for delete to authenticated
  using (profile_id = (select auth.uid()));

create policy "availabilities: lecture des disponibilités actives" on public.availabilities for select to anon, authenticated
  using (profile_id = (select auth.uid())
         or (ends_at > now() and private.profile_is_listed(profile_id)
             and ((select auth.uid()) is null or not private.is_blocked_between(profile_id, (select auth.uid())))));
create policy "availabilities: déclaration par le propriétaire" on public.availabilities for insert to authenticated
  with check (profile_id = (select auth.uid()) and private.can_act() and ends_at > now());
create policy "availabilities: mise à jour par le propriétaire" on public.availabilities for update to authenticated
  using (profile_id = (select auth.uid()) and private.can_act())
  with check (profile_id = (select auth.uid()) and ends_at > now());
create policy "availabilities: suppression par le propriétaire" on public.availabilities for delete to authenticated
  using (profile_id = (select auth.uid()));

create policy "blocks: suppression de ses blocages" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
-- Création des blocages via block_user() uniquement (effets de bord transactionnels).

create policy "contact_requests: lecture par les deux parties" on public.contact_requests for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create policy "conversations: lecture par les participants" on public.conversations for select to authenticated
  using (private.is_participant(id, (select auth.uid())));
create policy "conversation_participants: lecture par les participants" on public.conversation_participants for select to authenticated
  using (private.is_participant(conversation_id, (select auth.uid())));

create policy "messages: lecture par les participants" on public.messages for select to authenticated
  using (private.is_participant(conversation_id, (select auth.uid())));

create policy "notifications: lecture des siennes" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: marquer comme lues" on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications: suppression des siennes" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "reports: lecture de ses signalements" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy "moderation_actions: lecture équipe" on public.moderation_actions for select to authenticated
  using (private.has_role('moderator') and private.is_aal2());

-- ===========================================================================
-- Fonctions RPC (SECURITY DEFINER, contrôles explicites)
-- ===========================================================================

create or replace function public.send_contact_request(p_recipient uuid, p_message text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_msg text := btrim(coalesce(p_message, ''));
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not private.can_act() then raise exception 'account_restricted' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_me and username is not null) then
    raise exception 'profile_incomplete' using errcode = '42501';
  end if;
  if p_recipient = v_me then raise exception 'cannot_contact_self' using errcode = '22023'; end if;
  if not private.profile_is_listed(p_recipient) or private.is_sanctioned(p_recipient) then
    raise exception 'recipient_unavailable' using errcode = '22023';
  end if;
  -- Un blocage, dans un sens ou dans l'autre, rend la demande impossible
  -- (message générique : on ne révèle pas qui a bloqué qui).
  if private.is_blocked_between(v_me, p_recipient) then
    raise exception 'recipient_unavailable' using errcode = '22023';
  end if;
  if private.are_contacts(v_me, p_recipient) then raise exception 'already_contacts' using errcode = '23505'; end if;
  if exists (select 1 from public.contact_requests r
             where r.status = 'pending'
               and least(r.sender_id, r.recipient_id) = least(v_me, p_recipient)
               and greatest(r.sender_id, r.recipient_id) = greatest(v_me, p_recipient)) then
    raise exception 'request_already_pending' using errcode = '23505';
  end if;
  -- Refus récent : pas de nouvelle demande pendant 7 jours.
  if exists (select 1 from public.contact_requests r
             where r.sender_id = v_me and r.recipient_id = p_recipient
               and r.status = 'declined' and r.responded_at > now() - interval '7 days') then
    raise exception 'request_recently_declined' using errcode = '22023';
  end if;
  if char_length(v_msg) > 280 or v_msg ~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]' then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if not private.hit_rate_limit('contact_req:10m:' || v_me, 5, 600)
     or not private.hit_rate_limit('contact_req:1d:' || v_me, 30, 86400) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  insert into public.contact_requests (sender_id, recipient_id, message)
  values (v_me, p_recipient, v_msg)
  returning id into v_id;

  perform private.notify(p_recipient, 'contact_request', jsonb_build_object('request_id', v_id, 'from', v_me));
  return v_id;
end;
$$;

create or replace function private.ensure_conversation(p_a uuid, p_b uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.conversations (user_low, user_high)
  values (least(p_a, p_b), greatest(p_a, p_b))
  on conflict (user_low, user_high) do nothing;
  select id into v_id from public.conversations where user_low = least(p_a, p_b) and user_high = greatest(p_a, p_b);
  insert into public.conversation_participants (conversation_id, user_id) values (v_id, p_a), (v_id, p_b)
  on conflict do nothing;
  return v_id;
end;
$$;

create or replace function public.respond_contact_request(p_request uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_req public.contact_requests%rowtype;
  v_conv uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not private.can_act() then raise exception 'account_restricted' using errcode = '42501'; end if;

  select * into v_req from public.contact_requests where id = p_request for update;
  if not found or v_req.recipient_id <> v_me then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_req.status <> 'pending' then raise exception 'request_not_pending' using errcode = '22023'; end if;

  if p_accept then
    if private.is_blocked_between(v_req.sender_id, v_me) or private.is_sanctioned(v_req.sender_id) then
      raise exception 'recipient_unavailable' using errcode = '22023';
    end if;
    update public.contact_requests set status = 'accepted', responded_at = now() where id = p_request;
    v_conv := private.ensure_conversation(v_req.sender_id, v_me);
    perform private.notify(v_req.sender_id, 'contact_accepted', jsonb_build_object('conversation_id', v_conv, 'by', v_me));
    return v_conv;
  else
    update public.contact_requests set status = 'declined', responded_at = now() where id = p_request;
    return null;
  end if;
end;
$$;

create or replace function public.withdraw_contact_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.contact_requests set status = 'withdrawn', responded_at = now()
  where id = p_request and sender_id = v_me and status = 'pending';
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_user = v_me then raise exception 'cannot_block_self' using errcode = '22023'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not private.hit_rate_limit('block:1h:' || v_me, 60, 3600) then raise exception 'rate_limited' using errcode = '54000'; end if;

  insert into public.blocks (blocker_id, blocked_id) values (v_me, p_user) on conflict do nothing;
  -- Les demandes en attente dans les deux sens sont closes.
  update public.contact_requests
     set status = case when sender_id = v_me then 'withdrawn' else 'declined' end, responded_at = now()
   where status = 'pending'
     and ((sender_id = v_me and recipient_id = p_user) or (sender_id = p_user and recipient_id = v_me));
  -- La disponibilité et les conversations restent en place mais deviennent inaccessibles
  -- en écriture (contrôle dans send_message) ; le profil n'est plus visible (RLS).
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

create or replace function public.send_message(p_conversation uuid, p_body text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_id bigint;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not private.can_act() then raise exception 'account_restricted' using errcode = '42501'; end if;
  if not private.is_participant(p_conversation, v_me) then raise exception 'not_found' using errcode = 'P0002'; end if;

  select cp.user_id into v_other from public.conversation_participants cp
   where cp.conversation_id = p_conversation and cp.user_id <> v_me limit 1;
  if v_other is null then raise exception 'conversation_closed' using errcode = '22023'; end if;
  if private.is_blocked_between(v_me, v_other) then raise exception 'conversation_closed' using errcode = '22023'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'invalid_message' using errcode = '22023'; end if;
  if v_body ~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]' then raise exception 'invalid_message' using errcode = '22023'; end if;
  if not private.hit_rate_limit('msg:1m:' || v_me, 12, 60)
     or not private.hit_rate_limit('msg:1d:' || v_me, 400, 86400) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (p_conversation, v_me, v_body)
  returning id into v_id;
  update public.conversations set last_message_at = now() where id = p_conversation;
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation and user_id = v_me;
  return v_id;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation and user_id = auth.uid();
$$;

-- Liste des conversations de l'appelant avec indicateur non lu.
create or replace function public.my_conversations(p_limit int default 30, p_offset int default 0)
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_username text,
  other_avatar_path text,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_mine boolean,
  unread boolean,
  blocked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         o.user_id,
         case when private.profile_is_listed(o.user_id) and not private.is_blocked_between(o.user_id, auth.uid()) then p.username else null end,
         case when private.profile_is_listed(o.user_id) and not private.is_blocked_between(o.user_id, auth.uid()) then p.avatar_path else null end,
         c.last_message_at,
         (select case when m.hidden_at is not null then null else left(m.body, 120) end
            from public.messages m where m.conversation_id = c.id order by m.id desc limit 1),
         (select m.sender_id = auth.uid() from public.messages m where m.conversation_id = c.id order by m.id desc limit 1),
         coalesce(c.last_message_at > me.last_read_at
                  and exists (select 1 from public.messages m where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.created_at > me.last_read_at), false),
         private.is_blocked_between(o.user_id, auth.uid())
    from public.conversation_participants me
    join public.conversations c on c.id = me.conversation_id
    left join public.conversation_participants o on o.conversation_id = c.id and o.user_id <> auth.uid()
    left join public.profiles p on p.id = o.user_id
   where me.user_id = auth.uid()
   order by coalesce(c.last_message_at, c.created_at) desc
   limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

create or replace function public.unread_counts()
returns table (messages int, notifications int, requests int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.conversation_participants me
       join public.conversations c on c.id = me.conversation_id
      where me.user_id = auth.uid()
        and exists (select 1 from public.messages m where m.conversation_id = c.id
                     and m.sender_id <> auth.uid() and m.created_at > me.last_read_at)),
    (select count(*)::int from public.notifications n where n.user_id = auth.uid() and n.read_at is null),
    (select count(*)::int from public.contact_requests r where r.recipient_id = auth.uid() and r.status = 'pending');
$$;

-- Signalement. Pour un message, seul le message concerné est copié (instantané).
create or replace function public.report_content(p_target_type text, p_target_id text, p_reason text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_target_user uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_msg public.messages%rowtype;
  v_id uuid;
begin
  if v_me is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if char_length(coalesce(p_details, '')) > 1000 then raise exception 'invalid_details' using errcode = '22023'; end if;
  if not private.hit_rate_limit('report:1d:' || v_me, 20, 86400) then raise exception 'rate_limited' using errcode = '54000'; end if;

  if p_target_type = 'profile' then
    select p.id, jsonb_build_object('username', p.username, 'bio', p.bio, 'avatar_path', p.avatar_path)
      into v_target_user, v_snapshot
      from public.profiles p where p.id = p_target_id::uuid and p.username is not null;
  elsif p_target_type = 'garage' then
    select g.owner_id, jsonb_build_object('name', g.name, 'description', g.description)
      into v_target_user, v_snapshot
      from public.garages g where g.id = p_target_id::uuid and g.visibility = 'public';
  elsif p_target_type = 'message' then
    select * into v_msg from public.messages m where m.id = p_target_id::bigint;
    if found and private.is_participant(v_msg.conversation_id, v_me) and v_msg.sender_id <> v_me then
      v_target_user := v_msg.sender_id;
      v_snapshot := jsonb_build_object('message_id', v_msg.id, 'body', v_msg.body, 'sent_at', v_msg.created_at,
                                       'conversation_id', v_msg.conversation_id);
    end if;
  else
    raise exception 'invalid_target' using errcode = '22023';
  end if;

  if v_target_user is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_target_user = v_me then raise exception 'cannot_report_self' using errcode = '22023'; end if;

  insert into public.reports (reporter_id, target_type, target_id, target_user_id, reason, details, snapshot)
  values (v_me, p_target_type, p_target_id, v_target_user, p_reason, btrim(coalesce(p_details, '')), v_snapshot)
  on conflict (reporter_id, target_type, target_id) where status = 'open' do nothing
  returning id into v_id;
  if v_id is null then raise exception 'report_already_open' using errcode = '23505'; end if;
  return v_id;
exception
  when invalid_text_representation then raise exception 'not_found' using errcode = 'P0002';
end;
$$;

-- ---------------------------------------------------------------------------
-- Modération (équipe + MFA obligatoire). Chaque accès sensible est journalisé.
-- ---------------------------------------------------------------------------
create or replace function public.mod_list_reports(p_status text default 'open', p_limit int default 50, p_offset int default 0)
returns table (id uuid, target_type text, target_id text, target_user_id uuid, target_username text, reason text,
               status text, created_at timestamptz, reporter_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff('moderator');
  return query
    select r.id, r.target_type, r.target_id, r.target_user_id, p.username, r.reason, r.status, r.created_at,
           (select count(*) from public.reports r2 where r2.target_type = r.target_type and r2.target_id = r.target_id)
      from public.reports r
      left join public.profiles p on p.id = r.target_user_id
     where r.status = p_status
     order by r.created_at asc
     limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.mod_get_report(p_report uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_result jsonb;
begin
  select jsonb_build_object(
           'id', r.id, 'target_type', r.target_type, 'target_id', r.target_id,
           'target_user_id', r.target_user_id, 'target_username', tp.username,
           'reporter_username', rp.username, 'reason', r.reason, 'details', r.details,
           'snapshot', r.snapshot, 'status', r.status, 'created_at', r.created_at,
           'handled_at', r.handled_at, 'decision_note', r.decision_note,
           'history', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'reason', a.reason,
                                  'duration_hours', a.duration_hours, 'created_at', a.created_at) order by a.created_at desc)
                                from public.moderation_actions a where a.target_user_id = r.target_user_id), '[]'::jsonb),
           'active_sanction', private.is_sanctioned(r.target_user_id))
    into v_result
    from public.reports r
    left join public.profiles tp on tp.id = r.target_user_id
    left join public.profiles rp on rp.id = r.reporter_id
   where r.id = p_report;
  if v_result is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.audit('report.view', 'report', p_report::text, jsonb_build_object('by', v_staff));
  return v_result;
end;
$$;

create or replace function public.mod_close_report(p_report uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_report public.reports%rowtype;
begin
  if p_decision not in ('resolved', 'dismissed') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if char_length(coalesce(p_note, '')) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.reports set status = p_decision, handled_by = v_staff, handled_at = now(), decision_note = p_note
   where id = p_report and status = 'open'
  returning * into v_report;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions (moderator_id, target_user_id, action, reason, report_id, target_type, target_id)
  values (v_staff, v_report.target_user_id, case when p_decision = 'resolved' then 'resolve_report' else 'dismiss_report' end,
          p_note, p_report, v_report.target_type, v_report.target_id);
  if v_report.reporter_id is not null then
    perform private.notify(v_report.reporter_id, 'report_update', jsonb_build_object('report_id', p_report, 'status', p_decision));
  end if;
  perform private.audit('report.' || p_decision, 'report', p_report::text, '{}'::jsonb);
end;
$$;

create or replace function public.mod_sanction_user(p_user uuid, p_kind text, p_reason text, p_duration_hours int default null, p_report uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_id uuid;
begin
  if p_user = v_staff then raise exception 'cannot_sanction_self' using errcode = '22023'; end if;
  if private.current_role_of(p_user) <> 'user' and private.current_role_of(v_staff) <> 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if private.current_role_of(p_user) = 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind = 'ban' and private.current_role_of(v_staff) <> 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('suspension', 'ban') then raise exception 'invalid_kind' using errcode = '22023'; end if;
  if char_length(coalesce(p_reason, '')) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  if p_kind = 'suspension' and (p_duration_hours is null or p_duration_hours < 1 or p_duration_hours > 8760) then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  insert into public.sanctions (user_id, kind, reason, ends_at, report_id, created_by)
  values (p_user, p_kind, p_reason,
          case when p_kind = 'suspension' then now() + make_interval(hours => p_duration_hours) end,
          p_report, v_staff)
  returning id into v_id;

  -- Effets immédiats : disponibilité retirée.
  delete from public.availabilities where profile_id = p_user;

  insert into public.moderation_actions (moderator_id, target_user_id, action, reason, duration_hours, report_id)
  values (v_staff, p_user, case when p_kind = 'ban' then 'ban' else 'suspend' end, p_reason, p_duration_hours, p_report);
  perform private.notify(p_user, 'sanction', jsonb_build_object('kind', p_kind, 'sanction_id', v_id));
  perform private.audit('sanction.' || p_kind, 'user', p_user::text, jsonb_build_object('sanction_id', v_id, 'hours', p_duration_hours));
  return v_id;
end;
$$;

create or replace function public.mod_revoke_sanction(p_sanction uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_s public.sanctions%rowtype;
begin
  if char_length(coalesce(p_reason, '')) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  select * into v_s from public.sanctions where id = p_sanction and revoked_at is null for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_s.kind = 'ban' and private.current_role_of(v_staff) <> 'admin' then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.sanctions set revoked_at = now(), revoked_by = v_staff, revoke_reason = p_reason where id = p_sanction;
  insert into public.moderation_actions (moderator_id, target_user_id, action, reason)
  values (v_staff, v_s.user_id, 'revoke_sanction', p_reason);
  perform private.audit('sanction.revoke', 'user', v_s.user_id::text, jsonb_build_object('sanction_id', p_sanction));
end;
$$;

create or replace function public.mod_set_profile_hidden(p_user uuid, p_hidden boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
begin
  if char_length(coalesce(p_reason, '')) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.profiles
     set hidden_at = case when p_hidden then now() else null end,
         hidden_reason = case when p_hidden then p_reason else null end
   where id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions (moderator_id, target_user_id, action, reason, target_type, target_id)
  values (v_staff, p_user, case when p_hidden then 'hide_profile' else 'unhide_profile' end, p_reason, 'profile', p_user::text);
  perform private.audit(case when p_hidden then 'profile.hide' else 'profile.unhide' end, 'profile', p_user::text, '{}'::jsonb);
end;
$$;

create or replace function public.mod_hide_message(p_message bigint, p_reason text, p_report uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_sender uuid;
begin
  -- Uniquement un message ayant fait l'objet d'un signalement.
  if not exists (select 1 from public.reports r where r.id = p_report and r.target_type = 'message' and r.target_id = p_message::text) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.messages set hidden_at = now(), hidden_by = v_staff where id = p_message returning sender_id into v_sender;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions (moderator_id, target_user_id, action, reason, report_id, target_type, target_id)
  values (v_staff, v_sender, 'hide_message', p_reason, p_report, 'message', p_message::text);
  perform private.audit('message.hide', 'message', p_message::text, jsonb_build_object('report_id', p_report));
end;
$$;

-- Attribution des rôles : administrateur + MFA, jamais sur soi-même.
create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('admin');
begin
  if p_user = v_staff then raise exception 'cannot_change_own_role' using errcode = '22023'; end if;
  if char_length(coalesce(p_reason, '')) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.user_roles (user_id, role, granted_by, granted_at) values (p_user, p_role, v_staff, now())
  on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by, granted_at = now();
  insert into public.moderation_actions (moderator_id, target_user_id, action, reason, target_type, target_id)
  values (v_staff, p_user, 'set_role', p_reason, 'role', p_role::text);
  perform private.audit('role.set', 'user', p_user::text, jsonb_build_object('role', p_role));
end;
$$;

-- Création du premier administrateur : à exécuter depuis la console SQL (rôle postgres).
-- Jamais exposée à l'API.
create or replace function private.bootstrap_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email) and email_confirmed_at is not null;
  if v_id is null then raise exception 'confirmed user not found'; end if;
  insert into public.user_roles (user_id, role, granted_at) values (v_id, 'admin', now())
  on conflict (user_id) do update set role = 'admin', granted_at = now();
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (null, 'role.bootstrap_admin', 'user', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;
revoke all on function private.bootstrap_admin(text) from public, anon, authenticated, service_role;
