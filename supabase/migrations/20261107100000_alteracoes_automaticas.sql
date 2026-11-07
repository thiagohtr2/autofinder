-- Alterações automáticas: preços, ofertas e ajustes que o Claude (tarefas agendadas) e o sistema fazem sozinhos.
-- O dono do site combinou (07/11/2026): notícias de preço e promoção entram sem pedir licença; carro novo (modelo que
-- ainda não existe no site, ou item do radar do tipo "novo_carro") continua esperando a aprovação dele, porque precisa
-- da arte. Tudo o que muda fica registrado em public.auto_changes, que o painel mostra em "Alterações automáticas".
-- Oferta com prazo termina sozinha: todo dia, logo depois da meia-noite, o preço volta ao normal (encerra_ofertas).

-- 1) histórico
create table public.auto_changes (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null default 'claude' check (actor in ('claude', 'sistema', 'admin')),
  kind text not null,          -- preco, oferta, fim_oferta, nova_versao, situacao, atualizacao, cadastro, radar
  brand text, model text, model_id text, version_id text,
  title text not null,
  detail text,
  old_value text, new_value text,
  source_name text, source_url text,
  ref jsonb not null default '{}'::jsonb
);
comment on table public.auto_changes is 'O que foi mudado sozinho no site (Claude e sistema), para o dono acompanhar no painel.';
create index auto_changes_at on public.auto_changes (at desc);
alter table public.auto_changes enable row level security;
create policy "admin ve as alteracoes automaticas" on public.auto_changes for select to authenticated using ((select public.is_admin()));
revoke all on public.auto_changes from anon, authenticated;
grant select on public.auto_changes to authenticated;

-- oferta encerrada (o preço já voltou ao normal ou não precisava voltar)
alter table public.price_changes add column if not exists encerrada_em timestamptz;

-- 2) ajudantes
create or replace function public.reais_txt(n numeric) returns text language sql immutable set search_path = '' as $$
  select case when n is null then null else 'R$ ' || replace(to_char(round(n), 'FM999,999,999,999'), ',', '.') end $$;

-- junta dois documentos JSON por dentro (como o deepMerge do site): o segundo vence, objetos se misturam
create or replace function public.jsonb_merge_fundo(a jsonb, b jsonb) returns jsonb language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
    coalesce((select jsonb_object_agg(k, case when jsonb_typeof(a -> k) = 'object' and jsonb_typeof(b -> k) = 'object' then public.jsonb_merge_fundo(a -> k, b -> k)
                                              when b ? k then b -> k else a -> k end)
              from (select jsonb_object_keys(a) as k union select jsonb_object_keys(b)) ks), '{}'::jsonb)
  else b end $$;

