-- Desfaz fotos_por_ano: as fotos voltam a ser guardadas pelo id do modelo.
-- O site oficial ainda estava na versão que procura a foto pelo modelo, e a maioria das fotos sumiu.
-- O site novo também mostra as fotos guardadas assim, então este é o estado que funciona com as duas versões.

-- 1) se já existe foto em uso pela chave do modelo, a do ano sai de uso
with ren as (
  select m.id, regexp_replace(m.owner_id, '_(19|20)[0-9]{2}$', '') as mid
  from public.media m
  where m.kind = 'model_photo' and m.owner_id ~ '_(19|20)[0-9]{2}$'
)
update public.media m set is_current = false
from ren r
where m.id = r.id and m.is_current
  and exists (select 1 from public.media n where n.kind = 'model_photo' and n.is_current and n.owner_id = r.mid);

-- 2) as demais voltam para a chave do modelo
with ren as (
  select m.id, regexp_replace(m.owner_id, '_(19|20)[0-9]{2}$', '') as mid
  from public.media m
  where m.kind = 'model_photo' and m.owner_id ~ '_(19|20)[0-9]{2}$'
)
update public.media m set owner_id = r.mid
from ren r
where m.id = r.id;
