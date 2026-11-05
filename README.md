# giroauto (repositório: autofinder)

Site para descobrir **todos os carros 0 km vendidos no Brasil que cabem no seu bolso**.
Você gira a roleta de preço e vê os carros daquela faixa, rankeados pelas curtidas das pessoas.

> O nome "giroauto" é provisório. A marca definitiva ainda está em escolha.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `public/` | O site (um único `index.html`, sem build). É o que a Netlify publica. |
| `data/` | Cópia completa do banco de dados atual, exportada em 05/11/2026: 53 marcas, 327 modelos, 831 versões, alertas, notícias, fontes, radar de lançamentos e o mapa das fotos e logos. Vai servir para carregar o Supabase. |
| `tools/pipeline/` | Scripts e lotes de pesquisa usados para montar o banco (`build.py` monta, `sync.py` compara e envia). |
| `supabase/` | Esquema do banco no Supabase (próxima etapa). |

### Arquivos de `data/`

Cada arquivo é um objeto `{ id: documento }`.

- `brands.json`: marcas (nome, grupo, país, lista de modelos).
- `models.json`: modelos (marca, carroceria, faixa de preço, versões).
- `versions.json`: versões completas (preço, motor, potência, câmbio, tração, pontos fortes, fonte, histórico de preço).
- `catalog.json`: resumo por marca usado pela roleta (uma linha por versão).
- `sources.json`: de onde veio cada preço ou dado.
- `alerts.json`: recalls, defeitos e alertas da mídia por modelo.
- `news.json`: notícias por modelo.
- `radar.json` e `radar_runs.json`: novidades encontradas pelo radar de lançamentos e o histórico de cada varredura.
- `photos.json` e `logos.json`: qual imagem pertence a qual modelo ou marca (ids dos arquivos no armazenamento atual; as imagens serão copiadas para o Supabase Storage).
- `meta.json`: grupos do banco de imagens, registro de atualização de notícias e afins.

Curtidas e comentários de usuários **não** estão neste repositório (são dados pessoais). Eles serão migrados direto para o Supabase.

## Situação atual

O `public/index.html` ainda é a versão que roda dentro do Claude, onde banco de dados, login e fotos vêm do próprio Claude. Publicado na Netlify do jeito que está, ele abre, mas sem dados.

## Próximos passos

1. **Supabase**: criar o projeto, as tabelas (`brands`, `models`, `versions`, `votes`, `comments`, `alerts`, `news`, `radar`…), as regras de acesso (RLS) e o Storage para fotos e logos.
2. **Carregar os dados** de `data/` no Supabase e copiar as imagens.
3. **Trocar a camada de dados do site** para o Supabase (leitura pública do catálogo; curtidas e comentários com login; painel de administrador só para o dono).
4. **Netlify**: ligar este repositório, com a pasta de publicação `public/`.
5. **Domínio** definitivo, quando o nome for escolhido.
