-- Histórico de pessoas online ao mesmo tempo, para o painel mostrar os picos.
-- A cada minuto o banco anota quantas visitas deram sinal nos últimos 90 segundos (a mesma conta do "Online agora").
-- Antes desse registro existir, o número é estimado pelo início e pelo fim de cada visita (marcado como estimado:
-- pode contar a mais quem deixou a aba aberta em segundo plano).

create table public.site_online_log (
  minuto timestamptz primary key,
  online integer not null,
  estimado boolean not null default false
);
comment on table public.site_online_log is 'Pessoas online (sinal nos últimos 90 s) a cada minuto; o painel mostra o pico de cada intervalo.';
alter table public.site_online_log enable row level security;
revoke all on public.site_online_log from anon, authenticated;

create or replace function public.log_online()
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.site_online_log (minuto, online)
    select date_trunc('minute', now()), count(*)::int from public.site_sessions s where s.last_seen > now() - interval '90 seconds'
  on conflict (minuto) do update set online = greatest(public.site_online_log.online, excluded.online), estimado = false;
end $$;
revoke all on function public.log_online() from public, anon, authenticated;

-- estimativa para o que veio antes do registro por minuto
insert into public.site_online_log (minuto, online, estimado)
select m, (select count(*)::int from public.site_sessions s where s.started_at < m + interval '1 minute' and s.last_seen + interval '90 seconds' >= m), true
from generate_series(date_trunc('minute', (select min(started_at) from public.site_sessions)), date_trunc('minute', now()) - interval '1 minute', interval '1 minute') m
where exists (select 1 from public.site_sessions)
on conflict (minuto) do nothing;

select cron.schedule('online-por-minuto', '* * * * *', 'select public.log_online()');

-- painel: pico, média e o minuto do pico em cada intervalo (10 min nas últimas 24 h, 1 h em até 7 dias, 1 dia acima disso)
create or replace function public.admin_online_history(p_horas integer default 24)
returns table (inicio timestamptz, pico integer, media numeric, momento timestamptz, estimado boolean)
language plpgsql stable security definer set search_path = '' as $$
declare passo interval; desde timestamptz;
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  p_horas := least(greatest(coalesce(p_horas, 24), 1), 24 * 400);
  passo := case when p_horas <= 24 then interval '10 minutes' when p_horas <= 24 * 7 then interval '1 hour' else interval '1 day' end;
  if passo = interval '1 day' then
    desde := (date_trunc('day', now() at time zone 'America/Sao_Paulo') - (p_horas / 24 - 1) * interval '1 day') at time zone 'America/Sao_Paulo';
  else
    desde := date_bin(passo, now() - make_interval(hours => p_horas), timestamptz '2000-01-01 00:00:00+00') + passo;
  end if;
  return query
  with b as (select g as ini from generate_series(desde, now(), passo) g)
  select b.ini, coalesce(max(l.online), 0)::int, round(coalesce(avg(l.online), 0), 2),
    (select l2.minuto from public.site_online_log l2 where l2.minuto >= b.ini and l2.minuto < b.ini + passo order by l2.online desc, l2.minuto desc limit 1),
    coalesce(bool_or(l.estimado), false)
  from b left join public.site_online_log l on l.minuto >= b.ini and l.minuto < b.ini + passo
  group by b.ini order by b.ini;
end $$;
revoke all on function public.admin_online_history(integer) from public, anon;
grant execute on function public.admin_online_history(integer) to authenticated;
