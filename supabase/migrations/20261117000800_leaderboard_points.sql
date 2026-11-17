-- VICE CLUB — classements mensuel et global : points normalisés.
-- Les défis n'ont pas la même échelle de score (Où suis-je ? : 25 000 max,
-- Voiture mystère : 1 000 max…). Chaque défi classé rapporte donc
-- round(1000 × score / score maximum) points de classement, soit 1 000 au plus.
-- Départage : points, puis nombre de participations, puis meilleur défi.
drop function if exists public.leaderboard_period(date, date, int);

create function public.leaderboard_period(p_from date, p_to date, p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, avatar_path text, total_points bigint, participations bigint, best_points int)
language sql
stable
security definer
set search_path = ''
as $$
  with pts as (
    select r.user_id, round(1000.0 * r.score / greatest(r.max_score, 1))::int as points
      from public.game_results r
     where r.ranked and r.max_score is not null
       and r.challenge_date between p_from and least(p_to, private.today_paris())
  )
  select rank() over (order by sum(x.points) desc, count(*) desc, max(x.points) desc),
         x.user_id, p.username, p.avatar_path, sum(x.points)::bigint, count(*), max(x.points)
    from pts x
    join public.profiles p on p.id = x.user_id
   where private.profile_is_listed(x.user_id) and p.show_results
   group by x.user_id, p.username, p.avatar_path
   order by sum(x.points) desc, count(*) desc, max(x.points) desc
   limit least(greatest(p_limit, 1), 100);
$$;
revoke all on function public.leaderboard_period(date, date, int) from public;
grant execute on function public.leaderboard_period(date, date, int) to anon, authenticated;

-- Rang personnel pour un défi donné (même règle que leaderboard_daily), y compris hors du top.
create or replace function public.my_daily_rank(p_date date)
returns table (rank bigint, participants bigint, score int, max_score int)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select r.user_id, r.score, r.max_score,
           rank() over (order by r.score desc, r.duration_ms asc) as rk,
           count(*) over () as n
      from public.game_results r
     where r.ranked and r.challenge_date = p_date
  )
  select rk, n, score, max_score from ranked where user_id = auth.uid();
$$;
revoke all on function public.my_daily_rank(date) from public, anon;
grant execute on function public.my_daily_rank(date) to authenticated;
