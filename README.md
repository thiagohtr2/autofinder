# giroauto (repositório: autofinder)

Site para descobrir **todos os carros 0 km vendidos no Brasil que cabem no seu bolso**.
Você gira a roleta de preço e vê os carros daquela faixa, rankeados pelas curtidas das pessoas.

> O nome "giroauto" é provisório. A marca definitiva ainda está em escolha.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `public/` | O site, sem build: `index.html` e `supabase-adapter.js`, que liga o site ao Supabase. É o que a Netlify publica. |
| `data/` | Cópia completa do banco de dados original, exportada em 05/11/2026: 53 marcas, 327 modelos, 831 versões, alertas, notícias, fontes, radar de lançamentos e o mapa das fotos e logos. Serviu para carregar o Supabase. |
| `tools/pipeline/` | Scripts e lotes de pesquisa usados para montar o banco original no Claude (`build.py` monta, `sync.py` compara e envia). |
| `supabase/` | Esquema do banco no Supabase e função de importação. |

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

Curtidas e comentários de usuários **não** estão neste repositório (são dados pessoais). Eles foram migrados direto para o Supabase.

## Situação atual

O site publicado na Netlify lê e grava no Supabase. O `public/index.html` continua falando com um banco de documentos, e o `public/supabase-adapter.js` traduz cada chamada para as tabelas do Supabase.

- **Visitante**: vê o catálogo, as fotos, as notícias e os alertas.
- **Conta**: quem entra pode curtir e comentar. Não há tela de cadastro; a conta é criada no painel do Supabase (veja `supabase/README.md`).
- **Administrador**: vê também Banco, Radar e Imagens.

## Próximos passos

1. **Cadastro público** de usuários, com recuperação de senha.
2. **Pesquisa e radar**: os scripts de `tools/pipeline/` ainda gravam no banco original do Claude e precisam passar a gravar no Supabase.
3. **Domínio** definitivo, quando o nome for escolhido.
