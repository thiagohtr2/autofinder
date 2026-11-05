-- giroauto · esquema completo do banco (Supabase / Postgres 17)
-- Tudo que o site guarda: marcas, modelos, versões, preços e histórico, fontes,
-- fotos e logos, alertas, notícias, curtidas, comentários, radar de lançamentos,
-- registro de mudanças, configurações e uma cópia bruta de cada documento original.

-- ============================================================
-- 0. Utilidades
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ============================================================
-- 1. Usuários e papéis
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil público de cada usuário (nome exibido nos comentários) e papel (user/admin).';

-- e-mails que viram administradores automaticamente ao criar a conta
create table public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);
insert into public.admin_emails(email) values ('thiagohtr2@gmail.com');

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) then 'admin' else 'user' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. Catálogo: marcas, modelos, versões
-- ============================================================
create table public.brands (
  id text primary key,                         -- slug: 'byd', 'mercedes-benz'
  name text not null,
  group_name text,                             -- grupo econômico (Stellantis, BYD Auto…)
  country text,                                -- país de origem da marca
  site_url text,                               -- site oficial no Brasil
  status text not null default 'on_sale',
  logo_media_id uuid,                          -- -> media (preenchido depois)
  raw jsonb not null default '{}'::jsonb,      -- documento original completo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.models (
  id text primary key,                         -- 'byd-dolphin-mini'
  brand_id text not null references public.brands(id) on update cascade,
  name text not null,
  body text,                                   -- Hatch, Sedã, SUV, Picape, Esportivo, Minivan, Perua, Van
  status text not null default 'on_sale',
  price_min integer,
  price_max integer,
  photo_media_id uuid,                         -- -> media (foto do modelo)
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index models_brand_idx on public.models(brand_id);

create table public.versions (
  id text primary key,
  brand_id text not null references public.brands(id) on update cascade,
  model_id text not null references public.models(id) on update cascade,
  brand text,                                  -- nome da marca como exibido
  model text,                                  -- nome do modelo como exibido
  version text not null,                       -- nome da versão
  display_name text,
  model_year integer,
  status text not null default 'on_sale' check (status in ('on_sale','pre_order','announced','discontinued')),
  body text,
  -- preço atual
  price integer,
  price_kind text,                             -- 'sugerido' (tabela da montadora) | 'fipe'
  price_ref_month text,                        -- 'AAAA-MM'
  price_promo text,
  price_validity text,
  price_source_id text,
  -- motorização
  engine_desc text,
  fuel text,
  fuel_raw text,
  propulsion text,
  power_cv numeric,
  power_cv_status text,
  torque_kgfm numeric,
  displacement_l numeric,
  transmission text,
  transmission_raw text,
  drive text,
  turbo boolean,
  -- origem
  brand_country text,
  manufactured_in text,
  national boolean,
  -- demais dados
  highlights text[] not null default '{}',     -- pontos fortes
  specs jsonb not null default '{}'::jsonb,    -- dimensões, desempenho, consumo, segurança…
  quality jsonb not null default '{}'::jsonb,  -- completude da ficha
  notes text,
  source_ids text[] not null default '{}',
  image_refs jsonb not null default '[]'::jsonb,
  -- radar / novidades
  radar_item_id text,                          -- item do radar que criou/atualizou a versão
  new_since date,                              -- etiqueta "novo"
  updated_since date,                          -- etiqueta "atualizado"
  raw jsonb not null default '{}'::jsonb,
  catalog_row jsonb,                           -- linha compacta original da roleta
  created_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index versions_model_idx on public.versions(model_id);
create index versions_brand_idx on public.versions(brand_id);
create index versions_price_idx on public.versions(price) where status = 'on_sale';
create index versions_year_idx on public.versions(model_year);

-- histórico de preços (nada se perde quando o preço muda)
create table public.version_prices (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  price integer,
  price_kind text,
  ref_month text,
  promo text,
  source_id text,
  valid_from date,
  valid_until date,                            -- null = preço vigente
  recorded_at timestamptz not null default now()
);
create index version_prices_version_idx on public.version_prices(version_id);

-- fontes de cada dado/preço
create table public.sources (
  id text primary key,
  name text,
  url text,
  type text,
  consulted_at date,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.version_sources (
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  source_id text not null references public.sources(id) on update cascade on delete cascade,
  primary key (version_id, source_id)
);
create index version_sources_source_idx on public.version_sources(source_id);

-- ============================================================
-- 3. Imagens (fotos dos modelos e logos das marcas)
-- ============================================================
create table public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('model_photo','brand_logo','other')),
  owner_id text not null,                      -- model_id ou brand_id
  bucket text not null,                        -- 'car-photos' | 'brand-logos'
  storage_path text not null,                  -- caminho no Storage
  public_path text,                            -- caminho servido pelo site (backup estático)
  mime_type text,
  bytes integer,
  width integer,
  height integer,
  ai_generated boolean not null default false,
  is_current boolean not null default true,    -- imagem em uso (as antigas ficam guardadas)
  legacy_asset_id text,                        -- id no armazenamento antigo
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);
create index media_owner_idx on public.media(kind, owner_id) where is_current;
create unique index media_one_current on public.media(kind, owner_id) where is_current;

alter table public.brands add constraint brands_logo_fk foreign key (logo_media_id) references public.media(id) on delete set null;
alter table public.models add constraint models_photo_fk foreign key (photo_media_id) references public.media(id) on delete set null;
create index brands_logo_idx on public.brands(logo_media_id);
create index models_photo_idx on public.models(photo_media_id);

-- ============================================================
-- 4. Alertas e notícias por modelo
-- ============================================================
create table public.alerts (
  id bigint generated always as identity primary key,
  model_id text not null references public.models(id) on update cascade on delete cascade,
  kind text not null,                          -- recall | defeito | midia | servico
  title text not null,
  summary text,
  affects text,
  source text,
  url text,
  date date,
  created_at timestamptz not null default now()
);
create index alerts_model_idx on public.alerts(model_id);

create table public.news (
  id bigint generated always as identity primary key,
  model_id text not null references public.models(id) on update cascade on delete cascade,
  title text not null,
  summary text,
  source text,
  url text,
  date date,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index news_model_idx on public.news(model_id);

-- ============================================================
-- 5. Comunidade: curtidas e comentários
-- ============================================================
create table public.votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, version_id)
);
create index votes_version_idx on public.votes(version_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  model_id text not null references public.models(id) on update cascade on delete cascade,
  version_id text references public.versions(id) on update cascade on delete set null,  -- null = vale para todas as versões
  body text not null check (char_length(body) between 1 and 10000),
  legacy_user_id text,
  legacy_author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index comments_model_idx on public.comments(model_id) where deleted_at is null;
create index comments_user_idx on public.comments(user_id);
create index comments_version_idx on public.comments(version_id);
create trigger comments_updated before update on public.comments
  for each row execute function public.set_updated_at();

-- curtidas e comentários do site antigo (ids de usuário antigos, antes do login novo)
create table public.legacy_votes (
  legacy_user_id text not null,
  car_id text not null,                        -- id usado no site antigo (versão ou modelo)
  voted_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  primary key (legacy_user_id, car_id)
);
create index legacy_votes_claimed_idx on public.legacy_votes(claimed_by);

-- ============================================================
-- 6. Radar de lançamentos (admin)
-- ============================================================
create table public.radar_runs (
  id text primary key,                         -- 'AAAA-MM-DDTHH-MM'
  at timestamptz,
  summary text,
  highlights text[] not null default '{}',
  total integer,
  essential integer,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.radar_items (
  id text primary key,                         -- 'AAAA-MM-DD-marca-modelo'
  run_id text references public.radar_runs(id) on update cascade on delete set null,
  title text not null,
  summary text,
  kind text,                                   -- novo_carro | nova_versao | preco | marca | fim_de_linha | evento | outro
  essential boolean not null default false,
  brand text,
  model text,
  model_id text,
  date date,
  source text,
  url text,
  in_db text,                                  -- sim | parcial | nao
  action text,
  add_payload jsonb,                           -- pacote pronto para "Adicionar ao banco"
  status text not null default 'novo' check (status in ('novo','feito','ignorado')),
  applied_at timestamptz,
  applied_log text[],
  applied_brand text,
  applied_model text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index radar_items_status_idx on public.radar_items(status);
create index radar_items_run_idx on public.radar_items(run_id);
create trigger radar_items_updated before update on public.radar_items
  for each row execute function public.set_updated_at();

create table public.change_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text,                                  -- 'radar', 'admin', 'pipeline'…
  radar_item_id text,
  model_id text,
  payload jsonb not null default '{}'::jsonb
);

-- ============================================================
-- 7. Configurações e cópia bruta de tudo
-- ============================================================
create table public.site_meta (
  key text primary key,                        -- imggroups, news_log, procedure, progress, brand_sites…
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.import_jobs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- cada documento do banco antigo, exatamente como era (seguro contra perda)
create table public.legacy_records (
  collection text not null,
  doc_id text not null,
  data jsonb not null,
  exported_at timestamptz not null default now(),
  primary key (collection, doc_id)
);

-- updated_at automático
create trigger brands_updated before update on public.brands for each row execute function public.set_updated_at();
create trigger models_updated before update on public.models for each row execute function public.set_updated_at();
create trigger versions_updated before update on public.versions for each row execute function public.set_updated_at();

-- histórico automático: quando o preço de uma versão muda, o anterior é fechado e o novo aberto
create or replace function public.track_price_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price or new.price_kind is distinct from old.price_kind then
    update public.version_prices set valid_until = current_date
      where version_id = new.id and valid_until is null;
    insert into public.version_prices(version_id, price, price_kind, ref_month, promo, source_id, valid_from)
      values (new.id, new.price, new.price_kind, new.price_ref_month, new.price_promo, new.price_source_id, current_date);
  end if;
  return new;
end $$;
create trigger versions_price_history after insert or update of price, price_kind on public.versions
  for each row execute function public.track_price_change();

-- ============================================================
-- 8. Leitura pronta para o site
-- ============================================================
-- roleta: todas as versões à venda, com marca, foto e logo
create or replace view public.catalog with (security_invoker = true) as
select v.id, v.model_id, v.brand_id, b.name as brand, m.name as model, v.version, v.model_year,
       v.price, v.price_kind, v.body, v.fuel, v.propulsion, v.transmission, v.power_cv, v.engine_desc,
       v.drive, v.turbo, v.highlights, v.status, v.new_since, v.updated_since, v.radar_item_id,
       b.country as brand_country, b.site_url as brand_site,
       pm.storage_path as photo_path, pm.public_path as photo_public_path, pm.ai_generated as photo_ai,
       lm.storage_path as logo_path, lm.public_path as logo_public_path
from public.versions v
join public.models m on m.id = v.model_id
join public.brands b on b.id = v.brand_id
left join public.media pm on pm.id = m.photo_media_id
left join public.media lm on lm.id = b.logo_media_id;

-- total de curtidas por versão (sem expor quem curtiu)
create or replace function public.vote_counts()
returns table(version_id text, votes bigint)
language sql stable security definer set search_path = '' as $$
  select v.version_id, count(*) from public.votes v group by v.version_id;
$$;

-- ============================================================
-- 9. Segurança (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.admin_emails enable row level security;
alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.versions enable row level security;
alter table public.version_prices enable row level security;
alter table public.sources enable row level security;
alter table public.version_sources enable row level security;
alter table public.media enable row level security;
alter table public.alerts enable row level security;
alter table public.news enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.legacy_votes enable row level security;
alter table public.radar_runs enable row level security;
alter table public.radar_items enable row level security;
alter table public.change_log enable row level security;
alter table public.site_meta enable row level security;
alter table public.import_jobs enable row level security;
alter table public.legacy_records enable row level security;

-- leitura pública do catálogo; escrita só do admin
do $$
declare t text;
begin
  foreach t in array array['brands','models','versions','version_prices','sources','version_sources','media','alerts','news','site_meta'] loop
    execute format('create policy "leitura publica" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin insere" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "admin altera" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "admin apaga" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
  -- só admin lê e escreve
  foreach t in array array['admin_emails','radar_runs','radar_items','change_log','import_jobs','legacy_records','legacy_votes'] loop
    execute format('create policy "so admin" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- perfis: nomes públicos; cada um edita o seu (sem poder virar admin)
create policy "perfis publicos" on public.profiles for select to anon, authenticated using (true);
create policy "edita o proprio perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select public.my_role()));
create policy "admin gerencia perfis" on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- curtidas: cada um vê, cria e apaga só as suas
create policy "ve as proprias curtidas" on public.votes for select to authenticated using (user_id = (select auth.uid()));
create policy "curte" on public.votes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "descurte" on public.votes for delete to authenticated using (user_id = (select auth.uid()));
create policy "admin ve curtidas" on public.votes for select to authenticated using ((select public.is_admin()));

-- comentários: todos leem os não apagados; o autor cria/edita/apaga os seus; admin modera
create policy "le comentarios" on public.comments for select to anon, authenticated using (deleted_at is null or (select public.is_admin()));
create policy "comenta" on public.comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "edita o proprio comentario" on public.comments for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "apaga o proprio comentario" on public.comments for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke execute on function public.vote_counts() from public;
grant execute on function public.vote_counts() to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- 10. Storage: fotos dos carros e logos das marcas
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('car-photos', 'car-photos', true, 20971520, array['image/png','image/webp','image/jpeg','image/avif']),
  ('brand-logos', 'brand-logos', true, 5242880, array['image/png','image/webp','image/jpeg','image/svg+xml','image/avif'])
on conflict (id) do nothing;

create policy "admin envia imagens" on storage.objects for insert to authenticated
  with check (bucket_id in ('car-photos','brand-logos') and (select public.is_admin()));
create policy "admin troca imagens" on storage.objects for update to authenticated
  using (bucket_id in ('car-photos','brand-logos') and (select public.is_admin()));
create policy "admin apaga imagens" on storage.objects for delete to authenticated
  using (bucket_id in ('car-photos','brand-logos') and (select public.is_admin()));
