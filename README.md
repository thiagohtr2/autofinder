# Autokan (repositório: autofinder)

Site para descobrir **todos os carros 0 km vendidos no Brasil que cabem no seu bolso**.
Você gira a roleta de preço e vê os carros daquela faixa, rankeados pelas curtidas das pessoas.

> Antes se chamava "giroauto". O nome definitivo é Autokan (https://autokan.com.br).

## O que tem aqui

| Pasta | O que é |
|---|---|
| `public/` | O site, sem build: `index.html` e `supabase-adapter.js`, que liga o site ao Supabase. É o que a Netlify publica. |
| `data/` | Cópia completa do banco de dados original, exportada em 05/11/2026: 53 marcas, 327 modelos, 831 versões, alertas, notícias, fontes, radar de lançamentos e o mapa das fotos e logos. Serviu para carregar o Supabase. |
| `tools/pipeline/` | Scripts e lotes de pesquisa usados para montar o banco original no Claude (`build.py` monta, `sync.py` compara e envia). |
| `supabase/` | Esquema do banco no Supabase e função de importação. |
| `netlify/` | Páginas próprias de cada carro, marca e lista, para o Google (veja abaixo). |

### Páginas para o Google (`netlify/`)

A roleta (`public/index.html`) monta tudo no navegador, então o Google quase não a enxerga. Por isso cada carro, marca e lista tem uma página própria, montada no servidor pela função `netlify/functions/paginas.mjs` a partir do Supabase:

- `/carros`: todas as marcas, com atalhos por preço, tipo e combustível.
- `/carros/<marca>` e `/carros/<marca>/<modelo>`: por exemplo, `/carros/chevrolet/tracker`.
- `/carros-ate-<N>-mil`, `/carros-acima-de-500-mil`, `/suvs`, `/picapes` (e outros tipos), `/carros-eletricos`, `/carros-hibridos`, `/carros-diesel`.
- `/comparar`: escolher o primeiro carro para comparar; `/comparar/<modelo>-vs-<modelo>` (até 4 carros, com `?versoes=` para escolher a versão de cada um) e `/comparar/<modelo>` para escolher o outro carro (busca no topo e cards dos carros sugeridos, 10 de cada vez, aparecendo mais ao descer; `/comparar` faz o mesmo para escolher o primeiro carro). A comparação é neutra: mostra os dados lado a lado e aponta só fatos (menor preço, maior potência).
- `/noticias`: feed com o resumo das notícias (por carro, de mercado do radar e recalls), com link para a fonte e filtros por assunto, marca, tipo, período e busca. O público lê do radar só as colunas de notícia (migração `20261106200000_feed_noticias.sql`); as marcadas como "Ignorar" no painel não aparecem.
- `/sitemap.xml`: a lista de todas essas páginas para o Google (inclui as comparações de cada carro com os 3 mais parecidos).

**Minha garagem:** na ficha do carro, "Salvar na garagem" guarda a versão na tabela `garage` do Supabase (privada: cada pessoa vê só a sua; migração `20261106180000_minha_garagem.sql`). A garagem tem página própria, `/garagem` (a mesma página da roleta, que abre a garagem por cima; a Netlify serve `index.html` nesse endereço): os cards da roleta, todos como selecionados, organizados por tipo, preço ou ponto forte, com uma linha entre os grupos. Dali dá para marcar de 2 a 4 carros e abrir a comparação.

As páginas seguem as regras do site: só versões à venda entram nas listas, e marcas e modelos tirados do site no painel Banco de dados somem das páginas. Os pontos fortes usam as mesmas regras, copiadas em `netlify/lib/pontos-fortes.mjs`; se mudar uma regra em `index.html`, copie de novo. A Netlify guarda cada página pronta por 1 hora, então mudanças no banco aparecem em até 1 hora. Na roleta, `/?carro=<modelo>` leva até o carro e abre a ficha.

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
- **Conta**: os botões Entrar e Cadastrar ficam no topo do site. Quem entra pode curtir e comentar. O cadastro depende de duas configurações do Supabase (veja `supabase/README.md`).
- **Administrador**: vê também Banco, Radar e Imagens.

## Próximos passos

1. **Recuperação de senha** para quem esquecer a sua.
2. **Pesquisa e radar**: os scripts de `tools/pipeline/` ainda gravam no banco original do Claude e precisam passar a gravar no Supabase.
3. **Domínio** definitivo, quando o nome for escolhido.
