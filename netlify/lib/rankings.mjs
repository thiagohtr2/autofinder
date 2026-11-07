/* Autokan: listas pela ficha técnica (para quem procura no Google "carro mais econômico", "SUV com maior
   porta-malas", "elétrico com maior autonomia", "carro de 7 lugares"). Cada lista ordena as versões à venda por um
   número com fonte, a mesma regra para todos os carros, e mostra a fonte de cada linha. Uma linha por modelo
   (a versão com o melhor número daquele modelo). Não é avaliação: o Autokan não indica qual carro é melhor. */
import { SITE, imagem } from "./base.mjs";
import { pagina, trilha, ldTrilha, INICIO, CARROS, esc, reais, mesAno, SETA, fotoTag } from "./paginas.mjs";

const dec = (n, c = 1) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: c });
const dado = (v, g, c) => { const d = v.specs?.[g]?.[c]; return d && typeof d.v === "number" && d.v > 0 ? d : null; };
const LIMITE = 30;

/* versões com 7 lugares ou mais: pela ficha técnica ou pelo nome oficial da versão ("7 lugares", sem "5 ou 7") */
export function lugares(v) {
  const d = dado(v, "capacidades", "ocupantes");
  if (d) return { n: d.v, s: d.s };
  const m = /\b([789])\s*lugares\b/i.exec(v.nome || "");
  if (m && !/\b\d\s*ou\s*\d\s*lugares\b/i.test(v.nome)) return { n: +m[1], s: null };
  return null;
}

const ECO = {
  grupo: "economia",
  valor(v) {
    const c = dado(v, "consumo", "gasolina_cidade_kml"); if (!c) return null;
    const e = dado(v, "consumo", "gasolina_estrada_kml");
    return { n: c.v, n2: e ? e.v : 0, t: `${dec(c.v)} km/l`, sub: `na cidade${e ? ` · ${dec(e.v)} km/l na estrada` : ""}`, s: c.s };
  },
  ordem: (a, b) => b.x.n - a.x.n || b.x.n2 - a.x.n2,
  ordemTxt: "do que gasta menos gasolina na cidade para o que gasta mais, pelo Inmetro",
  criterio: "consumo com gasolina na cidade medido pelo Inmetro (Programa Brasileiro de Etiquetagem Veicular), do maior número de km por litro para o menor; no empate, conta o consumo na estrada",
  nota: "Consumo do Inmetro com gasolina, no ciclo de testes padronizado (ABNT NBR 7024), tirado da tabela do Inmetro ou da ficha da montadora que publica essa medição. Carros flex também têm o consumo com etanol na ficha. Elétricos e versões sem medição do Inmetro não entram. O consumo no dia a dia muda com o jeito de dirigir, o trânsito e a manutenção.",
};
const economicos = (teto) => ({
  ...ECO, slug: teto ? `carros-mais-economicos-ate-${teto / 1000}-mil` : "carros-mais-economicos", teto,
  curto: teto ? `Até ${teto / 1000} mil` : "Todos os preços",
  nome: teto ? `Carros mais econômicos até R$ ${teto / 1000} mil` : "Carros mais econômicos",
  h1: (ano) => teto ? `Carros mais econômicos até R$ ${teto / 1000} mil em ${ano}` : `Carros mais econômicos de ${ano}`,
  desc: (n, top) => `${n} carros 0 km${teto ? ` até R$ ${teto / 1000} mil` : ""} com o menor consumo de gasolina na cidade, pelo Inmetro.${top ? ` O primeiro da lista é o ${top}.` : ""} Veja km/l na cidade e na estrada, preço e fonte.`,
});

