# Auditoria da base automotiva — novembro de 2026

Registro do que ficou pendente ou divergente na atualização das fichas técnicas (o relatório completo foi entregue à parte).

- `resumo-por-grupo.json` — por grupo de marcas: versões, versões com dado, dados, fontes (por tipo), pendências e divergências.
- `pendencias.json` — cada dado que não foi possível confirmar (versão, campo e motivo). Campo sem fonte confirmada ficou vazio no site.
- `divergencias.json` — diferenças entre o cadastro e a fonte oficial (potência, combustível, câmbio, nome, ano-modelo…).
- `pendencias-inmetro.json` — versões que não casaram com segurança com a Tabela PBEV 2026 do Inmetro.

Os dados em si estão no Supabase: `version_specs` (um dado por linha, com fonte, trecho, data e lote), `sources` (URL exata e data
da consulta) e `spec_change_log` (toda troca em colunas das versões, com valor antigo e novo). Cada lote pode ser desfeito com
`undo_spec_batch('<lote>')` sem apagar nada.
