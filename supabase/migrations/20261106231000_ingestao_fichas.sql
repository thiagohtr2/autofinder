-- Gravação em lote de dados técnicos (version_specs), protegida por token de uso temporário (import_tokens guarda só o hash).
-- Cada linha nova substitui a atual do mesmo campo, que fica no histórico (is_current = false). Nada é apagado.
create or replace function public.ingest_version_specs(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not exists (select 1 from public.import_tokens t
                 where t.token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and t.expires_at > now()) then
    raise exception 'token inválido ou vencido';
  end if;
  create temp table _novos on commit drop as
    select * from jsonb_to_recordset(p_rows) as x(version_id text, field text, value_num numeric, value_text text, unit text,
      source_id text, source_detail text, ref_period text, consulted_on date, status text, batch text);
  update public.version_specs s set is_current = false
    from _novos r where s.version_id = r.version_id and s.field = r.field and s.is_current;
  insert into public.version_specs (version_id, field, value_num, value_text, unit, source_id, source_detail, ref_period, consulted_on, status, batch)
    select version_id, field, value_num, value_text, unit, source_id, source_detail, ref_period, consulted_on, coalesce(status, 'confirmado'), batch from _novos;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.ingest_version_specs(text, jsonb) from public;
grant execute on function public.ingest_version_specs(text, jsonb) to anon, authenticated;

-- desfaz um lote sem apagar nada: as linhas dele deixam de valer e a anterior de cada campo volta a valer
create or replace function public.undo_spec_batch(p_batch text)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  create temp table _lote on commit drop as
    select id, version_id, field from public.version_specs where batch = p_batch and is_current;
  update public.version_specs s set is_current = false from _lote l where s.id = l.id;
  get diagnostics n = row_count;
  update public.version_specs s set is_current = true
    from (select distinct on (s2.version_id, s2.field) s2.id
          from public.version_specs s2 join _lote l on l.version_id = s2.version_id and l.field = s2.field
          where s2.batch <> p_batch
          order by s2.version_id, s2.field, s2.created_at desc) ult
    where s.id = ult.id;
  return n;
end $$;
revoke all on function public.undo_spec_batch(text) from public, anon, authenticated;