create or replace function public.log_auto_change(p_actor text, p_kind text, p_version_id text, p_model_id text, p_title text, p_detail text,
  p_old text default null, p_new text default null, p_source_name text default null, p_source_url text default null, p_ref jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select brand, model into v from public.versions where id = p_version_id;
  insert into public.auto_changes (actor, kind, brand, model, model_id, version_id, title, detail, old_value, new_value, source_name, source_url, ref)
  values (coalesce(p_actor, 'claude'), p_kind, v.brand, v.model, coalesce(p_model_id, (select model_id from public.versions where id = p_version_id)), p_version_id,
          p_title, p_detail, p_old, p_new, p_source_name, p_source_url, coalesce(p_ref, '{}'::jsonb));
end $$;
revoke all on function public.log_auto_change(text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- faixa de preço do modelo (as versões à venda)
create or replace function public.atualiza_faixa_modelo(p_model_id text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.models m set price_min = s.mn, price_max = s.mx,
    raw = coalesce(m.raw, '{}'::jsonb) || jsonb_build_object('price_min', s.mn, 'price_max', s.mx, 'versions', s.ids, 'updated_at', to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'))
  from (select min(price) filter (where status = 'on_sale' and price > 0) mn, max(price) filter (where status = 'on_sale' and price > 0) mx,
               coalesce(jsonb_agg(id order by id), '[]'::jsonb) ids
        from public.versions where model_id = p_model_id) s
  where m.id = p_model_id;
end $$;
revoke all on function public.atualiza_faixa_modelo(text) from public, anon, authenticated;

-- 3) aplica um item do radar no banco, como o botão "Adicionar ao banco" do site.
-- Carro novo (modelo que não existe ou item "novo_carro") só pelo admin. p_versoes limita a quais versões do pacote aplicar.
create or replace function public.apply_radar_item(p_id text, p_versoes text[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  it public.radar_items; a jsonb; mid text; bid text; v jsonb; x public.versions; d jsonb; op jsonb; np jsonb;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date; hoje_txt text;
  actor text; nota text; antigo int; novo int; m text[]; fim date; tipo text; cat jsonb; logs text[] := '{}'; aplicadas text[] := '{}';
  nome text; mudou_preco boolean; marca text; modelo text; corpo text; existe boolean;
begin
  if (select auth.uid()) is not null and not public.is_admin() then raise exception 'só para admin'; end if;
  actor := case when (select auth.uid()) is not null then 'admin' else 'claude' end;
  hoje_txt := to_char(hoje, 'YYYY-MM-DD');
  select * into it from public.radar_items where id = p_id for update;
  if not found then raise exception 'item do radar não encontrado: %', p_id; end if;
  if it.status <> 'novo' then raise exception 'item já resolvido (%): %', it.status, p_id; end if;
  a := it.add_payload;
  if a is null or jsonb_typeof(a -> 'versions') <> 'array' then raise exception 'item sem pacote para aplicar: %', p_id; end if;
  mid := a ->> 'model_id'; bid := coalesce(a ->> 'brand_id', split_part(mid, '-', 1));
  if mid is null or mid !~ '^[a-z0-9][a-z0-9-]{1,120}$' or bid !~ '^[a-z0-9][a-z0-9-]{1,120}$' then raise exception 'pacote sem modelo ou marca válidos: %', p_id; end if;
  if actor <> 'admin' and (it.kind = 'novo_carro' or not exists (select 1 from public.models where id = mid)) then
    raise exception 'carro novo (%): precisa da aprovação do dono do site', mid;
  end if;
  select coalesce(b.name, a ->> 'brand_name', it.brand) into marca from public.brands b where b.id = bid;
  marca := coalesce(marca, a ->> 'brand_name', it.brand);
  select coalesce(a -> 'model' ->> 'name', mo.name, it.model), coalesce(a -> 'model' ->> 'body', mo.body) into modelo, corpo from public.models mo where mo.id = mid;
  modelo := coalesce(modelo, a -> 'model' ->> 'name', it.model);

  for v in select * from jsonb_array_elements(a -> 'versions') loop
    if coalesce(v ->> 'id', '') !~ '^[a-z0-9][a-z0-9-]{1,120}$' then continue; end if;
    if p_versoes is not null and not (v ->> 'id' = any(p_versoes)) then continue; end if;
    select * into x from public.versions where id = v ->> 'id';
    existe := found;
    np := coalesce(v -> 'price', '{}'::jsonb);
    novo := case when jsonb_typeof(np -> 'value') = 'number' then (np ->> 'value')::numeric::int end;
    if existe then
      if x.model_id <> mid then raise exception 'a versão % é de outro modelo (%)', x.id, x.model_id; end if;
      op := coalesce(x.raw -> 'price', '{}'::jsonb) || jsonb_build_object('value', x.price, 'kind', x.price_kind, 'ref_month', x.price_ref_month);
      d := public.jsonb_merge_fundo(coalesce(x.raw, '{}'::jsonb), v - 'id');
      mudou_preco := novo is not null and novo is distinct from x.price;
      if mudou_preco and x.price is not null then
        d := jsonb_set(d, '{price_history}', coalesce(case when jsonb_typeof(x.raw -> 'price_history') = 'array' then x.raw -> 'price_history' end, '[]'::jsonb)
             || jsonb_build_array(jsonb_build_object('value', x.price, 'kind', x.price_kind, 'ref_month', x.price_ref_month, 'until', hoje_txt)));
      end if;
      d := d || jsonb_build_object('id', x.id, 'brand_id', x.brand_id, 'model_id', x.model_id, 'updated_at', hoje_txt, 'radar', it.id);
      cat := '{}'::jsonb;
      if v ? 'price' then cat := cat || jsonb_build_object('p', d -> 'price' -> 'value', 'pk', d -> 'price' -> 'kind'); end if;
      if v ? 'status' then cat := cat || jsonb_build_object('st', d -> 'status'); end if;
      if v ? 'version' then cat := cat || jsonb_build_object('v', d -> 'version'); end if;
      if v ? 'model_year' then cat := cat || jsonb_build_object('y', d -> 'model_year'); end if;
      if v ? 'highlights' then cat := cat || jsonb_build_object('k', d -> 'highlights'); end if;
      if v -> 'powertrain' ? 'fuel' then cat := cat || jsonb_build_object('f', d -> 'powertrain' -> 'fuel'); end if;
      if v -> 'powertrain' ? 'propulsion' then cat := cat || jsonb_build_object('pr', d -> 'powertrain' -> 'propulsion'); end if;
      if v -> 'powertrain' ? 'transmission' then cat := cat || jsonb_build_object('t', d -> 'powertrain' -> 'transmission'); end if;
      if v -> 'powertrain' ? 'power_cv' then cat := cat || jsonb_build_object('cv', d -> 'powertrain' -> 'power_cv'); end if;
      if v -> 'powertrain' ? 'engine_desc' then cat := cat || jsonb_build_object('e', d -> 'powertrain' -> 'engine_desc'); end if;
      update public.versions set
        raw = d,
        price = case when v ? 'price' and jsonb_typeof(d -> 'price' -> 'value') = 'number' then (d -> 'price' ->> 'value')::numeric::int else price end,
        price_kind = case when np ? 'kind' then d -> 'price' ->> 'kind' else price_kind end,
        price_ref_month = case when np ? 'ref_month' then d -> 'price' ->> 'ref_month' else price_ref_month end,
        price_promo = case when np ? 'promo' then d -> 'price' ->> 'promo' else price_promo end,
        status = case when v ? 'status' then d ->> 'status' else status end,
        version = case when v ? 'version' then d ->> 'version' else version end,
        model_year = case when v ? 'model_year' then (d ->> 'model_year')::int else model_year end,
        engine_desc = case when v -> 'powertrain' ? 'engine_desc' then d -> 'powertrain' ->> 'engine_desc' else engine_desc end,
        fuel = case when v -> 'powertrain' ? 'fuel' then d -> 'powertrain' ->> 'fuel' else fuel end,
        propulsion = case when v -> 'powertrain' ? 'propulsion' then d -> 'powertrain' ->> 'propulsion' else propulsion end,
        power_cv = case when v -> 'powertrain' ? 'power_cv' then (d -> 'powertrain' ->> 'power_cv')::numeric else power_cv end,
        torque_kgfm = case when v -> 'powertrain' ? 'torque_kgfm' then (d -> 'powertrain' ->> 'torque_kgfm')::numeric else torque_kgfm end,
        transmission = case when v -> 'powertrain' ? 'transmission' then d -> 'powertrain' ->> 'transmission' else transmission end,
        drive = case when v -> 'powertrain' ? 'drive' then d -> 'powertrain' ->> 'drive' else drive end,
        turbo = case when v -> 'powertrain' ? 'turbo' then (d -> 'powertrain' ->> 'turbo')::boolean else turbo end,
        highlights = case when jsonb_typeof(v -> 'highlights') = 'array' then array(select jsonb_array_elements_text(v -> 'highlights')) else highlights end,
        notes = case when v ? 'notes' then d ->> 'notes' else notes end,
        radar_item_id = it.id,
        catalog_row = case when catalog_row is null then null else catalog_row || cat || jsonb_build_object('rn', it.id, 'up', hoje_txt) end,
        updated_since = hoje
      where id = x.id;
      nome := trim(concat_ws(' ', x.brand, x.model, coalesce(d ->> 'version', x.version)));
      if mudou_preco then
        logs := logs || format('%s: preço %s → %s', coalesce(d ->> 'version', x.version), coalesce(public.reais_txt(x.price), 'sem preço'), public.reais_txt(novo));
      elsif v ? 'status' and (d ->> 'status') is distinct from x.status then
        logs := logs || format('%s: situação %s → %s', coalesce(d ->> 'version', x.version), x.status, d ->> 'status');
        perform public.log_auto_change(actor, 'situacao', x.id, mid, 'Situação: ' || nome, coalesce(it.summary, it.title), x.status, d ->> 'status', it.source, it.url, jsonb_build_object('radar', it.id));
      else
        logs := logs || format('%s: dados atualizados', coalesce(d ->> 'version', x.version));
        perform public.log_auto_change(actor, 'atualizacao', x.id, mid, 'Atualização: ' || nome, coalesce(it.summary, it.title), null, null, it.source, it.url, jsonb_build_object('radar', it.id));
      end if;
    else
      -- versão nova num modelo que já existe
      d := public.jsonb_merge_fundo(jsonb_build_object('schema', 1, 'brand_id', bid, 'model_id', mid, 'brand', marca, 'model', modelo, 'version', coalesce(v ->> 'version', ''),
             'display_name', trim(concat_ws(' ', marca, modelo, v ->> 'version')), 'model_year', null, 'status', 'on_sale', 'body', corpo,
             'origin', jsonb_build_object('brand_country', a ->> 'brand_country', 'manufactured_in', null, 'national', false),
             'price', jsonb_build_object('value', null, 'kind', null, 'ref_month', to_char(hoje, 'YYYY-MM'), 'validity', 'unknown', 'promo', null),
             'powertrain', jsonb_build_object('engine_desc', null, 'fuel', null, 'propulsion', null, 'power_cv', null, 'torque_kgfm', null, 'turbo', null, 'transmission', null, 'drive', null),
             'highlights', '[]'::jsonb, 'specs', '{}'::jsonb, 'images', '[]'::jsonb, 'sources', '[]'::jsonb, 'notes', '', 'created_at', hoje_txt, 'quality', jsonb_build_object('confidence', 'imprensa')), v - 'id')
           || jsonb_build_object('id', v ->> 'id', 'brand_id', bid, 'model_id', mid, 'updated_at', hoje_txt, 'radar', it.id);
      insert into public.versions (id, brand_id, model_id, brand, model, version, display_name, model_year, status, body, price, price_kind, price_ref_month, price_promo, price_validity,
        engine_desc, fuel, propulsion, power_cv, torque_kgfm, transmission, drive, turbo, brand_country, national, highlights, quality, notes, radar_item_id, raw, catalog_row, new_since)
      values (d ->> 'id', bid, mid, marca, modelo, coalesce(d ->> 'version', ''), d ->> 'display_name', (d ->> 'model_year')::int, coalesce(d ->> 'status', 'on_sale'), d ->> 'body',
        case when jsonb_typeof(d -> 'price' -> 'value') = 'number' then (d -> 'price' ->> 'value')::numeric::int end, d -> 'price' ->> 'kind', d -> 'price' ->> 'ref_month', d -> 'price' ->> 'promo', d -> 'price' ->> 'validity',
        d -> 'powertrain' ->> 'engine_desc', d -> 'powertrain' ->> 'fuel', d -> 'powertrain' ->> 'propulsion', (d -> 'powertrain' ->> 'power_cv')::numeric, (d -> 'powertrain' ->> 'torque_kgfm')::numeric,
        d -> 'powertrain' ->> 'transmission', d -> 'powertrain' ->> 'drive', (d -> 'powertrain' ->> 'turbo')::boolean, d -> 'origin' ->> 'brand_country', false,
        coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(d -> 'highlights') = 'array' then d -> 'highlights' else '[]'::jsonb end)), '{}'),
        coalesce(d -> 'quality', '{}'::jsonb), d ->> 'notes', it.id, d,
        jsonb_build_object('i', d ->> 'id', 'm', mid, 'mn', modelo, 'v', d -> 'version', 'y', d -> 'model_year',
          'p', case when jsonb_typeof(d -> 'price' -> 'value') = 'number' then d -> 'price' -> 'value' else 'null'::jsonb end, 'pk', coalesce(d -> 'price' -> 'kind', 'null'::jsonb),
          'b', coalesce(d -> 'body', 'null'::jsonb), 'f', coalesce(d -> 'powertrain' -> 'fuel', 'null'::jsonb), 'pr', coalesce(d -> 'powertrain' -> 'propulsion', 'null'::jsonb),
          't', coalesce(d -> 'powertrain' -> 'transmission', 'null'::jsonb), 'cv', case when jsonb_typeof(d -> 'powertrain' -> 'power_cv') = 'number' then d -> 'powertrain' -> 'power_cv' else 'null'::jsonb end,
          'k', case when jsonb_typeof(d -> 'highlights') = 'array' then d -> 'highlights' else '[]'::jsonb end, 'st', to_jsonb(coalesce(d ->> 'status', 'on_sale')),
          'e', coalesce(d -> 'powertrain' -> 'engine_desc', 'null'::jsonb), 'rn', it.id, 'nv', hoje_txt),
        hoje);
      nome := trim(concat_ws(' ', marca, modelo, d ->> 'version'));
      logs := logs || format('nova versão %s%s', d ->> 'version', coalesce(' (' || public.reais_txt(novo) || ')', ''));
      perform public.log_auto_change(actor, 'nova_versao', d ->> 'id', mid, 'Nova versão: ' || nome, coalesce(it.summary, it.title), null, public.reais_txt(novo), it.source, it.url, jsonb_build_object('radar', it.id));
      op := null; mudou_preco := false;
    end if;

    -- mudança de preço para o consumidor (price_changes), como o site faz: valor antigo pelo "antes R$", "redução de R$ N mil",
    -- "depois R$" (preço especial de lançamento) ou pelo preço anterior do mesmo tipo
    if mudou_preco then
      nota := coalesce(np ->> 'promo', '');
      antigo := null;
      m := regexp_match(nota, 'antes R\$ ?([0-9.]+)', 'i'); if m is not null then antigo := replace(m[1], '.', '')::int; end if;
      if antigo is null then m := regexp_match(nota, 'redução de R\$ ?([0-9]+) mil', 'i'); if m is not null then antigo := novo + m[1]::int * 1000; end if; end if;
      if antigo is null then m := regexp_match(nota, 'depois R\$ ?([0-9.]+)', 'i'); if m is not null then antigo := replace(m[1], '.', '')::int; end if; end if;
      if antigo is null and op is not null and (op ->> 'kind') is not distinct from coalesce(np ->> 'kind', op ->> 'kind') and jsonb_typeof(op -> 'value') = 'number' then antigo := (op ->> 'value')::numeric::int; end if;
      m := regexp_match(nota, 'até (\d{2})/(\d{2})/(\d{4})'); fim := case when m is not null then make_date(m[3]::int, m[2]::int, m[1]::int) end;
      tipo := case when nota <> '' then 'promocional' else 'definitivo' end;
      if antigo is not null and antigo > 0 and antigo <> novo and it.url ~ '^https?://' then
        insert into public.price_changes (version_id, old_price, new_price, change_type, ends_on, reason, source_name, source_url, reported_on, radar_item_id)
        values (x.id, antigo, novo, tipo, fim, coalesce(it.summary, it.title), it.source, it.url, it.date, it.id)
        on conflict (version_id, source_url) do nothing;
      end if;
      perform public.log_auto_change(actor, case when tipo = 'promocional' then 'oferta' else 'preco' end, x.id, mid,
        case when tipo = 'promocional' then 'Oferta: ' else 'Preço: ' end || nome,
        coalesce(it.summary, it.title) || case when tipo = 'promocional' then case when fim is not null then ' Vale até ' || to_char(fim, 'DD/MM/YYYY') || '; depois volta sozinho ao preço normal.' else ' Sem data de término informada.' end else '' end,
        public.reais_txt(coalesce(antigo, x.price)), public.reais_txt(novo), it.source, it.url, jsonb_build_object('radar', it.id, 'ate', fim));
    end if;
    aplicadas := aplicadas || (v ->> 'id');
  end loop;

  if cardinality(aplicadas) = 0 then raise exception 'nenhuma versão do pacote foi aplicada: %', p_id; end if;
  perform public.atualiza_faixa_modelo(mid);
  update public.radar_items set status = 'feito', applied_at = now(), applied_log = logs, applied_brand = marca, applied_model = modelo,
    raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('status', 'feito', 'applied_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'applied_log', to_jsonb(logs), 'applied_brand', marca, 'applied_model', modelo, 'applied_by', actor)
  where id = it.id;
  return jsonb_build_object('item', it.id, 'modelo', mid, 'versoes', to_jsonb(aplicadas), 'log', to_jsonb(logs));
end $$;
revoke all on function public.apply_radar_item(text, text[]) from public, anon;
grant execute on function public.apply_radar_item(text, text[]) to authenticated;

-- item do radar que não pede mudança no banco (ou que foi deixado de fora), com o motivo
create or replace function public.resolve_radar_item(p_id text, p_status text, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare it public.radar_items; actor text;
begin
  if (select auth.uid()) is not null and not public.is_admin() then raise exception 'só para admin'; end if;
  if p_status not in ('feito', 'ignorado') then raise exception 'situação inválida: %', p_status; end if;
  actor := case when (select auth.uid()) is not null then 'admin' else 'claude' end;
  select * into it from public.radar_items where id = p_id for update;
  if not found then raise exception 'item do radar não encontrado: %', p_id; end if;
  if it.status <> 'novo' then return; end if;
  update public.radar_items set status = p_status, applied_at = now(), applied_log = array[p_motivo],
    raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('status', p_status, 'applied_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'applied_log', jsonb_build_array(p_motivo), 'applied_by', actor)
  where id = p_id;
  insert into public.auto_changes (actor, kind, brand, model, model_id, title, detail, source_name, source_url, ref)
  values (actor, 'radar', it.brand, it.model, it.model_id, case when p_status = 'ignorado' then 'Notícia deixada de fora: ' else 'Notícia sem mudança no site: ' end || it.title, p_motivo, it.source, it.url, jsonb_build_object('radar', it.id));
end $$;
revoke all on function public.resolve_radar_item(text, text, text) from public, anon;
grant execute on function public.resolve_radar_item(text, text, text) to authenticated;

-- 4) oferta com prazo: no dia seguinte ao fim, o preço volta ao que era antes da oferta
create or replace function public.encerra_ofertas()
returns integer language plpgsql security definer set search_path = '' as $$
declare pc record; x public.versions; n integer := 0; hoje date := (now() at time zone 'America/Sao_Paulo')::date; d jsonb;
begin
  for pc in select * from public.price_changes where change_type = 'promocional' and ends_on is not null and ends_on < hoje and encerrada_em is null order by ends_on loop
    select * into x from public.versions where id = pc.version_id for update;
    -- só volta se a versão ainda está com o preço da oferta e não chegou mudança mais nova depois dela
    if found and x.price = pc.new_price and not exists (select 1 from public.price_changes p2 where p2.version_id = pc.version_id and p2.created_at > pc.created_at) then
      d := coalesce(x.raw, '{}'::jsonb);
      d := jsonb_set(d, '{price_history}', coalesce(case when jsonb_typeof(d -> 'price_history') = 'array' then d -> 'price_history' end, '[]'::jsonb)
           || jsonb_build_array(jsonb_build_object('value', x.price, 'kind', x.price_kind, 'ref_month', x.price_ref_month, 'until', to_char(hoje, 'YYYY-MM-DD'))));
      d := public.jsonb_merge_fundo(d, jsonb_build_object('price', jsonb_build_object('value', pc.old_price, 'promo', null)));
      update public.versions set price = pc.old_price, price_promo = null, raw = d,
        catalog_row = case when catalog_row is null then null else catalog_row || jsonb_build_object('p', pc.old_price, 'up', to_char(hoje, 'YYYY-MM-DD')) end, updated_since = hoje
      where id = x.id;
      perform public.atualiza_faixa_modelo(x.model_id);
      perform public.log_auto_change('sistema', 'fim_oferta', x.id, x.model_id, 'Fim da oferta: ' || trim(concat_ws(' ', x.brand, x.model, x.version)),
        'A oferta valia até ' || to_char(pc.ends_on, 'DD/MM/YYYY') || '. O preço voltou ao normal.', public.reais_txt(pc.new_price), public.reais_txt(pc.old_price), pc.source_name, pc.source_url, jsonb_build_object('price_change', pc.id));
      n := n + 1;
    end if;
    update public.price_changes set encerrada_em = now() where id = pc.id;
  end loop;
  return n;
end $$;
revoke all on function public.encerra_ofertas() from public, anon, authenticated;
select cron.schedule('encerra-ofertas', '7 3 * * *', 'select public.encerra_ofertas()');   -- 00:07 em Brasília

-- 5) painel
create or replace function public.admin_auto_changes(p_limit integer default 20, p_offset integer default 0)
returns table (id bigint, at timestamptz, actor text, kind text, brand text, model text, model_id text, version_id text, title text, detail text,
               old_value text, new_value text, source_name text, source_url text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query select c.id, c.at, c.actor, c.kind, c.brand, c.model, c.model_id, c.version_id, c.title, c.detail, c.old_value, c.new_value, c.source_name, c.source_url,
    (select count(*) from public.auto_changes)
  from public.auto_changes c order by c.at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 2000) offset greatest(coalesce(p_offset, 0), 0);
end $$;
revoke all on function public.admin_auto_changes(integer, integer) from public, anon;
grant execute on function public.admin_auto_changes(integer, integer) to authenticated;

create or replace function public.admin_ofertas_com_prazo()
returns table (version_id text, carro text, model_id text, preco_oferta integer, preco_normal integer, ate date, source_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  return query select v.id, trim(concat_ws(' ', v.brand, v.model, v.version)), v.model_id, pc.new_price, pc.old_price, pc.ends_on, pc.source_url
  from public.price_changes pc join public.versions v on v.id = pc.version_id
  where pc.change_type = 'promocional' and pc.encerrada_em is null and (pc.ends_on is null or pc.ends_on >= (now() at time zone 'America/Sao_Paulo')::date)
    and v.price = pc.new_price
  order by pc.ends_on nulls last, 2;
end $$;
revoke all on function public.admin_ofertas_com_prazo() from public, anon;
grant execute on function public.admin_ofertas_com_prazo() to authenticated;
