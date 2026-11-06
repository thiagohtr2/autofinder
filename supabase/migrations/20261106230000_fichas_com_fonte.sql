-- Fichas técnicas com fonte por dado, FIPE separada do preço da montadora e registro de alterações reversível.
-- Cada dado técnico de uma versão é uma linha em version_specs, com a fonte (sources.id), o trecho que o confirma
-- e o lote (batch) em que entrou. Ao trocar um valor, a linha antiga fica guardada (is_current = false), então
-- qualquer lote pode ser desfeito. versions.specs passa a ser montado a partir daqui (refresh_version_specs) para o site ler.

create table public.version_specs (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on delete cascade,
  field text not null check (field ~ '^[a-z_]+\.[a-z0-9_]+$'),   -- grupo.campo, ex.: consumo.etanol_cidade_kml
  value_num numeric,
  value_text text,
  unit text,
  source_id text not null references public.sources(id),
  source_detail text,              -- trecho/linha da fonte que confirma o dado (ex.: "PBEV: CHEVROLET ONIX LTZ 1.0T A-6 F")
  ref_period text,                 -- ano-modelo ou ciclo de referência (ex.: "2027", "PBEV 2026")
  consulted_on date not null,
  status text not null default 'confirmado' check (status in ('confirmado', 'divergente')),
  is_current boolean not null default true,
  batch text not null,
  created_at timestamptz not null default now(),
  check (value_num is not null or value_text is not null)
);
create unique index version_specs_atual on public.version_specs (version_id, field) where is_current;
create index version_specs_batch on public.version_specs (batch);
comment on table public.version_specs is 'Dados técnicos por versão, um por linha, sempre com fonte (sources) e lote; o histórico fica (is_current=false).';

-- Tabela FIPE: referência de preço separada do preço sugerido pela montadora; uma linha por consulta (histórico preservado)
create table public.version_fipe (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on delete cascade,
  fipe_code text not null check (fipe_code ~ '^[0-9]{6}-[0-9]$'),
  fipe_brand text, fipe_model text,
  model_year integer,              -- ano-modelo da FIPE (32000 = zero km)
  fuel text,
  value integer,                   -- valor de referência em reais
  ref_month text not null check (ref_month ~ '^[0-9]{4}-[0-9]{2}$'),
  source_id text not null references public.sources(id),
  consulted_on date not null,
  match_note text,                 -- por que a correspondência é confiável
  is_current boolean not null default true,
  batch text not null,
  created_at timestamptz not null default now()
);
create index version_fipe_versao on public.version_fipe (version_id) where is_current;
comment on table public.version_fipe is 'Código e valor FIPE por versão, com mês de referência e fonte; não substitui o preço da montadora.';

-- Registro de alterações em campos já existentes de versions (potência, torque, câmbio...), para auditoria e reversão
create table public.spec_change_log (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on delete cascade,
  column_name text not null,
  old_value text, new_value text,
  source_id text references public.sources(id),
  batch text not null,
  changed_at timestamptz not null default now()
);
create index spec_change_log_batch on public.spec_change_log (batch);

alter table public.version_specs enable row level security;
alter table public.version_fipe enable row level security;
alter table public.spec_change_log enable row level security;
create policy "leitura publica" on public.version_specs for select to anon, authenticated using (true);
create policy "leitura publica" on public.version_fipe for select to anon, authenticated using (true);
create policy "admin escreve" on public.version_specs for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin escreve" on public.version_fipe for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "so admin" on public.spec_change_log for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- monta versions.specs (o que o site lê) a partir dos dados atuais com fonte:
-- { "consumo": { "etanol_cidade_kml": {"v": 9.1, "u": "km/l", "s": "<source_id>"}, ... }, ... }
create or replace function public.refresh_version_specs(p_version_ids text[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with dados as (
    select s.version_id, split_part(s.field, '.', 1) grupo, split_part(s.field, '.', 2) campo,
           jsonb_strip_nulls(jsonb_build_object('v', coalesce(to_jsonb(s.value_num), to_jsonb(s.value_text)), 'u', s.unit, 's', s.source_id, 'r', s.ref_period)) val
    from public.version_specs s
    where s.is_current and (p_version_ids is null or s.version_id = any(p_version_ids))
  ), grupos as (
    select version_id, grupo, jsonb_object_agg(campo, val) obj from dados group by version_id, grupo
  ), tudo as (
    select version_id, jsonb_object_agg(grupo, obj) specs from grupos group by version_id
  )
  update public.versions v set specs = t.specs
  from tudo t where v.id = t.version_id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.refresh_version_specs(text[]) from public, anon, authenticated;
