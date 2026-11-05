-- Fotos por carro: modelo + ano-modelo.
--
-- Até aqui cada modelo tinha uma foto só, guardada pelo id do modelo (ex.: jeep-compass). O site
-- passa a guardar uma foto por carro (ex.: jeep-compass_2027), para a foto da linha nova de um
-- modelo nunca substituir a do ano anterior.
--
-- A foto antiga de cada modelo vira a do ano mais novo que ele tinha à venda quando ela foi enviada:
-- é o ano que o prompt pediu ao ChatGPT. Modelos sem ano informado continuam com a chave do modelo,
-- que é a chave do carro deles.
--
-- RODAR SÓ DEPOIS DE PUBLICAR o site que lê as fotos por ano. Antes disso, o site no ar procura a
-- foto pelo id do modelo e ficaria sem fotos.

-- 1) se o carro já ganhou foto própria pelo site novo, a antiga deixa de ser a foto em uso
with legado as (
  select m.id, m.owner_id || '_' || (
    select max(v.model_year) from public.versions v
    where v.model_id = m.owner_id and v.status = 'on_sale' and v.catalog_row is not null
      and v.created_at <= greatest(coalesce(m.uploaded_at, m.created_at), (select min(created_at) from public.versions))
  ) as chave
  from public.media m
  where m.kind = 'model_photo' and m.owner_id !~ '_(19|20)[0-9]{2}$'
)
update public.media m set is_current = false
from legado l
where m.id = l.id and l.chave is not null and m.is_current
  and exists (select 1 from public.media n where n.kind = 'model_photo' and n.is_current and n.owner_id = l.chave);

-- 2) as demais passam a ser a foto do carro daquele ano
with legado as (
  select m.id, m.owner_id || '_' || (
    select max(v.model_year) from public.versions v
    where v.model_id = m.owner_id and v.status = 'on_sale' and v.catalog_row is not null
      and v.created_at <= greatest(coalesce(m.uploaded_at, m.created_at), (select min(created_at) from public.versions))
  ) as chave
  from public.media m
  where m.kind = 'model_photo' and m.owner_id !~ '_(19|20)[0-9]{2}$'
)
update public.media m set owner_id = l.chave
from legado l
where m.id = l.id and l.chave is not null;
