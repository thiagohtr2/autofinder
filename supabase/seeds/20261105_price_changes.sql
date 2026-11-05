-- Carga inicial de public.price_changes, feita em 05/11/2026.
-- Só entram valores com fonte, válidos para o consumidor comum e ligados a uma versão específica.
-- Ficam de fora ofertas só para PCD, CNPJ ou taxistas, ofertas que exigem usado na troca,
-- anúncios de concessionárias, campanhas já encerradas e casos sem valor antigo documentado.

-- Ofertas já registradas no campo de promoção das versões (price_promo numérico, price = tabela)
insert into public.price_changes (version_id, old_price, new_price, change_type, reason, source_name, source_url, reported_on)
select v.id, v.price, v.price_promo::integer, 'promocional',
       'Preço promocional registrado no giroauto a partir desta fonte. Data de término não registrada.',
       s.name, s.url, s.consulted_at
from public.versions v
join public.sources s on s.id = v.price_source_id
where v.price_promo ~ '^\d+$' and v.price_promo::integer < v.price and s.url ~ '^https?://'
on conflict (version_id, source_url) do nothing;

-- Casos conferidos na matéria original
insert into public.price_changes (version_id, old_price, new_price, change_type, starts_on, ends_on, reason, source_name, source_url, reported_on) values
('mg-s5-comfort', 218800, 179800, 'promocional', null, '2026-11-30',
 'Oferta da MG para a versão de entrada, já na linha 2027, com desconto de R$ 39 mil.',
 'Notícias Automotivas', 'https://www.noticiasautomotivas.com.br/mg-corta-r-39-mil-do-s5-eletrico-e-coloca-suv-de-205-cv-perto-dos-compactos-a-combustao-agora-ele-custa-r-190-menos-que-o-nissan-kicks/', '2026-11-05'),
('mg-s5-luxury', 238800, 219800, 'promocional', null, '2026-11-30',
 'Oferta da MG com redução de R$ 19 mil. A fonte informa a redução e o preço novo; o valor antigo foi calculado a partir deles.',
 'Notícias Automotivas', 'https://www.noticiasautomotivas.com.br/mg-corta-r-39-mil-do-s5-eletrico-e-coloca-suv-de-205-cv-perto-dos-compactos-a-combustao-agora-ele-custa-r-190-menos-que-o-nissan-kicks/', '2026-11-05'),
('corolla', 169990, 159990, 'promocional', null, null,
 'Nova rodada de cortes da Toyota em novembro. O valor antigo é o da campanha de outubro; a tabela cadastrada no giroauto era de R$ 178.990. Data de término não informada.',
 'Notícias Automotivas', 'https://www.noticiasautomotivas.com.br/toyota-volta-a-mexer-nos-precos-de-corolla-corolla-cross-e-sw4-no-brasil-e-seda-fica-r-10-mil-abaixo-do-suv-com-o-mesmo-motor/', '2026-11-05'),
('corollacross', 174990, 169990, 'promocional', null, null,
 'Nova rodada de cortes da Toyota em novembro. O valor antigo é o da campanha de outubro; a tabela cadastrada no giroauto era de R$ 194.790. Data de término não informada.',
 'Notícias Automotivas', 'https://www.noticiasautomotivas.com.br/toyota-volta-a-mexer-nos-precos-de-corolla-corolla-cross-e-sw4-no-brasil-e-seda-fica-r-10-mil-abaixo-do-suv-com-o-mesmo-motor/', '2026-11-05'),
('toyota-hilux-sw4-srx-platinum-5-lugares-2-8-turbo-diesel-4x4-at', 369990, 359990, 'promocional', null, null,
 'Nova rodada de cortes da Toyota em novembro. O valor antigo é o da campanha de outubro; a tabela cadastrada no giroauto era de R$ 417.590. Data de término não informada.',
 'Notícias Automotivas', 'https://www.noticiasautomotivas.com.br/toyota-volta-a-mexer-nos-precos-de-corolla-corolla-cross-e-sw4-no-brasil-e-seda-fica-r-10-mil-abaixo-do-suv-com-o-mesmo-motor/', '2026-11-05'),
('ford-territory-titanium-1-5-ecoboost', 219900, 194900, 'definitivo', '2026-10-02', null,
 'A Ford reposicionou o Territory e cortou R$ 25 mil da tabela, sem mudança mecânica.',
 'Garagem360', 'https://garagem360.com.br/territory-corta-r-25-mil-cai-a-r-194-900-e-volta-para-faixa-abaixo-de-r-200-mil/', '2026-10-10'),
('renault-boreal-iconic-1-3-tce-edc', 219990, 214990, 'definitivo', null, null,
 'A Renault reduziu em R$ 5 mil a tabela da versão Iconic em outubro.',
 'Auto+ TV', 'https://www.automaistv.com.br/vendas-e-precos/renault-boreal-precos-hibrido-4x4-2027/', '2026-10-15'),
('renault-boreal-techno-1-3-tce-edc', 204990, 201990, 'definitivo', null, null,
 'A Renault reduziu em R$ 3 mil a tabela da versão Techno em outubro.',
 'Auto+ TV', 'https://www.automaistv.com.br/vendas-e-precos/renault-boreal-precos-hibrido-4x4-2027/', '2026-10-15'),
('chevrolet-equinox-activ-1-5-turbo-awd', 291290, 296090, 'definitivo', null, null,
 'A Chevrolet reajustou em R$ 4.800 a tabela do Equinox em outubro.',
 'Auto+ TV', 'https://www.automaistv.com.br/vendas-e-precos/chevrolet-aumenta-precos-oito-carros-brasil/', '2026-10-22'),
('chevrolet-equinox-rs-1-5-turbo-awd', 291290, 296090, 'definitivo', null, null,
 'A Chevrolet reajustou em R$ 4.800 a tabela do Equinox em outubro.',
 'Auto+ TV', 'https://www.automaistv.com.br/vendas-e-precos/chevrolet-aumenta-precos-oito-carros-brasil/', '2026-10-22')
on conflict (version_id, source_url) do nothing;
