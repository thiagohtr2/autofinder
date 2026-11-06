-- Cadastro em lote das fontes (URL exata, nome, data da consulta) usadas nas fichas técnicas, com o mesmo token temporário.
-- Só insere fontes novas; uma fonte já cadastrada não é alterada.
create or replace function public.ingest_sources(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not exists (select 1 from public.import_tokens t
                 where t.token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and t.expires_at > now()) then
    raise exception 'token inválido ou vencido';
  end if;
  insert into public.sources (id, name, url, type, consulted_at, raw)
    select x.id, x.name, x.url, x.type, x.consulted_at, coalesce(x.raw, '{}'::jsonb)
    from jsonb_to_recordset(p_rows) as x(id text, name text, url text, type text, consulted_at date, raw jsonb)
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ingest_sources(text, jsonb) from public;
grant execute on function public.ingest_sources(text, jsonb) to anon, authenticated;
