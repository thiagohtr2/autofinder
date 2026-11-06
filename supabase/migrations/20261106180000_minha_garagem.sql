-- Minha garagem: carros que cada pessoa salvou para acompanhar e comparar.
-- Privada: cada pessoa vê, salva e tira só os próprios carros (como os favoritos, mas sem contagem pública
-- e sem mexer no ranking). Se a versão sai do banco ou a conta é apagada, o item some junto.
create table public.garage (
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, version_id)
);
comment on table public.garage is 'Minha garagem: carros que cada pessoa salvou para acompanhar e comparar. Privada: cada um vê só os seus.';
create index garage_version_id_idx on public.garage (version_id);

alter table public.garage enable row level security;
create policy "ve a propria garagem" on public.garage for select to authenticated using (user_id = (select auth.uid()));
create policy "salva na garagem" on public.garage for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tira da garagem" on public.garage for delete to authenticated using (user_id = (select auth.uid()));
create policy "admin ve garagens" on public.garage for select to authenticated using ((select public.is_admin()));

-- só quem entrou na conta mexe na garagem
revoke all on public.garage from anon;
grant select, insert, delete on public.garage to authenticated;
