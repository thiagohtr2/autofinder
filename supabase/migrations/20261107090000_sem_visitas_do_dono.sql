-- As visitas do dono não entram nos números: quem está logado como admin não gera visita nem ação, em qualquer aparelho.
-- (O site também desliga a medição no navegador onde o admin entrou, e ignora robôs e testes automáticos.)
create or replace function public.track_ping(p_session uuid, p_visitor uuid, p_info jsonb DEFAULT '{}'::jsonb)
 returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_ref text := left(nullif(p_info->>'referrer',''), 500);
begin
  if p_session is null or p_visitor is null then return; end if;
  if public.is_admin() then return; end if;  -- visita do dono não conta
  if pg_column_size(p_info) > 4000 then p_info := '{}'::jsonb; end if;

  insert into public.site_sessions as s (
    id, visitor_id, user_id, current_path, landing_path, referrer, ref_domain,
    utm_source, utm_medium, utm_campaign, device, browser, os, screen_w, language, timezone, is_new_visitor)
  values (
    p_session, p_visitor, (select auth.uid()),
    left(p_info->>'path',300), left(p_info->>'path',300), v_ref,
    lower(substring(v_ref from '^https?://(?:www\.)?([^/:?#]+)')),
    left(p_info->>'utm_source',100), left(p_info->>'utm_medium',100), left(p_info->>'utm_campaign',100),
    left(p_info->>'device',20), left(p_info->>'browser',30), left(p_info->>'os',30),
    case when (p_info->>'screen_w') ~ '^\d{1,5}$' then (p_info->>'screen_w')::int end,
    left(p_info->>'language',20), left(p_info->>'timezone',60),
    not exists (select 1 from public.site_sessions x where x.visitor_id = p_visitor))
  on conflict (id) do update set
    last_seen    = now(),
    user_id      = coalesce((select auth.uid()), s.user_id),
    current_path = coalesce(left(excluded.current_path,300), s.current_path)
  where s.visitor_id = p_visitor;   -- impede sequestrar a sessão de outro
end $function$;

create or replace function public.track_event(p_session uuid, p_visitor uuid, p_type text, p_path text DEFAULT NULL::text, p_version_id text DEFAULT NULL::text, p_model_id text DEFAULT NULL::text, p_price_band integer DEFAULT NULL::integer, p_meta jsonb DEFAULT '{}'::jsonb)
 returns void language plpgsql security definer set search_path to '' as $function$
declare v_recent int;
begin
  if p_session is null or p_visitor is null or p_type is null then return; end if;
  if public.is_admin() then return; end if;  -- ação do dono não conta
  if not exists (select 1 from public.site_sessions s where s.id = p_session and s.visitor_id = p_visitor) then
    perform public.track_ping(p_session, p_visitor, jsonb_build_object('path', p_path));
  end if;

  -- limite anti-abuso: 120 eventos por minuto por sessão
  select count(*) into v_recent from public.site_events e
   where e.session_id = p_session and e.created_at > now() - interval '1 minute';
  if v_recent >= 120 then return; end if;

  if p_meta is null or pg_column_size(p_meta) > 2000 then p_meta := '{}'::jsonb; end if;

  insert into public.site_events(session_id, visitor_id, user_id, type, path, version_id, model_id, price_band, meta)
  values (p_session, p_visitor, (select auth.uid()), p_type, left(p_path,300),
          left(p_version_id,120), left(p_model_id,120), p_price_band, p_meta);

  update public.site_sessions s set
    last_seen   = now(),
    events      = s.events + 1,
    page_views  = s.page_views + case when p_type = 'page_view' then 1 else 0 end,
    current_path= coalesce(left(p_path,300), s.current_path),
    user_id     = coalesce((select auth.uid()), s.user_id)
  where s.id = p_session;
exception when check_violation then
  return; -- tipo de evento desconhecido: ignora sem quebrar o site
end $function$;
