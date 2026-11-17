-- Messages adressés à l'équipe via /contact (questions, droits RGPD, droits d'auteur,
-- contestation de sanction, bug). Écriture et lecture uniquement côté serveur
-- (clé secrète) après validation, limitation de débit et contrôle d'accès équipe.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  reply_email text check (reply_email is null or (char_length(reply_email) <= 254 and reply_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  category text not null check (category in ('question', 'signalement', 'donnees', 'droits_auteur', 'contestation', 'bug', 'autre')),
  subject text not null check (char_length(subject) between 3 and 120),
  body text not null check (char_length(body) between 10 and 3000),
  page_url text check (page_url is null or char_length(page_url) <= 300),
  status text not null default 'open' check (status in ('open', 'closed')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  staff_note text check (staff_note is null or char_length(staff_note) <= 1000),
  created_at timestamptz not null default now(),
  constraint contact_messages_reachable check (user_id is not null or reply_email is not null)
);

create index contact_messages_open_idx on public.contact_messages (created_at desc) where status = 'open';

alter table public.contact_messages enable row level security;
-- Aucune politique : ni anon ni authenticated n'y accèdent directement.
revoke all on public.contact_messages from anon, authenticated;

-- Conservation : messages traités supprimés un an après leur traitement.
create or replace function private.run_maintenance_contact()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v int;
begin
  delete from public.contact_messages where status = 'closed' and handled_at < now() - interval '365 days';
  get diagnostics v = row_count;
  return v;
end;
$$;
revoke all on function private.run_maintenance_contact() from public, anon, authenticated;

-- Intègre ce nettoyage à la maintenance quotidienne existante.
create or replace function public.run_maintenance()
returns jsonb
language sql
security definer
set search_path = ''
as $$ select private.run_maintenance() || jsonb_build_object('contact_messages', private.run_maintenance_contact()); $$;
revoke all on function public.run_maintenance() from public, anon, authenticated;
grant execute on function public.run_maintenance() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'vice-club-maintenance';
    perform cron.schedule('vice-club-maintenance', '15 4 * * *', 'select public.run_maintenance()');
  end if;
exception when others then
  raise notice 'planification ignorée : %', sqlerrm;
end;
$$;
