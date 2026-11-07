-- refresh_version_specs também esvazia a ficha (versions.specs = {}) das versões pedidas que ficaram sem nenhum dado atual
-- (ex.: depois de desfazer um lote ou retirar dados de uma fonte). Sem lista, continua atualizando só quem tem dado.
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
  if p_version_ids is not null then
    update public.versions v set specs = '{}'::jsonb
    where v.id = any(p_version_ids) and v.specs <> '{}'::jsonb
      and not exists (select 1 from public.version_specs s where s.version_id = v.id and s.is_current);
  end if;
  return n;
end $$;
revoke all on function public.refresh_version_specs(text[]) from public, anon, authenticated;
