-- tokens de uso único para a função import-data (só o hash fica no banco)
create table public.import_tokens (
  token_sha256 text primary key,
  note text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.import_tokens enable row level security;
create policy "so admin" on public.import_tokens for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
