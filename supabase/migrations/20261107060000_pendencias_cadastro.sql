-- Pendências de cadastro: decisões que a auditoria da base (nov/2026) deixou para o dono do site, como ano-modelo,
-- nome da versão, combustível, câmbio, potência, texto do motor e versões que podem ter saído de linha.
-- O painel (admin.html) mostra cada uma com o que está no cadastro e o que diz a fonte oficial. Um clique aplica a
-- proposta (ou outro valor digitado) ou mantém como está. Aplicar muda as três cópias da versão (a coluna, o raw e o
-- catalog_row, que a página inicial lê) e registra a troca em spec_change_log. "Desfazer" volta ao valor de antes.

create table public.catalog_issues (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  kind text not null check (kind in ('ano', 'nome', 'combustivel', 'cambio', 'potencia', 'motor', 'fora_de_linha')),
  field text not null check (field in ('model_year', 'version', 'fuel', 'transmission', 'power_cv', 'engine_desc', 'status')),
  current_value text,           -- o que estava no cadastro quando a pendência foi aberta
  proposed_value text,          -- o que a fonte oficial indica (vazio: as fontes não batem e a pessoa decide)
  detail text not null,         -- o que a fonte diz
  source_url text,
  batch text not null default 'auditoria-2026-11',
  status text not null default 'aberta' check (status in ('aberta', 'aplicada', 'mantida')),
  applied_value text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (version_id, field, batch)
);
comment on table public.catalog_issues is 'Pendências de cadastro para o admin decidir no painel (aplicar o que diz a fonte oficial ou manter).';
create index catalog_issues_abertas on public.catalog_issues (kind) where status = 'aberta';
alter table public.catalog_issues enable row level security;
create policy "admin ve as pendencias" on public.catalog_issues for select to authenticated using ((select public.is_admin()));
revoke all on public.catalog_issues from anon, authenticated;
grant select on public.catalog_issues to authenticated;

