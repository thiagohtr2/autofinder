# Formato de lote do giroauto (schema v1)
Arquivo JSON = array de modelos:
[{"marca":"Nissan","modelo":"Kicks","carroceria":"SUV|Hatch|Sedã|Picape|Esportivo|Minivan|Perua|Van","ano_modelo":2027,
  "versoes":[{"versao":"Sense 1.0 Turbo CVT","ano_modelo":2027,"status":"on_sale|announced|pre_order",
     "preco_reais":159990 | null,"tipo":"sugerido|FIPE|null","preco_promocional":null,
     "motor":"1.0 turbo 125 cv","cambio":"CVT","combustivel":"flex|gasolina|diesel|etanol|elétrico|híbrido|híbrido leve|híbrido plug-in",
     "nacional":true|false|null,"fabricado_em":"Brasil|México|China|...|null",
     "pontos_fortes":[2-4 de: eletrico, hibrido, potente, economico, turbo, x4, diesel, espaco, tech],
     "fonte_nome":"...","fonte_url":"https://...","consultado_em":"2026-11-03","observacao":"conflitos/dúvidas ou null"}]}]
Regras: nunca inventar; campo desconhecido = null; versões em ordem crescente de preço; preço de tabela cheio (não oferta/PCD/CNPJ);
preferir site oficial > notícia de lançamento com lista de versões > FIPE 0 km (marcar tipo "FIPE"). Registre conflitos em "observacao".
Inclua só o que é vendido oficialmente como 0 km no Brasil em nov/2026 (ou anunciado/pré-venda, marcando status).