export const RANKINGS = [
  economicos(0), economicos(100000), economicos(150000), economicos(200000),
  {
    grupo: "porta-malas", slug: "suvs-com-maior-porta-malas", curto: "SUVs com maior porta-malas", nome: "SUVs com maior porta-malas",
    h1: (ano) => `SUVs com maior porta-malas em ${ano}`,
    desc: (n, top) => `${n} SUVs 0 km com o maior porta-malas, em litros, pela ficha técnica de cada montadora.${top ? ` O primeiro da lista é o ${top}.` : ""} Veja preço e fonte de cada um.`,
    filtro: (m, v) => v.carroc === "SUV",
    valor(v) { const d = dado(v, "capacidades", "porta_malas_l"); if (!d) return null; const l = lugares(v); return { n: d.v, t: `${dec(d.v, 0)} litros`, sub: l ? `${l.n} lugares` : "", s: d.s }; },
    ordem: (a, b) => b.x.n - a.x.n,
    ordemTxt: "do maior porta-malas para o menor, em litros, pela ficha técnica",
    criterio: "volume do porta-malas informado na ficha técnica, do maior para o menor",
    nota: "Cada montadora mede o porta-malas de um jeito: pela norma VDA, até a altura dos vidros, até o teto, ou com a terceira fileira de bancos rebatida. Por isso os números nem sempre são comparáveis entre marcas; a forma de medir está na fonte de cada linha. Versões sem o volume na ficha não entram.",
  },
  {
    grupo: "autonomia", slug: "carros-eletricos-com-maior-autonomia", curto: "Elétricos com maior autonomia", nome: "Carros elétricos com maior autonomia",
    h1: (ano) => `Carros elétricos com maior autonomia em ${ano}`,
    desc: (n, top) => `${n} carros elétricos 0 km com a maior autonomia medida pelo Inmetro, em km.${top ? ` O primeiro da lista é o ${top}.` : ""} Veja preço e fonte de cada um.`,
    filtro: (m, v) => v.comb === "Elétrico",
    valor(v) { const d = dado(v, "autonomia", "eletrica_inmetro_km"); return d ? { n: d.v, t: `${dec(d.v, 0)} km`, sub: "autonomia no Inmetro", s: d.s } : null; },
    ordem: (a, b) => b.x.n - a.x.n,
    ordemTxt: "da maior autonomia para a menor, pelo Inmetro",
    criterio: "autonomia medida pelo Inmetro (Programa Brasileiro de Etiquetagem Veicular), da maior para a menor",
    nota: "Autonomia do Inmetro, no ciclo de testes padronizado brasileiro, que costuma dar números menores que os ciclos WLTP e NEDC divulgados por algumas montadoras. Só carros 100% elétricos; híbridos plug-in não entram. A autonomia real muda com a velocidade, o clima, o ar-condicionado e o jeito de dirigir.",
  },
  {
    grupo: "lugares", slug: "carros-7-lugares", curto: "Carros de 7 lugares", nome: "Carros de 7 lugares",
    h1: (ano) => `Carros de 7 lugares em ${ano}: do mais barato ao mais caro`,
    desc: (n, top) => `${n} carros 0 km de 7 ou 8 lugares à venda no Brasil, do mais barato ao mais caro.${top ? ` O mais barato é o ${top}.` : ""} Veja o preço de cada versão e a fonte.`,
    filtro: (m, v) => v.preco > 0 && v.carroc !== "Van",
    valor(v) { const l = lugares(v); return l && l.n >= 7 && l.n <= 9 ? { n: l.n, t: reais(v.preco), sub: `${l.n} lugares${v.fipe ? " · FIPE 0 km" : ""}`, s: l.s, fonte: l.s ? null : v.fonte, preco: true } : null; },
    ordem: (a, b) => a.v.preco - b.v.preco,
    ordemTxt: "do mais barato ao mais caro", linhaTxt: "Uma linha por modelo, com a versão de 7 lugares mais barata.",
    criterio: "preço de tabela da versão mais barata com 7 ou 8 lugares de cada modelo, do menor para o maior",
    nota: "Entram as versões com 7 ou 8 lugares pela ficha técnica ou pelo nome oficial da versão. Vans de passageiros, versões que oferecem 5 ou 7 lugares como opcional e versões sem esse dado não entram.",
  },
];
export const RANKING = new Map(RANKINGS.map((r) => [r.slug, r]));
export const GRUPOS_RANKING = [["economia", "Mais econômicos"], ["porta-malas", "SUVs com maior porta-malas"], ["autonomia", "Elétricos com maior autonomia"], ["lugares", "Carros de 7 lugares"]];

