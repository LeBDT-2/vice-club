-- VICE CLUB — marquage des défis du jour de démonstration.
-- Permet de vérifier avant l'ouverture qu'aucun défi de démonstration n'est publié
-- (docs/DEPLOIEMENT.md, contrôle « aucune donnée de démonstration »).
alter table public.daily_challenges add column is_demo boolean not null default false;

-- Vue d'audit réservée au serveur : nombre de lignes de démonstration par table.
create or replace function public.demo_content_report()
returns table (table_name text, demo_rows bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select 'games', count(*) from public.games where is_demo
  union all select 'platforms', count(*) from public.platforms where is_demo
  union all select 'game_platforms', count(*) from public.game_platforms where is_demo
  union all select 'media_assets', count(*) from public.media_assets where is_demo
  union all select 'vehicles', count(*) from public.vehicles where is_demo
  union all select 'properties', count(*) from public.properties where is_demo
  union all select 'game_maps', count(*) from public.game_maps where is_demo
  union all select 'geo_locations', count(*) from public.geo_locations where is_demo
  union all select 'mystery_puzzles', count(*) from public.mystery_puzzles where is_demo
  union all select 'reality_items', count(*) from public.reality_items where is_demo
  union all select 'daily_challenges', count(*) from public.daily_challenges where is_demo;
$$;
revoke all on function public.demo_content_report() from public, anon, authenticated;
grant execute on function public.demo_content_report() to service_role;