-- troca um campo da versão nas três cópias e registra no histórico; devolve o valor antigo (uso interno)
create or replace function public.set_version_field(p_version_id text, p_field text, p_value text)
returns text language plpgsql security definer set search_path = '' as $$
declare antigo text; j jsonb;
begin
  if p_field not in ('model_year', 'version', 'fuel', 'transmission', 'power_cv', 'engine_desc', 'status') then
    raise exception 'campo não permitido: %', p_field;
  end if;
  if not exists (select 1 from public.versions where id = p_version_id) then raise exception 'versão não encontrada: %', p_version_id; end if;
  execute format('select (%I)::text from public.versions where id = $1', p_field) into antigo using p_version_id;
  if antigo is not distinct from p_value then return antigo; end if;
  if p_field = 'model_year' then
    if p_value is not null and p_value !~ '^(19|20)[0-9]{2}$' then raise exception 'ano inválido: %', p_value; end if;
    j := coalesce(to_jsonb(p_value::int), 'null'::jsonb);
    update public.versions v set model_year = p_value::int, raw = jsonb_set(coalesce(v.raw, '{}'), '{model_year}', j, true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{y}', j, true) end, updated_at = now()
    where v.id = p_version_id;
  elsif p_field = 'version' then
    if coalesce(trim(p_value), '') = '' then raise exception 'o nome da versão não pode ficar vazio'; end if;
    update public.versions v set version = trim(p_value),
      raw = jsonb_set(jsonb_set(coalesce(v.raw, '{}'), '{version}', to_jsonb(trim(p_value)), true), '{display_name}', to_jsonb(trim(concat_ws(' ', v.brand, v.model, trim(p_value)))), true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{v}', to_jsonb(trim(p_value)), true) end, updated_at = now()
    where v.id = p_version_id;
  elsif p_field = 'fuel' then
    if p_value not in ('Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido', 'Híbrido plug-in') then raise exception 'combustível inválido: %', p_value; end if;
    update public.versions v set fuel = p_value, raw = jsonb_set(coalesce(v.raw, '{}'), '{powertrain,fuel}', to_jsonb(p_value), true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{f}', to_jsonb(p_value), true) end, updated_at = now()
    where v.id = p_version_id;
  elsif p_field = 'transmission' then
    if coalesce(trim(p_value), '') = '' then raise exception 'o câmbio não pode ficar vazio'; end if;
    update public.versions v set transmission = trim(p_value), raw = jsonb_set(coalesce(v.raw, '{}'), '{powertrain,transmission}', to_jsonb(trim(p_value)), true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{t}', to_jsonb(trim(p_value)), true) end, updated_at = now()
    where v.id = p_version_id;
  elsif p_field = 'power_cv' then
    if p_value is not null and p_value !~ '^[0-9]{2,4}([.,][0-9])?$' then raise exception 'potência inválida: %', p_value; end if;
    j := coalesce(to_jsonb(replace(p_value, ',', '.')::numeric), 'null'::jsonb);
    update public.versions v set power_cv = replace(p_value, ',', '.')::numeric, raw = jsonb_set(coalesce(v.raw, '{}'), '{powertrain,power_cv}', j, true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{cv}', j, true) end, updated_at = now()
    where v.id = p_version_id;
  elsif p_field = 'engine_desc' then
    if coalesce(trim(p_value), '') = '' then raise exception 'o texto do motor não pode ficar vazio'; end if;
    update public.versions v set engine_desc = trim(p_value), raw = jsonb_set(coalesce(v.raw, '{}'), '{powertrain,engine_desc}', to_jsonb(trim(p_value)), true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{e}', to_jsonb(trim(p_value)), true) end, updated_at = now()
    where v.id = p_version_id;
  else
    if p_value not in ('on_sale', 'pre_order', 'announced', 'discontinued') then raise exception 'situação inválida: %', p_value; end if;
    update public.versions v set status = p_value, raw = jsonb_set(coalesce(v.raw, '{}'), '{status}', to_jsonb(p_value), true),
      catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{st}', to_jsonb(p_value), true) end, updated_at = now()
    where v.id = p_version_id;
  end if;
  insert into public.spec_change_log (version_id, column_name, old_value, new_value, source_id, batch)
    values (p_version_id, p_field, antigo, p_value, null, 'pendencias-painel');
  return antigo;
end $$;
revoke all on function public.set_version_field(text, text, text) from public, anon, authenticated;

-- o botão do painel: aplicar (a proposta ou o valor digitado), manter como está, ou desfazer/reabrir
create or replace function public.resolve_catalog_issue(p_id bigint, p_acao text, p_valor text default null)
returns public.catalog_issues language plpgsql security definer set search_path = '' as $$
declare p public.catalog_issues; valor text;
begin
  if not (select public.is_admin()) then raise exception 'só para admin'; end if;
  select * into p from public.catalog_issues where id = p_id for update;
  if not found then raise exception 'pendência não encontrada'; end if;
  if p_acao = 'aplicar' then
    if p.status <> 'aberta' then raise exception 'esta pendência já foi resolvida'; end if;
    valor := nullif(trim(coalesce(p_valor, p.proposed_value, '')), '');
    if valor is null then raise exception 'informe o valor'; end if;
    perform public.set_version_field(p.version_id, p.field, valor);
    update public.catalog_issues set status = 'aplicada', applied_value = valor, resolved_at = now(), resolved_by = auth.uid() where id = p_id returning * into p;
  elsif p_acao = 'manter' then
    if p.status <> 'aberta' then raise exception 'esta pendência já foi resolvida'; end if;
    update public.catalog_issues set status = 'mantida', applied_value = null, resolved_at = now(), resolved_by = auth.uid() where id = p_id returning * into p;
  elsif p_acao = 'reabrir' then
    if p.status = 'aplicada' then perform public.set_version_field(p.version_id, p.field, p.current_value); end if;
    update public.catalog_issues set status = 'aberta', applied_value = null, resolved_at = null, resolved_by = null where id = p_id returning * into p;
  else
    raise exception 'ação inválida: %', p_acao;
  end if;
  return p;
end $$;
revoke all on function public.resolve_catalog_issue(bigint, text, text) from public, anon;
grant execute on function public.resolve_catalog_issue(bigint, text, text) to authenticated;

-- as pendências da auditoria de nov/2026 (o valor atual vem do cadastro na hora da carga)
insert into public.catalog_issues (kind, field, version_id, current_value, proposed_value, detail)
select x.kind, x.field, v.id,
  case x.field when 'model_year' then v.model_year::text when 'version' then v.version when 'fuel' then v.fuel when 'transmission' then v.transmission
    when 'power_cv' then v.power_cv::text when 'engine_desc' then v.engine_desc else v.status end,
  x.proposed, x.detail
from (values
  ('ano', 'model_year', 'jeep-wrangler-rubicon-2-0-turbo-4x4', '2026', 'O cadastro está sem ano-modelo. A página do modelo no site da Jeep fala no "Wrangler 2026".'),
  ('ano', 'model_year', 'jeep-gladiator-rubicon-3-6-v6-4x4', '2026', 'O cadastro está sem ano-modelo. A página do modelo no site da Jeep fala no "Gladiator 2026".'),
  ('ano', 'model_year', 'volkswagen-jetta-gli-2-0-350-tsi-dsg', '2027', 'O configurador da VW vende o "Jetta GLI 350 TSI" como "Modelo 2027".'),
  ('ano', 'model_year', 'volkswagen-tiguan-r-line-2-0-350-tsi-4motion', '2027', 'O configurador da VW vende o Tiguan R-Line como modelo 2027.'),
  ('ano', 'model_year', 'land-rover-range-rover-autobiography-3-0-p550e-phev', '2027', 'O site da Range Rover já mostra esta versão como 2027. O preço lá também é outro: R$ 1.773.950.'),
  ('ano', 'model_year', 'land-rover-range-rover-sv-3-0-p550e-phev', '2027', 'O site da Range Rover já mostra esta versão como 2027. O preço lá também é outro: R$ 2.137.950.'),
  ('ano', 'model_year', 'renault-duster-iconic-plus-1-3-tce-x-tronic', '2026', 'O site e o catálogo da Renault de outubro de 2026 ainda vendem o Duster 2025/2026.'),
  ('ano', 'model_year', 'renault-duster-iconic-plus-1-6-sce-x-tronic', '2026', 'O site e o catálogo da Renault de outubro de 2026 ainda vendem o Duster 2025/2026.'),
  ('ano', 'model_year', 'renault-duster-intense-plus-1-6-sce-mt', '2026', 'O site e o catálogo da Renault de outubro de 2026 ainda vendem o Duster 2025/2026.'),
  ('ano', 'model_year', 'renault-duster-intense-plus-1-6-sce-x-tronic', '2026', 'O site e o catálogo da Renault de outubro de 2026 ainda vendem o Duster 2025/2026.'),
  ('ano', 'model_year', 'renault-duster-zen-plus-1-6-sce-mt', '2026', 'O site e o catálogo da Renault de outubro de 2026 ainda vendem o Duster 2025/2026.'),
  ('ano', 'model_year', 'renault-oroch-iconic-1-6-sce-mt', '2027', 'O site da Renault vende a Oroch 2026/2027.'),
  ('ano', 'model_year', 'renault-oroch-intense-1-6-sce-mt', '2027', 'O site da Renault vende a Oroch 2026/2027.'),
  ('ano', 'model_year', 'renault-oroch-pro-1-6-sce-mt', '2027', 'O site da Renault vende a Oroch 2026/2027.'),
  ('ano', 'model_year', 'honda-prelude-touring-2-0-e-hev', '2026', 'A Honda vende o Prelude como modelo 2026.'),
  ('ano', 'model_year', 'gwm-haval-h7-1-5-turbo-phev-flex-awd', '2026', 'O site da GWM vende o Haval H7 como 2026.'),
  ('nome', 'version', 'citroen-aircross-feel-turbo-200-at-5-lugares', 'Feel 7 Turbo 200 AT (7 lugares)', 'A lista de itens e a ficha 2026/2027 da Citroën chamam esta versão de "Feel 7", com 3ª fileira de 2 assentos rebatíveis.'),
  ('nome', 'version', 'dolphinmini-gs-38-kwh', 'GS (38,88 kWh)', 'A BYD informa bateria de 38,88 kWh nesta versão.'),
  ('nome', 'version', 'byd-han-awd-76-9-kwh', 'AWD 85,4 kWh', 'A BYD só vende o Han com bateria de 85,4 kWh (a ficha técnica do Autokan já é a dessa bateria).'),
  ('nome', 'version', 'byd-yuan-plus-60-8-kwh', '60,48 kWh', 'A BYD informa bateria de 60,48 kWh.'),
  ('nome', 'version', 'byd-yuan-plus-awd-74-8-kwh', 'AWD 74,88 kWh', 'A BYD informa bateria de 74,88 kWh.'),
  ('nome', 'version', 'land-rover-range-rover-sport-dynamic-3-0-p550e-phev', 'Dynamic SE 3.0 P550e PHEV', 'O site da Range Rover vende a versão "Dynamic SE", por R$ 1.040.750. O cadastro tem "Dynamic", por R$ 1.063.950.'),
  ('nome', 'version', 'hyundai-palisade-signature-3-8-v6-awd', '3.8 V6 AWD', 'O site da Hyundai vende o Palisade sem o nome "Signature".'),
  ('nome', 'version', 'kia-stonic-sx-1-0-tgdi-mhev-dct', '1.0 TGDI MHEV DCT', 'A Kia vende o Stonic em versão única, sem o nome "SX".'),
  ('nome', 'version', 'honda-prelude-touring-2-0-e-hev', '2.0 e:HEV', 'A Honda vende o Prelude em versão única, sem o nome "Touring".'),
  ('nome', 'version', 'honda-zr-v-touring-2-0-cvt', '2.0 CVT', 'A Honda vende o ZR-V em versão única, sem o nome "Touring".'),
  ('nome', 'version', 'mitsubishi-triton-gls-tarmac-2-4-biturbo-diesel-4x2-at', 'Tarmac 2.4 Biturbo Diesel 4x2 AT', 'A Mitsubishi chama esta versão de "Triton Tarmac", sem o "GLS".'),
  ('nome', 'version', 'lotus-eletre-900', '900 Sport', 'O site da Lotus não tem versão "900": tem "900 Sport" e "900 Sport Carbon".'),
  ('nome', 'version', 'lotus-emeya-900', '900 Sport', 'O site da Lotus não tem versão "900": tem "900 Sport" e "900 Sport Carbon".'),
  ('combustivel', 'fuel', 'porsche-911-carrera-gts', 'Gasolina', 'O cartão da versão no site da Porsche diz "Gasolina" (o sistema T-Hybrid fica descrito no texto do motor).'),
  ('combustivel', 'fuel', 'porsche-911-carrera-gts-cabriolet', 'Gasolina', 'O cartão da versão no site da Porsche diz "Gasolina" (o sistema T-Hybrid fica descrito no texto do motor).'),
  ('combustivel', 'fuel', 'porsche-911-targa-4-gts', 'Gasolina', 'O cartão da versão no site da Porsche diz "Gasolina" (o sistema T-Hybrid fica descrito no texto do motor).'),
  ('combustivel', 'fuel', 'porsche-911-turbo-s', 'Gasolina', 'O cartão da versão no site da Porsche diz "Gasolina" (o sistema T-Hybrid fica descrito no texto do motor).'),
  ('combustivel', 'fuel', 'porsche-911-turbo-s-cabriolet', 'Gasolina', 'O cartão da versão no site da Porsche diz "Gasolina" (o sistema T-Hybrid fica descrito no texto do motor).'),
  ('cambio', 'transmission', 'gwm-ora-5-58-3-kwh', 'Automático (elétrico/DHT)', 'A ficha diz redução única, sem marchas, como em todo elétrico. Os outros elétricos do Autokan usam "Automático (elétrico/DHT)".'),
  ('cambio', 'transmission', 'baic-arcfox-t1-pro', 'Automático (elétrico/DHT)', 'A ficha diz redução única, sem marchas, como em todo elétrico. Os outros elétricos do Autokan usam "Automático (elétrico/DHT)".'),
  ('cambio', 'transmission', 'baic-arcfox-t1-max', 'Automático (elétrico/DHT)', 'A ficha diz redução única, sem marchas, como em todo elétrico. Os outros elétricos do Autokan usam "Automático (elétrico/DHT)".'),
  ('cambio', 'transmission', 'jaecoo-jaecoo-5-shs-h-comfort', 'Automático (elétrico/DHT)', 'O site diz "1DHT" (câmbio de híbrido dedicado). Os outros híbridos com DHT do Autokan usam "Automático (elétrico/DHT)".'),
  ('cambio', 'transmission', 'jaecoo-jaecoo-5-shs-h-prestige', 'Automático (elétrico/DHT)', 'O site diz "1DHT" (câmbio de híbrido dedicado). Os outros híbridos com DHT do Autokan usam "Automático (elétrico/DHT)".'),
  ('potencia', 'power_cv', 'byd-song-plus-1-5-dm-i-turbo', '240', 'A ficha e a página do Song Plus dizem 240 cv combinados. O release do Song Plus 2027 (04/03/2026) diz 239 cv.'),
  ('potencia', 'power_cv', 'denza-b5-gl-4wd', '677', 'O release da Denza diz "até 677 cv". O catálogo dá 505 kW, que dá 687 cv na conversão (o número do cadastro).'),
  ('potencia', 'power_cv', 'denza-b5-gs-4wd', '677', 'O release da Denza diz "até 677 cv". O catálogo dá 505 kW, que dá 687 cv na conversão (o número do cadastro).'),
  ('potencia', 'power_cv', 'denza-z9-gt-ev-awd', null, 'A ficha dá 850 kW combinados (1.156 cv). O release diz 952 cv, o número do cadastro. As duas fontes são da Denza.'),
  ('potencia', 'power_cv', 'creta', null, 'A ficha de imprensa 26/27 da Hyundai diz 120 cv com etanol e 115 cv com gasolina. Os catálogos 26/27 dizem 115 cv com os dois combustíveis.'),
  ('potencia', 'power_cv', 'creta-comfort-1-0-tgdi', null, 'A ficha de imprensa 26/27 da Hyundai diz 120 cv com etanol e 115 cv com gasolina. Os catálogos 26/27 dizem 115 cv com os dois combustíveis.'),
  ('potencia', 'power_cv', 'creta-limited-1-0-tgdi', null, 'A ficha de imprensa 26/27 da Hyundai diz 120 cv com etanol e 115 cv com gasolina. Os catálogos 26/27 dizem 115 cv com os dois combustíveis.'),
  ('potencia', 'power_cv', 'creta-platinum-1-0-tgdi', null, 'A ficha de imprensa 26/27 da Hyundai diz 120 cv com etanol e 115 cv com gasolina. Os catálogos 26/27 dizem 115 cv com os dois combustíveis.'),
  ('potencia', 'power_cv', 'jetour-t1-advance-1-5-tgdi-phev-dht', '135', 'Os 315 cv "combinados" do cadastro não aparecem em fonte oficial. A ficha 2027 dá 135 cv no motor a combustão e 204 cv no elétrico. Os Jetour S06 e S08 já usam no cadastro a potência do motor a combustão (135 cv).'),
  ('potencia', 'power_cv', 'jetour-t1-premium-1-5-tgdi-phev-dht', '135', 'Os 315 cv "combinados" do cadastro não aparecem em fonte oficial. A ficha 2027 dá 135 cv no motor a combustão e 204 cv no elétrico. Os Jetour S06 e S08 já usam no cadastro a potência do motor a combustão (135 cv).'),
  ('potencia', 'power_cv', 'jetour-t2-advance-1-5-tgdi-phev-dht', '135', 'Os 320 cv "combinados" do cadastro não aparecem em fonte oficial. A ficha 2027 dá 135 cv no motor a combustão e 102 cv e 122 cv nos elétricos. Os Jetour S06 e S08 já usam no cadastro a potência do motor a combustão (135 cv).'),
  ('potencia', 'power_cv', 'jetour-t2-premium-1-5-tgdi-phev-dht', '135', 'Os 320 cv "combinados" do cadastro não aparecem em fonte oficial. A ficha 2027 dá 135 cv no motor a combustão e 102 cv e 122 cv nos elétricos. Os Jetour S06 e S08 já usam no cadastro a potência do motor a combustão (135 cv).'),
  ('potencia', 'power_cv', 'jetour-t2-xwd-4x4-1-5-tgdi-phev-dht', null, 'Os 597 cv do cadastro são o que o site chama de "potência total instalada": a soma simples das potências, que não é atingida ao mesmo tempo. Não é potência combinada.'),
  ('motor', 'engine_desc', 'jetour-s06-advance-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + motor elétrico 204 cv', 'Os 315 cv "combinados" do texto do motor não aparecem em fonte oficial. A ficha só dá 135 cv (combustão) e 204 cv (elétrico).'),
  ('motor', 'engine_desc', 'jetour-s06-premium-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + motor elétrico 204 cv', 'Os 315 cv "combinados" do texto do motor não aparecem em fonte oficial. A ficha só dá 135 cv (combustão) e 204 cv (elétrico).'),
  ('motor', 'engine_desc', 'jetour-t1-advance-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + motor elétrico 204 cv', 'Os 315 cv "combinados" do texto do motor não aparecem em fonte oficial. A ficha só dá 135 cv (combustão) e 204 cv (elétrico).'),
  ('motor', 'engine_desc', 'jetour-t1-premium-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + motor elétrico 204 cv', 'Os 315 cv "combinados" do texto do motor não aparecem em fonte oficial. A ficha só dá 135 cv (combustão) e 204 cv (elétrico).'),
  ('motor', 'engine_desc', 'jetour-s08-premium-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + motor elétrico 204 cv', 'Os 339 cv "combinados" do texto do motor são a "potência total instalada" do site: a soma simples, que não é atingida ao mesmo tempo.'),
  ('motor', 'engine_desc', 'jetour-t2-advance-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + 2 motores elétricos (102 cv e 122 cv)', 'Os 320 cv "combinados" do texto do motor não aparecem em fonte oficial. A ficha 2027 dá 135 cv (combustão) e 102 cv e 122 cv (elétricos).'),
  ('motor', 'engine_desc', 'jetour-t2-premium-1-5-tgdi-phev-dht', '1.5 turbo 135 cv + 2 motores elétricos (102 cv e 122 cv)', 'Os 320 cv "combinados" do texto do motor não aparecem em fonte oficial. A ficha 2027 dá 135 cv (combustão) e 102 cv e 122 cv (elétricos).'),
  ('motor', 'engine_desc', 'peugeot-partner-rapid-business-pack-1-3-flex', '1.3 flex 107 cv', 'O folheto MY 25/26 da Peugeot dá 107 cv também com gasolina. A ficha de imprensa de janeiro de 2025 dava 98 cv com gasolina.'),
  ('fora_de_linha', 'status', 'citroen-jumper-minibus-executive-17l-2-2-turbodiesel', 'discontinued', 'Não consta na linha Jumper 2026 da Citroën (há Minibus Comfort 17+1 e Minibus Luxo 15+1).'),
  ('fora_de_linha', 'status', 'citroen-jumper-vitre-2-2-turbodiesel', 'discontinued', 'Não consta na linha Jumper 2026 da Citroën.'),
  ('fora_de_linha', 'status', 'volkswagen-amarok-barretos-70-anos-cd-3-0-v6-tdi-4motion', 'discontinued', 'Edição limitada de 2025, esgotada. Saiu do site da VW.'),
  ('fora_de_linha', 'status', 'land-rover-range-rover-evoque-autobiography-2-0-p250-flex-awd', 'discontinued', 'O Evoque saiu do site da Land Rover.'),
  ('fora_de_linha', 'status', 'porsche-911-carrera-s', 'discontinued', 'A página desta versão (ano 2025) no site da Porsche dá erro 404.'),
  ('fora_de_linha', 'status', 'porsche-911-carrera-s-cabriolet', 'discontinued', 'A página desta versão (ano 2025) no site da Porsche dá erro 404.'),
  ('fora_de_linha', 'status', 'porsche-cayenne-s', 'discontinued', 'A página desta versão (ano 2026) no site da Porsche dá erro 404.'),
  ('fora_de_linha', 'status', 'porsche-macan-macan', 'discontinued', 'O Macan a combustão saiu do site da Porsche (a página dá erro 404). Lá só há o Macan elétrico.'),
  ('fora_de_linha', 'status', 'porsche-macan-t', 'discontinued', 'O Macan a combustão saiu do site da Porsche (a página dá erro 404). Lá só há o Macan elétrico.'),
  ('fora_de_linha', 'status', 'porsche-macan-s', 'discontinued', 'O Macan a combustão saiu do site da Porsche (a página dá erro 404). Lá só há o Macan elétrico.'),
  ('fora_de_linha', 'status', 'porsche-macan-gts', 'discontinued', 'O Macan a combustão saiu do site da Porsche (a página dá erro 404). Lá só há o Macan elétrico.'),
  ('fora_de_linha', 'status', 'ram-rampage-laramie-2-0-hurricane-4-turbo-flex-4x4', 'discontinued', 'Esta versão não aparece no site oficial da RAM.'),
  ('fora_de_linha', 'status', 'ram-rampage-rebel-ignition-2-2-turbodiesel-4x4', 'discontinued', 'Esta versão não aparece no site oficial da RAM.'),
  ('fora_de_linha', 'status', 'hyundai-tucson-limited-1-6-t-gdi', 'discontinued', 'O site da Hyundai não tem página nem material atual do Tucson, só o catálogo 2024/2025.'),
  ('fora_de_linha', 'status', 'audi-rs-6-avant-performance-4-0-v8-tfsi-quattro', 'discontinued', 'Não está na lista de preços oficial da Audi de outubro de 2026.'),
  ('fora_de_linha', 'status', 'ferrari-roma-spider-3-9-v8', 'discontinued', 'O Roma Spider saiu da linha atual no site da Ferrari.'),
  ('fora_de_linha', 'status', 'hitech-electric-e-work-ec35-van-38-7-kwh', 'discontinued', 'A página do EC35 no site da Hitech dá erro 404.'),
  ('fora_de_linha', 'status', 'gac-hyptec-ht-elite', 'discontinued', 'O Hyptec HT não aparece na tabela de preços da GAC de outubro de 2026.'),
  ('fora_de_linha', 'status', 'gac-hyptec-ht-ultra', 'discontinued', 'O Hyptec HT não aparece na tabela de preços da GAC de outubro de 2026.'),
  ('fora_de_linha', 'status', 'mercedes-benz-sprinter-315-furgao-extra-longo-teto-alto-2-0-diesel', 'discontinued', 'Não existe Sprinter 315 na linha 2026/2027 da Mercedes-Benz (o furgão de 3,5 t é o 317 Street).'),
  ('fora_de_linha', 'status', 'mercedes-benz-sprinter-315-furgao-longo-teto-alto-2-0-diesel', 'discontinued', 'Não existe Sprinter 315 na linha 2026/2027 da Mercedes-Benz (o furgão de 3,5 t é o 317 Street).'),
  ('fora_de_linha', 'status', 'mercedes-benz-sprinter-315-furgao-longo-teto-baixo-2-0-diesel', 'discontinued', 'Não existe Sprinter 315 na linha 2026/2027 da Mercedes-Benz (o furgão de 3,5 t é o 317 Street).')
) as x(kind, field, version_id, proposed, detail)
join public.versions v on v.id = x.version_id
on conflict (version_id, field, batch) do nothing;
