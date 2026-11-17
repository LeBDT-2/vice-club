-- VICE CLUB — outils complémentaires de modération (équipe + MFA, journalisés).

-- Masquer / réafficher un garage public.
create or replace function public.mod_set_garage_hidden(p_garage uuid, p_hidden boolean, p_reason text, p_report uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_owner uuid;
begin
  if char_length(coalesce(p_reason, '')) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.garages set hidden_at = case when p_hidden then now() else null end
   where id = p_garage returning owner_id into v_owner;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions (moderator_id, target_user_id, action, reason, report_id, target_type, target_id)
  values (v_staff, v_owner, case when p_hidden then 'hide_garage' else 'unhide_garage' end, p_reason, p_report, 'garage', p_garage::text);
  perform private.audit(case when p_hidden then 'garage.hide' else 'garage.unhide' end, 'garage', p_garage::text, '{}'::jsonb);
end;
$$;

-- Recherche de comptes : par pseudo (préfixe) ou par adresse e-mail EXACTE (administrateurs uniquement).
-- L'adresse e-mail n'est jamais renvoyée ; une recherche par e-mail est journalisée.
create or replace function public.mod_search_users(p_query text, p_limit int default 30)
returns table (id uuid, username text, role public.app_role, created_at timestamptz, hidden boolean, sanctioned boolean, last_seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_staff uuid := private.require_staff('moderator');
  v_q text := btrim(coalesce(p_query, ''));
begin
  if position('@' in v_q) > 0 then
    if not private.has_role('admin') then raise exception 'forbidden' using errcode = '42501'; end if;
    perform private.audit('user.lookup_by_email', 'user', null, '{}'::jsonb);
    return query
      select u.id, p.username, private.current_role_of(u.id), u.created_at, p.hidden_at is not null, private.is_sanctioned(u.id), p.last_seen_at
        from auth.users u left join public.profiles p on p.id = u.id
       where lower(u.email) = lower(v_q)
       limit 1;
  else
    return query
      select p.id, p.username, private.current_role_of(p.id), p.created_at, p.hidden_at is not null, private.is_sanctioned(p.id), p.last_seen_at
        from public.profiles p
       where v_q = '' or p.username_normalized like replace(replace(lower(v_q), '%', ''), '_', '\_') || '%'
       order by p.created_at desc
       limit least(greatest(p_limit, 1), 100);
  end if;
end;
$$;

-- Fiche modération d'un compte : rôle, sanctions, historique des décisions.
create or replace function public.mod_user_detail(p_user uuid)
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
    'id', p.id, 'username', p.username, 'bio', p.bio, 'avatar_path', p.avatar_path, 'created_at', p.created_at,
    'hidden_at', p.hidden_at, 'hidden_reason', p.hidden_reason, 'role', private.current_role_of(p.id),
    'sanctions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'reason', s.reason,
                     'starts_at', s.starts_at, 'ends_at', s.ends_at, 'revoked_at', s.revoked_at, 'revoke_reason', s.revoke_reason)
                     order by s.created_at desc) from public.sanctions s where s.user_id = p.id), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('action', a.action, 'reason', a.reason, 'duration_hours', a.duration_hours,
                     'created_at', a.created_at, 'moderator', mp.username) order by a.created_at desc)
                     from public.moderation_actions a left join public.profiles mp on mp.id = a.moderator_id
                     where a.target_user_id = p.id), '[]'::jsonb),
    'reports_received', (select count(*) from public.reports r where r.target_user_id = p.id),
    'garages', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'visibility', g.visibility,
                     'share_slug', g.share_slug, 'hidden_at', g.hidden_at)) from public.garages g where g.owner_id = p.id), '[]'::jsonb)
  ) into v_result
  from public.profiles p where p.id = p_user;
  if v_result is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform private.audit('user.view', 'user', p_user::text, '{}'::jsonb);
  return v_result;
end;
$$;

revoke all on function public.mod_set_garage_hidden(uuid, boolean, text, uuid), public.mod_search_users(text, int), public.mod_user_detail(uuid) from public, anon;
grant execute on function public.mod_set_garage_hidden(uuid, boolean, text, uuid), public.mod_search_users(text, int), public.mod_user_detail(uuid) to authenticated;
