-- quantas pessoas já curtiram algum carro (sem expor quem)
create or replace function public.vote_people()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(distinct v.user_id) from public.votes v;
$$;
revoke execute on function public.vote_people() from public;
grant execute on function public.vote_people() to anon, authenticated;

-- a API do Storage só apaga um arquivo que quem pediu consegue ler
create policy "admin le imagens" on storage.objects for select to authenticated
  using (bucket_id in ('car-photos','brand-logos') and (select public.is_admin()));