/* as linhas de uma lista: a melhor versão de cada modelo, na ordem da regra */
export function linhasRanking(base, r) {
  const porModelo = [];
  for (const m of base.aVenda) {
    const cands = m.versoes.filter((v) => (!r.teto || (v.preco > 0 && v.preco <= r.teto)) && (!r.filtro || r.filtro(m, v)))
      .map((v) => ({ m, v, x: r.valor(v) })).filter((c) => c.x)
      .sort((a, b) => r.ordem(a, b) || (a.v.preco || Infinity) - (b.v.preco || Infinity));
    if (cands.length) porModelo.push(cands[0]);
  }
  return porModelo.sort((a, b) => r.ordem(a, b) || (a.v.preco || Infinity) - (b.v.preco || Infinity) || a.m.titulo.localeCompare(b.m.titulo, "pt-BR"));
}

export const CSS_RANK = `
.rk{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:rk}
.rk>li{display:grid;grid-template-columns:34px 112px minmax(0,1fr) auto;align-items:center;gap:14px;padding:12px 16px 12px 12px;border:1px solid var(--line);border-radius:16px;background:#fff}
.rk-n{font:800 18px var(--display);color:var(--muted);text-align:center}
.rk-ph{position:relative;display:block;width:112px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:var(--panel)}
.rk-ph .ilus{right:3px;top:3px;bottom:auto;font-size:7px;letter-spacing:.04em;padding:1px 4px;border-radius:4px}
.rk-ph img{width:100%;height:100%;object-fit:cover;display:block}
.rk-tx{min-width:0;display:flex;flex-direction:column;gap:2px}
.rk-mk{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.rk-tx a{font-weight:800;font-size:16px;color:var(--ink);text-decoration:none}
.rk-tx a:hover{color:var(--accent-ink);text-decoration:underline}
.rk-vs{font-size:13.5px;color:#3b4352}
.rk-pr{font-size:13.5px;font-weight:700;color:var(--ink)}
.rk-x{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.rk-x b{font:800 20px var(--display);color:var(--ink);white-space:nowrap}
.rk-x small{font-size:12px;color:var(--muted)}
.rk-x .rk-f{font-size:12px;font-weight:700;text-decoration:none}
.rk-crit{background:var(--panel);border-radius:14px;padding:12px 14px;font-size:14px;color:#2a3140;max-width:80ch}
@media (max-width:640px){.rk>li{grid-template-columns:26px 84px minmax(0,1fr);gap:10px;padding:10px 12px 10px 8px}.rk-n{font-size:16px}.rk-ph{width:84px}.rk-x{grid-column:3;align-items:flex-start;text-align:left}.rk-x b{font-size:17px}.rk-tx a{font-size:15px}}
`.replace(/\n\s*/g, "");

