-- Preenche ou corrige colunas principais das versões (potência, torque, cilindrada, câmbio, tração) a partir de uma fonte
-- cadastrada, mantendo iguais as três cópias que o site usa (coluna, raw.powertrain e catalog_row) e registrando cada troca
-- em spec_change_log (valor antigo, novo, fonte e lote), para conferência e reversão.
create or replace function public.apply_version_columns(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0; antigo text;
begin
  if not exists (select 1 from public.import_tokens t
                 where t.token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and t.expires_at > now()) then
    raise exception 'token inválido ou vencido';
  end if;
  for r in select * from jsonb_to_recordset(p_rows) as x(version_id text, column_name text, new_value text, source_id text, batch text) loop
    if r.column_name not in ('power_cv', 'torque_kgfm', 'displacement_l', 'transmission', 'drive') then
      raise exception 'coluna não permitida: %', r.column_name;
    end if;
    if not exists (select 1 from public.sources s where s.id = r.source_id) then raise exception 'fonte inexistente: %', r.source_id; end if;
    execute format('select (%I)::text from public.versions where id = $1', r.column_name) into antigo using r.version_id;
    if antigo is not distinct from r.new_value then continue; end if;
    if r.column_name in ('power_cv') then
      update public.versions v set power_cv = r.new_value::numeric,
        raw = jsonb_set(v.raw, '{powertrain,power_cv}', to_jsonb(r.new_value::numeric), true),
        catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{cv}', to_jsonb(r.new_value::numeric), true) end
      where v.id = r.version_id;
    elsif r.column_name = 'torque_kgfm' then
      update public.versions v set torque_kgfm = r.new_value::numeric,
        raw = jsonb_set(v.raw, '{powertrain,torque_kgfm}', to_jsonb(r.new_value::numeric), true) where v.id = r.version_id;
    elsif r.column_name = 'displacement_l' then
      update public.versions v set displacement_l = r.new_value::numeric,
        raw = jsonb_set(v.raw, '{powertrain,displacement_l}', to_jsonb(r.new_value::numeric), true) where v.id = r.version_id;
    elsif r.column_name = 'transmission' then
      update public.versions v set transmission = r.new_value,
        raw = jsonb_set(v.raw, '{powertrain,transmission}', to_jsonb(r.new_value), true),
        catalog_row = case when v.catalog_row is null then null else jsonb_set(v.catalog_row, '{t}', to_jsonb(r.new_value), true) end
      where v.id = r.version_id;
    else
      update public.versions v set drive = r.new_value,
        raw = jsonb_set(v.raw, '{powertrain,drive}', to_jsonb(r.new_value), true) where v.id = r.version_id;
    end if;
    insert into public.spec_change_log (version_id, column_name, old_value, new_value, source_id, batch)
      values (r.version_id, r.column_name, antigo, r.new_value, r.source_id, r.batch);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.apply_version_columns(text, jsonb) from public;
grant execute on function public.apply_version_columns(text, jsonb) to anon, authenticated;
