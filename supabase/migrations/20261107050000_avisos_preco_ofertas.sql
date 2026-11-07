-- Aviso de preço também para ofertas: uma mudança noticiada mais barata (public.price_changes, definitiva ou
-- promocional) entra na fila, e o preço "de agora" considera a oferta em vigor, como o site mostra.

-- preço que vale hoje: a oferta em vigor mais recente, senão o preço de tabela da versão
create or replace function public.effective_price(p_version_id text)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select pc.new_price from public.price_changes pc
      where pc.version_id = p_version_id and pc.change_type = 'promocional'
        and coalesce(pc.starts_on, pc.reported_on, current_date) <= current_date
        and (pc.ends_on is null or pc.ends_on >= current_date)
      order by coalesce(pc.starts_on, pc.reported_on) desc nulls last, pc.id desc limit 1),
    (select v.price from public.versions v where v.id = p_version_id))
$$;
revoke all on function public.effective_price(text) from public, anon, authenticated;
grant execute on function public.effective_price(text) to service_role;

-- mudança noticiada mais barata de uma versão salva por alguém entra na fila
create or replace function public.enqueue_price_change_drop()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.new_price < new.old_price and new.new_price > 0
     and exists (select 1 from public.garage g where g.version_id = new.version_id) then
    insert into public.price_alert_queue (version_id, old_price, new_price, price_kind)
      select new.version_id, new.old_price, new.new_price, v.price_kind from public.versions v where v.id = new.version_id;
  end if;
  return new;
end $$;
revoke all on function public.enqueue_price_change_drop() from public, anon, authenticated;
create trigger price_changes_drop after insert on public.price_changes
  for each row execute function public.enqueue_price_change_drop();

-- o lote e o fechamento da fila passam a comparar com o preço que vale hoje (com a oferta)
create or replace function public.price_alert_batch()
returns table (user_id uuid, email text, nome text, token uuid, version_id text, carro text, url text,
               preco_antes integer, preco_agora integer, price_kind text, queue_ids bigint[])
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  insert into public.price_alert_prefs (user_id)
    select distinct g.user_id from public.price_alert_queue q join public.garage g on g.version_id = q.version_id
    where q.processed_at is null on conflict on constraint price_alert_prefs_pkey do nothing;
  return query
  with alvo as (
    select g.user_id, q.version_id, q.id queue_id, q.old_price, q.created_at, q.price_kind
    from public.price_alert_queue q join public.garage g on g.version_id = q.version_id and g.created_at < q.created_at
    where q.processed_at is null
      and not exists (select 1 from public.price_alert_sent s where s.queue_id = q.id and s.user_id = g.user_id)
  ), por_carro as (
    select a.user_id, a.version_id, (array_agg(a.old_price order by a.created_at))[1] preco_antes,
           array_agg(a.queue_id) queue_ids, max(a.price_kind) price_kind
    from alvo a group by a.user_id, a.version_id
  )
  select pc.user_id, u.email::text, coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1))::text,
         pr.token, pc.version_id, trim(concat_ws(' ', v.brand, v.model, v.version))::text,
         ('https://autokan.com.br/carros/' || v.brand_id || '/' || substr(coalesce(v.catalog_row->>'m', v.model_id), length(v.brand_id) + 2))::text,
         pc.preco_antes, public.effective_price(v.id), pc.price_kind, pc.queue_ids
  from por_carro pc
  join auth.users u on u.id = pc.user_id and u.email is not null and u.email_confirmed_at is not null
  join public.price_alert_prefs pr on pr.user_id = pc.user_id and pr.enabled
  join public.versions v on v.id = pc.version_id
  where public.effective_price(v.id) > 0 and public.effective_price(v.id) < pc.preco_antes and coalesce(v.catalog_row->>'st', 'on_sale') = 'on_sale';
end $$;
revoke all on function public.price_alert_batch() from public, anon, authenticated;
grant execute on function public.price_alert_batch() to service_role;

create or replace function public.price_alert_done(p_sent jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.price_alert_sent (queue_id, user_id, provider_id)
    select (x->>'queue_id')::bigint, (x->>'user_id')::uuid, x->>'provider_id' from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x
  on conflict (queue_id, user_id) do nothing;
  get diagnostics n = row_count;
  update public.price_alert_queue q set processed_at = now()
  where q.processed_at is null and not exists (
    select 1 from public.garage g
    join auth.users u on u.id = g.user_id and u.email_confirmed_at is not null
    left join public.price_alert_prefs pr on pr.user_id = g.user_id
    where g.version_id = q.version_id and g.created_at < q.created_at and coalesce(pr.enabled, true)
      and public.effective_price(q.version_id) > 0 and public.effective_price(q.version_id) < q.old_price
      and not exists (select 1 from public.price_alert_sent s where s.queue_id = q.id and s.user_id = g.user_id));
  return n;
end $$;
revoke all on function public.price_alert_done(jsonb) from public, anon, authenticated;
grant execute on function public.price_alert_done(jsonb) to service_role;
