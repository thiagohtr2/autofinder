-- Novidades (/novidades): lançamentos recentes de carros 0 km no Brasil, com regras fixas para entrar e sair.
--
-- Regras
--   Entra: carro que a marca lançou no Brasil com preço oficial (vendas ou pré-venda abertas) e que está no Autokan:
--     carro_novo     modelo que não era vendido aqui (inclui marca nova e modelo que volta ao mercado)     fica 90 dias
--     nova_geracao   geração nova de um modelo que já existia                                               fica 90 dias
--     reestilizacao  visual novo (frente, traseira, interior), não só a troca do ano-modelo                 fica 60 dias
--     versao_nova    versão inédita ou motorização nova num modelo que já existia                           fica 60 dias
--     serie_especial série ou edição especial à venda                                                        fica 60 dias
--   Não entra: só troca de ano-modelo, mudança de preço ou oferta, flagra, apresentação no exterior, "previsto para".
--   Data do lançamento: o dia em que a marca abriu as vendas ou a pré-venda com preço oficial no Brasil.
--   Sai: no fim do prazo, ou antes se as versões lançadas saírem de linha ou o carro sair do site.
--   Carro novo só entra depois que o dono do site aprova no Radar (por causa da arte); o resto o Claude registra sozinho.

create table public.lancamentos (
  id bigint generated always as identity primary key,
  model_id text not null references public.models(id) on delete cascade,
  tipo text not null check (tipo in ('carro_novo', 'nova_geracao', 'reestilizacao', 'versao_nova', 'serie_especial')),
  titulo text not null check (length(titulo) between 3 and 140),
  resumo text check (resumo is null or length(resumo) <= 400),
  versoes text[] not null default '{}',             -- versões lançadas; vazio = o modelo todo
  lancado_em date not null,
  data_precisao text not null default 'dia' check (data_precisao in ('dia', 'mes')),  -- 'mes' quando a fonte só diz o mês
  fonte text,
  fonte_url text check (fonte_url is null or fonte_url ~ '^https?://'),
  radar_item_id text references public.radar_items(id) on delete set null,
  registrado_por text not null default 'claude' check (registrado_por in ('claude', 'admin', 'sistema')),
  oculto boolean not null default false,
  created_at timestamptz not null default now(),
  unique (model_id, lancado_em)
);
comment on table public.lancamentos is 'Lançamentos recentes mostrados em /novidades. As regras de entrada e saída estão no topo da migração 20261108090000_novidades.';
create index lancamentos_data on public.lancamentos (lancado_em desc);
alter table public.lancamentos enable row level security;
create policy "leitura publica dos lancamentos" on public.lancamentos for select to anon, authenticated using (not oculto or (select public.is_admin()));
revoke all on public.lancamentos from anon, authenticated;
grant select on public.lancamentos to anon, authenticated;

-- quantos dias cada tipo fica em Novidades
create or replace function public.lancamento_dias(p_tipo text)
returns integer language sql immutable set search_path = '' as $$
  select case when p_tipo in ('carro_novo', 'nova_geracao') then 90 else 60 end
$$;

-- o que aparece agora em /novidades (o site lê esta visão)
create or replace view public.lancamentos_no_ar with (security_invoker = on) as
select l.id, l.model_id, l.tipo, l.titulo, l.resumo, l.versoes, l.lancado_em, l.data_precisao, l.fonte, l.fonte_url,
       (l.lancado_em + public.lancamento_dias(l.tipo) - 1) as fica_ate
from public.lancamentos l
where not l.oculto
  and l.lancado_em <= (now() at time zone 'America/Sao_Paulo')::date
  and l.lancado_em + public.lancamento_dias(l.tipo) > (now() at time zone 'America/Sao_Paulo')::date
  -- ainda à venda (ou em pré-venda) no site: alguma das versões lançadas, ou do modelo quando a lista está vazia
  and exists (select 1 from public.versions v
              where v.model_id = l.model_id and v.catalog_row is not null
                and coalesce(v.catalog_row ->> 'st', 'on_sale') in ('on_sale', 'pre_order')
                and (cardinality(l.versoes) = 0 or v.id = any(l.versoes)));
