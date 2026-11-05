-- mudanças de preço noticiadas: o site mostra o valor antigo, o novo, a validade e a fonte
create table public.price_changes (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  old_price integer not null check (old_price > 0),
  new_price integer not null check (new_price > 0),
  change_type text not null check (change_type in ('definitivo','promocional')),
  starts_on date,
  ends_on date,                                -- null = sem data de término informada
  reason text not null,                        -- por que o preço mudou, com as palavras do giroauto
  source_name text,
  source_url text not null check (source_url ~ '^https?://'),
  reported_on date,                            -- quando a fonte publicou ou foi consultada
  radar_item_id text,
  created_at timestamptz not null default now(),
  check (old_price <> new_price),
  unique (version_id, source_url)
);
create index price_changes_version_idx on public.price_changes(version_id);

alter table public.price_changes enable row level security;
create policy "leitura publica" on public.price_changes for select to anon, authenticated using (true);
create policy "admin insere" on public.price_changes for insert to authenticated with check ((select public.is_admin()));
create policy "admin altera" on public.price_changes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin apaga" on public.price_changes for delete to authenticated using ((select public.is_admin()));
