-- Painel "Alterações automáticas" mais organizado: cada alteração vem com a foto do carro, o link da página dele no site
-- e a notícia (ou fonte oficial) que levou à mudança. Também separa por tipo para os filtros do painel.
-- Só leitura: nada aqui muda dados do site.

-- foto atual do carro, na mesma ordem do site: o próprio ano, o ano mais próximo (o mais novo no empate), a foto antiga só do modelo
create or replace function public.foto_modelo(p_model_id text, p_ano integer default null)
returns text language sql stable security definer set search_path = '' as $$
  select 'https://ljgcvxadsekaicffztbi.supabase.co/storage/v1/object/public/' || m.bucket || '/' || m.storage_path
  from public.media m
  where m.kind = 'model_photo' and m.is_current and p_model_id is not null
    and (m.owner_id = p_model_id
         or (left(m.owner_id, length(p_model_id) + 1) = p_model_id || '_' and substr(m.owner_id, length(p_model_id) + 2) ~ '^(19|20)[0-9]{2}$'))
  order by
    (m.owner_id = p_model_id),                                                                             -- foto só do modelo por último
    case when p_ano is null or m.owner_id = p_model_id then 0 else abs(right(m.owner_id, 4)::int - p_ano) end, -- ano mais próximo
    right(m.owner_id, 4) desc                                                                               -- empate: o mais novo
  limit 1
$$;
revoke all on function public.foto_modelo(text, integer) from public, anon, authenticated;

-- endereço da página do modelo no site (só se ele aparece no site: tem versão no catálogo e não está escondido)
create or replace function public.pagina_modelo(p_model_id text)
returns text language sql stable security definer set search_path = '' as $$
  select '/carros/' || m.brand_id || '/' || substr(m.id, length(m.brand_id) + 2)
  from public.models m
  where m.id = p_model_id and m.id like m.brand_id || '-%'
    and exists (select 1 from public.versions v where v.model_id = m.id and v.catalog_row is not null and coalesce(v.catalog_row ->> 'st', '') <> 'discontinued')
    and not coalesce((select s.value -> 'hidden_models' from public.site_meta s where s.key = 'visibility') ? m.id, false)
    and not coalesce((select s.value -> 'hidden_brands' from public.site_meta s where s.key = 'visibility') ? m.brand_id, false)
$$;
revoke all on function public.pagina_modelo(text) from public, anon, authenticated;

-- tipo de cada alteração para os filtros do painel
create or replace function public.grupo_alteracao(p_kind text)
returns text language sql immutable set search_path = '' as $$
  select case when p_kind in ('preco', 'oferta', 'fim_oferta') then 'precos'
              when p_kind in ('nova_versao', 'situacao') then 'versoes'
              when p_kind = 'radar' then 'noticias'
              else 'cadastro' end
$$;

-- dentro de cada dia, o mais importante primeiro: preços e ofertas, versões novas, notícias e, por último, ajustes de cadastro
create or replace function public.ordem_alteracao(p_kind text)
returns integer language sql immutable set search_path = '' as $$
  select case public.grupo_alteracao(p_kind) when 'precos' then 0 when 'versoes' then 1 when 'noticias' then 2 else 3 end
$$;

