-- Maintenance et durées de conservation (documentées sur /confidentialite).
-- private.run_maintenance() est idempotente : elle peut être lancée par pg_cron
-- (si l'extension est disponible), par un appel RPC service_role, ou à la main.

create or replace function private.run_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessions_unfinished int;
  v_sessions_guest int;
  v_availabilities int;
  v_notifications int;
  v_requests int;
  v_rate int;
  v_reports int;
  v_audit int;
begin
  -- Parties jamais terminées (abandonnées / expirées) : 7 jours.
  delete from public.game_sessions
   where status <> 'finished' and coalesce(expires_at, started_at) < now() - interval '7 days';
  get diagnostics v_sessions_unfinished = row_count;

  -- Parties d'invités (jamais classées) : 30 jours.
  delete from public.game_sessions
   where user_id is null and started_at < now() - interval '30 days';
  get diagnostics v_sessions_guest = row_count;

  -- Disponibilités terminées depuis plus d'un jour.
  delete from public.availabilities where ends_at is not null and ends_at < now() - interval '1 day';
  get diagnostics v_availabilities = row_count;

  -- Notifications lues depuis plus de 90 jours, non lues de plus d'un an.
  delete from public.notifications
   where (read_at is not null and read_at < now() - interval '90 days')
      or created_at < now() - interval '365 days';
  get diagnostics v_notifications = row_count;

  -- Demandes de contact refusées ou retirées : 180 jours.
  delete from public.contact_requests
   where status in ('declined', 'withdrawn')
     and coalesce(responded_at, created_at) < now() - interval '180 days';
  get diagnostics v_requests = row_count;

  -- Compteurs de limitation de débit : 2 jours.
  delete from private.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_rate = row_count;

  -- Signalements traités : 1 an après leur clôture.
  delete from public.reports
   where status in ('resolved', 'dismissed') and handled_at < now() - interval '365 days';
  get diagnostics v_reports = row_count;

  -- Journal d'audit : 1 an.
  delete from public.audit_log where created_at < now() - interval '365 days';
  get diagnostics v_audit = row_count;

  return jsonb_build_object(
    'ran_at', now(),
    'sessions_unfinished', v_sessions_unfinished,
    'sessions_guest', v_sessions_guest,
    'availabilities', v_availabilities,
    'notifications', v_notifications,
    'contact_requests', v_requests,
    'rate_limits', v_rate,
    'reports', v_reports,
    'audit_log', v_audit
  );
end;
$$;

revoke all on function private.run_maintenance() from public, anon, authenticated;

-- Point d'entrée appelable uniquement avec la clé secrète (service_role).
create or replace function public.run_maintenance()
returns jsonb
language sql
security definer
set search_path = ''
as $$ select private.run_maintenance(); $$;

revoke all on function public.run_maintenance() from public, anon, authenticated;
grant execute on function public.run_maintenance() to service_role;

-- Planification quotidienne (04:15 UTC) si pg_cron est disponible.
-- Sur Supabase, activer l'extension « pg_cron » dans Database > Extensions,
-- puis relancer ce bloc (voir docs/DEPLOIEMENT.md). Sans pg_cron, rien ne casse.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.unschedule(jobid) from cron.job where jobname = 'vice-club-maintenance';
      perform cron.schedule('vice-club-maintenance', '15 4 * * *', 'select private.run_maintenance()');
    exception when others then
      raise notice 'pg_cron indisponible (%), planification ignorée', sqlerrm;
    end;
  end if;
end;
$$;