grant select on public.lancamentos_no_ar to anon, authenticated;

-- registrar um lançamento (Claude nas tarefas automáticas, o dono pelo painel, o sistema quando um item do radar é aplicado)
create or replace function public.registra_lancamento(p_model_id text, p_tipo text, p_lancado_em date, p_titulo text, p_resumo text default null,
  p_versoes text[] default '{}', p_fonte text default null, p_fonte_url text default null, p_radar text default null,
  p_precisao text default 'dia', p_quem text default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare novo_id bigint; quem text; ate date; mo record;
begin
  if (select auth.uid()) is not null and not public.is_admin() then raise exception 'só para admin'; end if;
  quem := coalesce(p_quem, case when (select auth.uid()) is not null then 'admin' else 'claude' end);
  select m.id, m.name, b.name marca into mo from public.models m left join public.brands b on b.id = m.brand_id where m.id = p_model_id;
  if not found then raise exception 'modelo não existe no Autokan: %', p_model_id; end if;
  if p_lancado_em > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'lançamento no futuro (%): entra quando abrir vendas ou pré-venda', p_lancado_em; end if;
  insert into public.lancamentos (model_id, tipo, titulo, resumo, versoes, lancado_em, data_precisao, fonte, fonte_url, radar_item_id, registrado_por)
  values (p_model_id, p_tipo, p_titulo, p_resumo,
          coalesce(array(select x from unnest(coalesce(p_versoes, '{}')) x where exists (select 1 from public.versions v where v.id = x and v.model_id = p_model_id)), '{}'),
          p_lancado_em, coalesce(p_precisao, 'dia'), p_fonte, p_fonte_url, p_radar, quem)
  on conflict (model_id, lancado_em) do nothing
  returning id into novo_id;
  if novo_id is null then return null; end if;
  ate := p_lancado_em + public.lancamento_dias(p_tipo) - 1;
  if ate >= (now() at time zone 'America/Sao_Paulo')::date then
    perform public.log_auto_change(quem, 'lancamento', case when cardinality(coalesce(p_versoes, '{}')) = 1 then p_versoes[1] end, p_model_id,
      'Lançamento: ' || p_titulo,
      coalesce(p_resumo || ' ', '') || 'Fica em Novidades até ' || to_char(ate, 'DD/MM/YYYY') || '.',
      null, to_char(p_lancado_em, 'DD/MM/YYYY'), p_fonte, p_fonte_url, jsonb_build_object('lancamento', novo_id) || case when p_radar is null then '{}'::jsonb else jsonb_build_object('radar', p_radar) end);
  end if;
  return novo_id;
end $$;
revoke all on function public.registra_lancamento(text, text, date, text, text, text[], text, text, text, text, text) from public, anon;
grant execute on function public.registra_lancamento(text, text, date, text, text, text[], text, text, text, text, text) to authenticated;

-- item do radar aplicado (pelo dono no site ou pelo Claude): carro novo ou versão nova entram em Novidades sozinhos.
-- O pacote do radar pode dizer o tipo, a data e o título em add_payload.lancamento, ou pedir para não entrar com "lancamento": false.
create or replace function public.lancamento_do_radar() returns trigger language plpgsql security definer set search_path = '' as $$
declare a jsonb; l jsonb; mid text; tipo text; vs text[]; titulo text; marca text; modelo text; nomes text;
begin
  if new.applied_at is null or old.applied_at is not null or new.status <> 'feito' or new.applied_model is null
     or new.kind not in ('novo_carro', 'nova_versao') then return new; end if;
  a := coalesce(new.add_payload, '{}'::jsonb);
  if a -> 'lancamento' = 'false'::jsonb then return new; end if;
  l := case when jsonb_typeof(a -> 'lancamento') = 'object' then a -> 'lancamento' else '{}'::jsonb end;
  mid := coalesce(a ->> 'model_id', new.model_id);
  if mid is null or not exists (select 1 from public.models where id = mid) then return new; end if;
  tipo := coalesce(l ->> 'tipo', case when new.kind = 'novo_carro' then 'carro_novo'
                                      when new.title ~* '(s[ée]rie especial|edi[çc][ãa]o (especial|limitada))' then 'serie_especial'
                                      else 'versao_nova' end);
  vs := coalesce(array(select e ->> 'id' from jsonb_array_elements(case when jsonb_typeof(a -> 'versions') = 'array' then a -> 'versions' else '[]'::jsonb end) e where e ? 'id'), '{}');
  select b.name, m.name into marca, modelo from public.models m left join public.brands b on b.id = m.brand_id where m.id = mid;
  if tipo = 'carro_novo' or tipo = 'nova_geracao' then titulo := trim(concat_ws(' ', coalesce(marca, new.applied_brand), coalesce(modelo, new.applied_model)));
  else
    select string_agg(v.version, ', ') into nomes from public.versions v where v.id = any(vs);
    titulo := trim(concat_ws(' ', coalesce(marca, new.applied_brand), coalesce(modelo, new.applied_model), case when cardinality(vs) = 1 then nomes end));
  end if;
  begin
    perform public.registra_lancamento(mid, tipo, least(coalesce((l ->> 'data')::date, new.date, (now() at time zone 'America/Sao_Paulo')::date), (now() at time zone 'America/Sao_Paulo')::date),
      left(coalesce(l ->> 'titulo', titulo), 140), left(coalesce(l ->> 'resumo', new.summary), 400), vs, new.source, new.url, new.id, 'dia', 'sistema');
  exception when others then
    raise warning 'lançamento do radar % não registrado: %', new.id, sqlerrm;   -- nunca atrapalha a aplicação do item
  end;
  return new;
end $$;
create trigger radar_items_lancamento after update of applied_at on public.radar_items for each row execute function public.lancamento_do_radar();

-- histórico: alteração sem versão (lançamento do modelo todo) também guarda a marca e o modelo
create or replace function public.log_auto_change(p_actor text, p_kind text, p_version_id text, p_model_id text, p_title text, p_detail text,
  p_old text default null, p_new text default null, p_source_name text default null, p_source_url text default null, p_ref jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $f$
declare v record;
begin
  select brand, model into v from public.versions where id = p_version_id;
  if not found then
    select b.name as brand, m.name as model into v from public.models m left join public.brands b on b.id = m.brand_id where m.id = p_model_id;
  end if;
  insert into public.auto_changes (actor, kind, brand, model, model_id, version_id, title, detail, old_value, new_value, source_name, source_url, ref)
  values (coalesce(p_actor, 'claude'), p_kind, v.brand, v.model, coalesce(p_model_id, (select model_id from public.versions where id = p_version_id)), p_version_id,
          p_title, p_detail, p_old, p_new, p_source_name, p_source_url, coalesce(p_ref, '{}'::jsonb));
end $f$;
revoke all on function public.log_auto_change(text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- histórico do painel: lançamento fica junto com versões novas
create or replace function public.grupo_alteracao(p_kind text)
returns text language sql immutable set search_path = '' as $$
  select case when p_kind in ('preco', 'oferta', 'fim_oferta') then 'precos'
              when p_kind in ('nova_versao', 'situacao', 'lancamento') then 'versoes'
              when p_kind = 'radar' then 'noticias'
              else 'cadastro' end
$$;

-- painel: o título e a data da matéria também para alterações que guardam só o link (lançamentos, cadastro)
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
    case when r.id is not null or c.kind in ('oferta', 'preco', 'fim_oferta', 'lancamento') then 'noticia'
         when c.ref ? 'correcao' or c.source_name ilike '%inmetro%' then 'inmetro'
         when c.ref ? 'pendencia' then 'oficial'
         when c.source_url is not null then 'noticia' end,
    case when c.source_name is not null then c.source_name
         when c.ref ? 'pendencia' then 'Site oficial da ' || coalesce(c.brand, v.brand, 'marca') end,
    coalesce(c.source_url, pc.source_url, r.url,
             case when c.ref ? 'correcao' or c.source_name ilike '%inmetro%' then inmetro end,
             case when c.ref ? 'pendencia' then sites ->> lower(regexp_replace(normalize(coalesce(c.brand, v.brand, ''), NFKD), '[^A-Za-z0-9_]', '', 'g')) end),
    coalesce(r.title, r2.title, ne.title), coalesce(r.date, r2.date, ne.date),
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
  left join lateral (select x.title, x.date from (select n.title, n.date from public.news n where n.url = c.source_url union all
                     select ri.title, ri.date from public.radar_items ri where ri.url = c.source_url) x where c.source_url is not null limit 1) ne on true
  order by (c.at at time zone 'America/Sao_Paulo')::date desc, public.ordem_alteracao(c.kind), c.at desc, c.id desc;
end $$;
revoke all on function public.admin_historico(text, integer, integer) from public, anon;
grant execute on function public.admin_historico(text, integer, integer) to authenticated;

-- lista inicial: lançamentos dos últimos 90 dias, conferidos nas notícias do banco (tabela news)
do $$
declare r record; src text; v_url text;
begin
  for r in select * from (values
    ('jeep-avenger',          'carro_novo',     '2026-09-01'::date, 'mes', 'Jeep Avenger', 'SUV compacto da Jeep com motor 1.0 turbo híbrido leve e câmbio CVT. Chegou às concessionárias em setembro.', '{}'::text[], 'Avenger estreia com 1.867'),
    ('caoa-changan-cs55',     'carro_novo',     '2026-09-16', 'dia', 'CAOA Changan CS55', 'SUV médio feito em Anápolis (GO), nas versões Prime, Infinity e híbrida plug-in.', '{}', 'lança CS55'),
    ('bmw-ix3',               'nova_geracao',   '2026-09-26', 'dia', 'BMW iX3', 'Nova geração do SUV elétrico, na versão 50 xDrive, com 570 km de autonomia pelo Inmetro.', '{}', 'chega às concessionárias'),
    ('jaecoo-jaecoo-5',       'versao_nova',    '2026-10-01', 'dia', 'Jaecoo 5 híbrido', 'Versões Comfort e Prestige com o sistema híbrido SHS-H de 224 cv. Vendas desde 1º de outubro.', '{jaecoo-jaecoo-5-shs-h-comfort,jaecoo-jaecoo-5-shs-h-prestige}', 'híbrido chega às lojas'),
    ('mercedes-benz-classe-v','carro_novo',     '2026-10-02', 'dia', 'Mercedes-Benz Classe V', 'Minivan de sete lugares nas versões V 300 Avantgarde e Elegance, com motor de 231 cv.', '{}', 'lança a Classe V'),
    ('toyota-corolla-cross',  'versao_nova',    '2026-10-02', 'dia', 'Toyota Corolla Cross XRV Hybrid', 'Nova versão híbrida de entrada, com o conjunto 1.8 híbrido flex.', '{toyota-corolla-cross-xrv-hybrid}', 'nova versão de híbrida'),
    ('honda-city-hatchback',  'reestilizacao',  '2026-10-02', 'dia', 'Honda City Hatchback 2027', 'Visual novo com faróis full LED, multimídia de 10 polegadas e a versão RS, inédita.', '{}', 'estreia novo visual'),
    ('honda-city',            'reestilizacao',  '2026-10-02', 'dia', 'Honda City 2027', 'Sedã com frente redesenhada, faróis full LED em todas as versões e multimídia nova.', '{}', 'novo visual e versão inédita'),
    ('chery-tiggo-9',         'carro_novo',     '2026-10-05', 'dia', 'Caoa Chery Tiggo 9', 'SUV de sete lugares com tração integral: 2.0 turbo de 224 cv ou híbrido plug-in de 428 cv.', '{}', 'lança Tiggo 9'),
    ('gwm-haval-h7',          'carro_novo',     '2026-10-06', 'dia', 'GWM Haval H7', 'SUV híbrido plug-in flex com tração integral. A pré-venda abriu em 6 de outubro.', '{}', 'entra em pré-venda'),
    ('ford-maverick',         'versao_nova',    '2026-10-09', 'dia', 'Ford Maverick Lariat', 'Nova versão de entrada, em edição limitada, com 2.0 EcoBoost de 253 cv e tração integral.', '{ford-maverick-lariat-2-0-ecoboost-awd}', 'nova opção de entrada'),
    ('volkswagen-tera',       'versao_nova',    '2026-10-09', 'dia', 'Volkswagen Tera 200 TSI', 'Comfort e High ganham o 1.0 turbo 200 TSI de 128 cv e câmbio automático de 8 marchas.', '{tera-comfort-200-tsi,tera-high-200-tsi}', 'Tera 200 TSI estreia'),
    ('jetour-s08',            'carro_novo',     '2026-10-13', 'dia', 'Jetour S08', 'Primeiro SUV de sete lugares da Jetour no Brasil, híbrido plug-in de 339 cv, em versão única.', '{}', 'confirma S08'),
    ('renault-duster',        'versao_nova',    '2026-10-13', 'dia', 'Renault Duster Zen Plus', 'Nova porta de entrada do Duster 2027, com motor 1.6 aspirado e câmbio manual.', '{renault-duster-zen-plus-1-6-sce-mt}', 'nova versão de entrada'),
    ('volkswagen-id-4',       'carro_novo',     '2026-10-15', 'dia', 'Volkswagen ID.4', 'SUV elétrico da Volkswagen na versão Pro, com 286 cv e 389 km de autonomia pelo Inmetro.', '{}', 'esgota primeiro lote'),
    ('leapmotor-b10',         'versao_nova',    '2026-10-16', 'dia', 'Leapmotor B10 ultra-híbrido', 'Versão com extensor de autonomia (REEV), com cerca de 900 km de autonomia combinada (WLTP).', '{leapmotor-b10-ultra-hibrido-reev}', 'ultra-híbrido chega'),
    ('jeep-compass',          'versao_nova',    '2026-10-19', 'dia', 'Jeep Compass híbrido leve', 'Linha 2027 com sistema híbrido leve de 48V nas versões Longitude Night Eagle e Série S.', '{compass-longitude-night-eagle-1-3-turbo-mhev,compass-serie-s-1-3-turbo-mhev}', 'estreia motor híbrido'),
    ('mercedes-benz-cla',     'nova_geracao',   '2026-10-27', 'dia', 'Mercedes-Benz CLA', 'Terceira geração do sedã, híbrida leve, em pré-venda na versão CLA 200 AMG Line.', '{mercedes-benz-cla-200-amg-line-nova-geracao}', 'abre pré-venda'),
    ('omoda-e5',              'versao_nova',    '2026-11-04', 'dia', 'Omoda E5 2027', 'Linha 2027 com a nova versão de entrada Elite e a Prestige, mais baratas que a versão única anterior.', '{omoda-e5-elite,omoda-e5-prestige}', 'ganha versão de entrada'),
    ('jeep-compass',          'serie_especial', '2026-11-06', 'dia', 'Jeep Compass Série Especial 85 Anos', 'Série de produção limitada, híbrida leve, que comemora os 85 anos da Jeep.', '{jeep-compass-serie-especial-85-anos-1-3-turbo-mhev}', '85 Anos'),
    ('jeep-commander',        'serie_especial', '2026-11-06', 'dia', 'Jeep Commander Série Especial 85 Anos', 'Série de produção limitada, híbrida leve, que comemora os 85 anos da Jeep.', '{jeep-commander-serie-especial-85-anos-1-3-turbo-mhev}', '85 Anos')
  ) as t(model_id, tipo, data, precisao, titulo, resumo, versoes, busca) loop
    -- a fonte é a notícia do banco (news) ou do radar que conta o lançamento
    src := null; v_url := null;
    select x.source, x.url into src, v_url from (
      select ne.source, ne.url, ne.date from public.news ne where ne.model_id = r.model_id and ne.title ilike '%' || r.busca || '%'
      union all
      select ri.source, ri.url, ri.date from public.radar_items ri where ri.model_id = r.model_id and ri.title ilike '%' || r.busca || '%'
    ) x order by abs(x.date - r.data) limit 1;
    perform public.registra_lancamento(r.model_id, r.tipo, r.data, r.titulo, r.resumo, r.versoes, src, v_url, null, r.precisao, 'claude');
  end loop;
end $$;
