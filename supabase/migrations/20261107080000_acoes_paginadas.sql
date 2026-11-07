-- Painel: "Últimas ações" com páginas (10 de cada vez, "ver mais" e "ver todas"). Só leitura, só para o admin.
create or replace function public.admin_events(p_limit integer default 10, p_offset integer default 0)
returns table (created_at timestamptz, type text, path text, car text, price_band integer, visitor_id uuid, user_email text, device text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query
  select e.created_at, e.type, e.path,
         coalesce(v.display_name, v.brand || ' ' || v.model || ' ' || v.version),
         e.price_band, e.visitor_id, u.email::text, s.device,
         (select count(*) from public.site_events)
    from public.site_events e
    left join public.versions v on v.id = e.version_id
    left join auth.users u on u.id = e.user_id
    left join public.site_sessions s on s.id = e.session_id
   order by e.created_at desc
   limit least(greatest(coalesce(p_limit, 10), 1), 2000) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.admin_events(integer, integer) from public, anon;
grant execute on function public.admin_events(integer, integer) to authenticated;