const fonteLink = (fontes, s, obj) => {
  const f = s ? fontes.get(s) : obj;
  if (!f || !f.url) return "";
  const nome = /inmetro|pbev/i.test(s) ? "Inmetro" : f.nome ? f.nome.split(/[,:—–(]/)[0].trim().slice(0, 40) : "fonte";
  return `<a class="rk-f" href="${esc(f.url)}" target="_blank" rel="noopener nofollow">Fonte: ${esc(nome)}${SETA}</a>`;
};

/* chips para trocar de lista (e de faixa de preço, na de econômicos) */
export function chipsRanking(base, atual) {
  const grupos = GRUPOS_RANKING.map(([g, rot]) => {
    const r = RANKINGS.find((x) => x.grupo === g);
    return `<li><a href="/${r.slug}"${atual && atual.grupo === g ? ' aria-current="page"' : ""}>${esc(rot)}</a></li>`;
  }).join("");
  return `<ul class="chips">${grupos}</ul>`;
}

export function paginaRanking(base, r) {
  const todas = linhasRanking(base, r), linhas = todas.slice(0, LIMITE), n = linhas.length, total = todas.length, ano = base.anoLinha;
  const caminho = `/${r.slug}`, h1 = r.h1(ano);
  const itens = [INICIO, CARROS, { nome: r.nome, url: caminho }];
  const top = linhas[0] ? `${linhas[0].m.titulo} ${linhas[0].v.nome}`.trim() : "";
  const faixas = r.grupo === "economia"
    ? `<ul class="chips" aria-label="Faixa de preço">${RANKINGS.filter((x) => x.grupo === "economia").map((x) => `<li><a href="/${x.slug}"${x.slug === r.slug ? ' aria-current="page"' : ""}>${esc(x.curto)}</a></li>`).join("")}</ul>` : "";
  const lead = n
    ? `${total === 1 ? "Um modelo" : `${total} modelos`} 0 km à venda${r.teto ? ` com versão até ${reais(r.teto)}` : ""} ${total === 1 ? "tem" : "têm"} esse dado com fonte. ${n < total ? `Aqui estão os ${n} primeiros` : total === 1 ? "Aqui está ele" : "Aqui estão todos"}, ${r.ordemTxt}. ${r.linhaTxt || "Uma linha por modelo, com a versão que tem o melhor número."}`
    : "Ainda não há carros com esse dado confirmado por fonte.";
  const lis = linhas.map(({ m, v, x }, i) => {
    const preco = v.preco ? reais(v.preco) : "preço não divulgado";
    return `<li><span class="rk-n">${i + 1}</span><a class="rk-ph" href="${m.url}" tabindex="-1" aria-hidden="true">${fotoTag(m, 224, "112px") || ""}${m.foto ? '<span class="ilus">Ilustrativa</span>' : ""}</a>
<span class="rk-tx"><span class="rk-mk">${esc(m.marca)}</span><a href="${m.url}">${esc(m.nome)}</a><span class="rk-vs">${esc(v.nome || "")}</span>${x.preco ? "" : `<span class="rk-pr">${preco}</span>`}</span>
<span class="rk-x"><b>${esc(x.t)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}${fonteLink(base.fontes, x.s, x.fonte)}</span></li>`;
  }).join("");
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>${esc(h1)}</h1><p class="lead">${esc(lead)}</p>${faixas}${chipsRanking(base, r)}</div>
<section class="sec" aria-label="${esc(r.nome)}">
<p class="rk-crit"><strong>Como a lista é feita:</strong> ${esc(r.criterio)}. A mesma regra vale para todos os carros, e cada linha tem a fonte do número. Não é avaliação nem recomendação: o Autokan mostra os dados e a escolha é sua.</p>
${n ? `<ol class="rk" style="margin-top:14px">${lis}</ol>` : ""}
<p class="nota">${esc(r.nota)} Preço de tabela sugerido pela montadora ou FIPE 0 km${base.mesPrecos ? ` em ${mesAno(base.mesPrecos)}` : ""}; confirme com a concessionária. Viu algo errado? <a href="/contato?assunto=erro&amp;pagina=${encodeURIComponent(caminho)}" rel="nofollow">Avise a gente</a>.</p></section>`;
  const ld = { "@context": "https://schema.org", "@type": "ItemList", name: h1, numberOfItems: n,
    itemListElement: linhas.map(({ m, v }, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + m.url, name: `${m.titulo} ${v.nome || ""}`.trim() })) };
  const primeiro = linhas.find((l) => l.m.foto);
  return pagina({ titulo: `${h1} | Autokan`, descricao: r.desc(n, top), caminho, indexar: n >= 3, ld: [ldTrilha(itens), ld], corpo, css: CSS_RANK,
    imagemOg: primeiro ? SITE + imagem(primeiro.m.foto, 800, "&fm=png") : null, imagemAlt: h1 });
}