-- histórico com tudo o que o painel mostra
create or replace function public.admin_historico(p_tipo text default null, p_limit integer default 20, p_offset integer default 0)
returns table (id bigint, at timestamptz, actor text, kind text, tipo text, brand text, model text, model_id text, version_id text, versao text,
               title text, detail text, old_value text, new_value text, ate date,
               fonte_tipo text, source_name text, source_url text, noticia_titulo text, noticia_data date,
               pagina text, foto text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare sites jsonb := coalesce((select s.value from public.site_meta s where s.key = 'brand_sites'), '{}'::jsonb);
        inmetro text := (select s.url from public.sources s where s.id = 'inmetro-pbev-2026-ago14');
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  if p_tipo is not null and p_tipo not in ('precos', 'versoes', 'cadastro', 'noticias') then raise exception 'tipo inválido'; end if;
  return query
  with filtradas as (
    select c.* from public.auto_changes c where p_tipo is null or public.grupo_alteracao(c.kind) = p_tipo
  ), pag as (
    select f.* from filtradas f
    order by (f.at at time zone 'America/Sao_Paulo')::date desc, public.ordem_alteracao(f.kind), f.at desc, f.id desc
    limit least(greatest(coalesce(p_limit, 20), 1), 2000) offset greatest(coalesce(p_offset, 0), 0)
  )
  select c.id, c.at, c.actor, c.kind, public.grupo_alteracao(c.kind),
    coalesce(c.brand, v.brand, r.brand), coalesce(c.model, v.model, r.model), coalesce(c.model_id, v.model_id), c.version_id, v.version,
    c.title, c.detail, c.old_value, c.new_value,
    case when (c.ref ->> 'ate') ~ '^\d{4}-\d{2}-\d{2}$' then (c.ref ->> 'ate')::date else pc.ends_on end,
    -- de onde veio: notícia (radar ou oferta), tabela do Inmetro ou a fonte oficial da marca (pendências da auditoria)
    case when r.id is not null or c.kind in ('oferta', 'preco', 'fim_oferta') then 'noticia'
         when c.ref ? 'correcao' or c.source_name ilike '%inmetro%' then 'inmetro'
         when c.ref ? 'pendencia' then 'oficial'
         when c.source_url is not null then 'noticia' end,
    case when c.source_name is not null then c.source_name
         when c.ref ? 'pendencia' then 'Site oficial da ' || coalesce(c.brand, v.brand, 'marca') end,
    coalesce(c.source_url, pc.source_url, r.url,
             case when c.ref ? 'correcao' or c.source_name ilike '%inmetro%' then inmetro end,
             case when c.ref ? 'pendencia' then sites ->> lower(regexp_replace(normalize(coalesce(c.brand, v.brand, ''), NFKD), '[^A-Za-z0-9_]', '', 'g')) end),
    coalesce(r.title, r2.title), coalesce(r.date, r2.date),
    public.pagina_modelo(coalesce(c.model_id, v.model_id)),
    public.foto_modelo(coalesce(c.model_id, v.model_id),
      coalesce(case when (v.catalog_row ->> 'y') ~ '^\d{4}$' then (v.catalog_row ->> 'y')::int end, v.model_year,
               (select max(case when (v2.catalog_row ->> 'y') ~ '^\d{4}$' then (v2.catalog_row ->> 'y')::int end) from public.versions v2 where v2.model_id = c.model_id))),
    (select count(*) from filtradas)
  from pag c
  left join public.versions v on v.id = c.version_id
  left join public.radar_items r on r.id = c.ref ->> 'radar'
  left join public.price_changes pc on pc.id::text = c.ref ->> 'price_change'
  left join public.radar_items r2 on r2.id = pc.radar_item_id
  order by (c.at at time zone 'America/Sao_Paulo')::date desc, public.ordem_alteracao(c.kind), c.at desc, c.id desc;
end $$;
revoke all on function public.admin_historico(text, integer, integer) from public, anon;
grant execute on function public.admin_historico(text, integer, integer) to authenticated;

-- quantas alterações de cada tipo (para os botões de filtro)
create or replace function public.admin_historico_resumo()
returns table (tipo text, n bigint, semana bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query select public.grupo_alteracao(c.kind), count(*), count(*) filter (where c.at > now() - interval '7 days')
  from public.auto_changes c group by 1;
end $$;
revoke all on function public.admin_historico_resumo() from public, anon;
grant execute on function public.admin_historico_resumo() to authenticated;

-- ofertas em andamento, com foto, página e notícia
create or replace function public.admin_ofertas_andamento()
returns table (version_id text, marca text, modelo text, versao text, model_id text, preco_oferta integer, preco_normal integer, ate date,
               source_name text, source_url text, noticia_titulo text, pagina text, foto text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query select v.id, v.brand, v.model, v.version, v.model_id, pc.new_price, pc.old_price, pc.ends_on,
    coalesce(pc.source_name, r.source), coalesce(pc.source_url, r.url), r.title,
    public.pagina_modelo(v.model_id),
    public.foto_modelo(v.model_id, case when (v.catalog_row ->> 'y') ~ '^\d{4}$' then (v.catalog_row ->> 'y')::int else v.model_year end)
  from public.price_changes pc
  join public.versions v on v.id = pc.version_id
  -- a notícia da oferta: a ligada ao preço ou, se não tiver, a que o histórico registrou para esta versão
  left join lateral (
    select ri.title, ri.source, ri.url from public.radar_items ri
    where ri.id = coalesce(pc.radar_item_id,
      (select ac.ref ->> 'radar' from public.auto_changes ac where ac.version_id = v.id and ac.kind in ('oferta', 'preco') and ac.ref ? 'radar' order by ac.at desc limit 1))
  ) r on true
  where pc.change_type = 'promocional' and pc.encerrada_em is null and (pc.ends_on is null or pc.ends_on >= (now() at time zone 'America/Sao_Paulo')::date)
    and v.price = pc.new_price
  order by pc.ends_on nulls last, v.brand, v.model, v.version;
end $$;
revoke all on function public.admin_ofertas_andamento() from public, anon;
grant execute on function public.admin_ofertas_andamento() to authenticated;
