-- Feed de notícias (/noticias): o público passa a ler as notícias de mercado do radar,
-- mas só as colunas de notícia (título, resumo, tipo, marca, modelo, fonte, link e data).
-- Os dados e as ações de "adicionar ao site" (add_payload, status, applied_*, raw...) continuam só para o admin,
-- e as notícias marcadas como "Ignorar" no painel não aparecem para o público.
revoke all on public.radar_items from anon;
grant select (id, title, summary, kind, brand, model, model_id, date, source, url, created_at) on public.radar_items to anon;
create policy "leitura publica das noticias do radar" on public.radar_items for select to anon
  using (coalesce(status, 'novo') <> 'ignorado' and url is not null);
