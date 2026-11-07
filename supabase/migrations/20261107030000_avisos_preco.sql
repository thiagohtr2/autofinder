-- Aviso de baixa de preço: quem salvou um carro recebe um e-mail quando o preço dele cai.
-- 1) quando o preço de uma versão salva por alguém baixa (mesmo tipo de preço), a mudança entra na fila;
-- 2) a função "avisos-preco" (Edge Function, chamada de hora em hora pelo pg_cron) junta a fila por pessoa,
--    manda um e-mail só com todos os carros dela que baixaram e marca o que foi enviado;
-- 3) cada pessoa liga/desliga nos Salvos, ou desliga pelo link do e-mail (sem precisar entrar na conta).

-- preferência de cada pessoa (sem linha = avisos ligados)
create table public.price_alert_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  token uuid not null default gen_random_uuid() unique,   -- vai no link "desligar avisos" do e-mail
  updated_at timestamptz not null default now()
);
comment on table public.price_alert_prefs is 'Avisos de baixa de preço: ligado/desligado por pessoa e o código do link de descadastro.';
alter table public.price_alert_prefs enable row level security;
create policy "ve a propria preferencia" on public.price_alert_prefs for select to authenticated using (user_id = (select auth.uid()));
create policy "cria a propria preferencia" on public.price_alert_prefs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "muda a propria preferencia" on public.price_alert_prefs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.price_alert_prefs from anon;
grant select, insert, update on public.price_alert_prefs to authenticated;

-- fila de baixas de preço (só o servidor mexe; o admin vê)
create table public.price_alert_queue (
  id bigint generated always as identity primary key,
  version_id text not null references public.versions(id) on update cascade on delete cascade,
  old_price integer not null,
  new_price integer not null,
  price_kind text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index price_alert_queue_pendentes on public.price_alert_queue (created_at) where processed_at is null;
alter table public.price_alert_queue enable row level security;
create policy "admin ve a fila" on public.price_alert_queue for select to authenticated using ((select public.is_admin()));
revoke all on public.price_alert_queue from anon, authenticated;
grant select on public.price_alert_queue to authenticated;

-- registro do que foi enviado: um aviso por pessoa e por baixa, nunca repetido
create table public.price_alert_sent (
  id bigint generated always as identity primary key,
  queue_id bigint not null references public.price_alert_queue(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  provider_id text,
  unique (queue_id, user_id)
);
alter table public.price_alert_sent enable row level security;
create policy "admin ve os envios" on public.price_alert_sent for select to authenticated using ((select public.is_admin()));
revoke all on public.price_alert_sent from anon, authenticated;
grant select on public.price_alert_sent to authenticated;

-- entra na fila: preço novo menor que o anterior, os dois válidos, mesmo tipo (sugerido x FIPE não se compara),
-- versão à venda e salva por alguém
create or replace function public.enqueue_price_drop()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.price > 0 and new.price > 0 and new.price < old.price
     and new.price_kind is not distinct from old.price_kind
     and coalesce(new.catalog_row->>'st', 'on_sale') = 'on_sale'
     and exists (select 1 from public.garage g where g.version_id = new.id) then
    insert into public.price_alert_queue (version_id, old_price, new_price, price_kind) values (new.id, old.price, new.price, new.price_kind);
  end if;
  return new;
end $$;
revoke all on function public.enqueue_price_drop() from public, anon, authenticated;
create trigger versions_price_drop after update of price on public.versions
  for each row execute function public.enqueue_price_drop();

-- o que mandar agora: por pessoa e por versão, a baixa desde que ela salvou o carro, se o preço atual
-- ainda está abaixo do anterior e a pessoa não desligou os avisos. Uso só pelo servidor (service role).
create or replace function public.price_alert_batch()
returns table (user_id uuid, email text, nome text, token uuid, version_id text, carro text, url text,
               preco_antes integer, preco_agora integer, price_kind text, queue_ids bigint[])
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  -- quem vai receber ganha a linha de preferência (com o código do link de descadastro)
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
         pc.preco_antes, v.price::integer, pc.price_kind, pc.queue_ids
  from por_carro pc
  join auth.users u on u.id = pc.user_id and u.email is not null and u.email_confirmed_at is not null
  join public.price_alert_prefs pr on pr.user_id = pc.user_id and pr.enabled
  join public.versions v on v.id = pc.version_id
  where v.price > 0 and v.price < pc.preco_antes and coalesce(v.catalog_row->>'st', 'on_sale') = 'on_sale';
end $$;
revoke all on function public.price_alert_batch() from public, anon, authenticated;
grant execute on function public.price_alert_batch() to service_role;

-- fecha a fila: o que foi enviado fica registrado; baixas sem ninguém para avisar (ou que já voltaram ao preço antigo) saem da fila
create or replace function public.price_alert_done(p_sent jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.price_alert_sent (queue_id, user_id, provider_id)
    select (x->>'queue_id')::bigint, (x->>'user_id')::uuid, x->>'provider_id' from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x
  on conflict (queue_id, user_id) do nothing;
  get diagnostics n = row_count;
  -- uma baixa sai da fila quando não há mais ninguém para avisar sobre ela
  update public.price_alert_queue q set processed_at = now()
  where q.processed_at is null and not exists (
    select 1 from public.garage g
    join auth.users u on u.id = g.user_id and u.email_confirmed_at is not null
    left join public.price_alert_prefs pr on pr.user_id = g.user_id
    join public.versions v on v.id = q.version_id
    where g.version_id = q.version_id and g.created_at < q.created_at and coalesce(pr.enabled, true)
      and v.price > 0 and v.price < q.old_price
      and not exists (select 1 from public.price_alert_sent s where s.queue_id = q.id and s.user_id = g.user_id));
  return n;
end $$;
revoke all on function public.price_alert_done(jsonb) from public, anon, authenticated;
grant execute on function public.price_alert_done(jsonb) to service_role;

-- link "desligar avisos" do e-mail: funciona sem login, só com o código daquela pessoa
create or replace function public.disable_price_alerts(p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.price_alert_prefs set enabled = false, updated_at = now() where token = p_token;
  return found;
end $$;
revoke all on function public.disable_price_alerts(uuid) from public;
grant execute on function public.disable_price_alerts(uuid) to anon, authenticated;
