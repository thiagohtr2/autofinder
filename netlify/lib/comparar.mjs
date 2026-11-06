/* Autokan: comparação lado a lado (de 2 a 4 carros) e as páginas que levam até ela.
   Neutra: mostra os dados de cada versão na mesma linha e aponta só fatos (o menor preço, a maior potência),
   sem dar nota nem eleger um vencedor. */
import { SITE, parecidos, imagem } from "./base.mjs";
import { pagina, esc, trilha, ldTrilha, cartao, fotoTag, reais, pl, mesAno, lista, ico, SETA, ROLETA, COMPARAR_ICO, COMB_FRASE, INICIO, urlPar } from "./paginas.mjs";

export const MAX_CARROS = 4;
const COMPARAR = { nome: "Comparar", url: "/comparar" };

const CSS = `
.cmp-wrap{position:relative;overflow-x:auto;margin:0 -16px;padding:0 16px 6px;-webkit-overflow-scrolling:touch}
.cmp{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:14px}
.cmp col{min-width:150px}
.cmp thead th{vertical-align:bottom;text-align:left;padding:0 10px 12px;font-weight:400}
.cmp-ph{display:block;max-width:320px;aspect-ratio:16/9;border-radius:14px;background:radial-gradient(120% 90% at 50% 100%,#eef2f8 0,#f7f9fc 60%,#fff 100%);display:grid;place-items:center;overflow:hidden;margin-bottom:10px}
.cmp-ph img{width:100%;height:100%;object-fit:contain}
.cmp-mk{display:block;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.cmp-nm{display:block;font-family:var(--display);font-weight:600;font-size:18px;letter-spacing:-.02em;line-height:1.2;color:var(--ink);text-decoration:none;margin:1px 0 8px}
.cmp-nm:hover{color:var(--accent-ink);text-decoration:underline}
.cmp select{width:100%;height:40px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:0 30px 0 10px;font:600 14px var(--body);color:var(--ink);-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%235d6577' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;background-size:14px}
.cmp tr.lb th{text-align:left;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding:14px 10px 6px;border-top:1px solid var(--line)}
.cmp td{vertical-align:top;padding:0 10px 4px}
.cmp td b.num{font-size:17px}
.cmp td small{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.cmp td .na{color:var(--faint)}
.cmp .fato{display:inline-block;margin-top:5px;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;background:#e8f6ee;color:#0d6b3c}
.cmp .selos{margin:0}
.cmp .selo{font-size:12px;padding:4px 9px 4px 6px}
.cmp a.fnt{font-size:12.5px;font-weight:700;text-decoration:none}
.cmp-ok{margin-top:12px}
.resumo{margin:14px 0 0;padding:16px 18px;border-radius:18px;background:var(--panel);max-width:78ch}
.resumo p{margin:0;color:#2a3140}
.resumo p+p{margin-top:8px}
@media (max-width:640px){.cmp-nm{font-size:16px}.cmp td b.num{font-size:15.5px}}
`.replace(/\n\s*/g, "");

/* ---------- endereços */

export const urlComparacao = (pares) => `/comparar/${pares.map(({ m }) => m.id).join("-vs-")}${pares.some(({ v }) => v) ? `?versoes=${pares.map(({ v }) => (v ? encodeURIComponent(v.id) : "")).join(",")}` : ""}`;

/* lê "/comparar/a-vs-b" e "?versoes=x,y" (ou v0, v1... do formulário sem JavaScript) */
export function lerComparacao(base, trecho, params) {
  const ids = trecho.split("-vs-").filter(Boolean);
  if (!ids.length || ids.length > MAX_CARROS) return null;
  const ms = ids.map((id) => base.modelos.get(id));
  if (ms.some((m) => !m || !m.aVenda || !m.marcaInfo)) return null;
  const pedidas = (params.get("versoes") || "").split(",");
  return ms.map((m, i) => {
    const vid = params.get(`v${i}`) || pedidas[i] || "";
    return { m, v: m.versoes.find((v) => v.id === vid) || null };
  });
}

/* ---------- comparação */

export function paginaComparacao(base, pares) {
  const cols = pares.map(({ m, v }) => ({ m, v: v || m.versoes[0] })); // sem versão escolhida: a de entrada de cada carro
  const n = cols.length, ms = cols.map((c) => c.m);
  const repetido = new Set(ms.map((m) => m.id)).size < n;
  const canon = n === 2 && !repetido ? urlPar(ms[0], ms[1]) : `/comparar/${ms.map((m) => m.id).join("-vs-")}`;
  const nomes = ms.map((m) => m.titulo);
  // títulos e descrições no tamanho que o Google mostra: usa a versão mais completa que couber
  const cabe = (opcoes, max) => opcoes.find((t) => t.length <= max) || opcoes[opcoes.length - 1];
  const titulo = n === 2
    ? cabe([`${nomes[0]} x ${nomes[1]}: preço e versões lado a lado | Autokan`, `${nomes[0]} x ${nomes[1]}: preço e versões lado a lado`, `${nomes[0]} x ${nomes[1]}: comparação`, `${ms[0].nome} x ${ms[1].nome}: comparação | Autokan`], 70)
    : cabe([`${nomes.join(" x ")}: comparação | Autokan`, `${ms.map((m) => m.nome).join(" x ")}: comparação | Autokan`], 70);
  const desc = n === 2 && !repetido
    ? cabe([`Compare ${nomes[0]}${ms[0].precoMin ? ` (a partir de ${reais(ms[0].precoMin)})` : ""} e ${nomes[1]}${ms[1].precoMin ? ` (a partir de ${reais(ms[1].precoMin)})` : ""}: preço de cada versão, motor, potência, câmbio e pontos fortes, lado a lado.`,
        `Compare ${nomes[0]} e ${nomes[1]}: preço de cada versão, motor, potência, câmbio e pontos fortes, lado a lado.`,
        `${nomes[0]} x ${nomes[1]}: preço de cada versão, motor, potência e câmbio lado a lado.`], 165)
    : `Comparação lado a lado de ${lista(nomes)}: preço, motor, potência, câmbio e pontos fortes de cada versão.`;
  const itens = [INICIO, COMPARAR, { nome: n === 2 ? `${ms[0].nome} x ${ms[1].nome}` : nomes.map((x, i) => ms[i].nome).join(" x "), url: canon }];

  // fatos neutros: menor preço e maior potência entre as versões escolhidas (só quando há diferença)
  const precos = cols.map((c) => c.v.preco).filter(Boolean), cvs = cols.map((c) => c.v.cv).filter(Boolean);
  const menor = precos.length > 1 && new Set(precos).size > 1 ? Math.min(...precos) : null;
  const maior = cvs.length > 1 && new Set(cvs).size > 1 ? Math.max(...cvs) : null;

  const nome = (c) => `${c.m.nome}${c.v.nome ? ` ${c.v.nome}` : ""}`;
  const resumo = [];
  if (precos.length === n) {
    if (n === 2) { const d = Math.abs(cols[0].v.preco - cols[1].v.preco); resumo.push(`O ${nome(cols[0])} custa ${reais(cols[0].v.preco)} e o ${nome(cols[1])}, ${reais(cols[1].v.preco)}: ${d ? `diferença de ${reais(d)}` : "o mesmo preço"}.`); }
    else { const ord = [...cols].sort((a, b) => a.v.preco - b.v.preco); resumo.push(`Entre as versões escolhidas, a mais barata é o ${nome(ord[0])}, por ${reais(ord[0].v.preco)}, e a mais cara, o ${nome(ord[n - 1])}, por ${reais(ord[n - 1].v.preco)}.`); }
  }
  if (cvs.length === n) resumo.push(n === 2 ? `Em potência, o ${cols[0].m.nome} tem ${cols[0].v.cv} cv e o ${cols[1].m.nome}, ${cols[1].v.cv} cv.` : `Em potência, vão de ${Math.min(...cvs)} cv a ${Math.max(...cvs)} cv.`);
  const combs = cols.map((c) => COMB_FRASE[c.v.comb] || (c.v.comb || "").toLowerCase()), cambios = cols.map((c) => (c.v.cambio || "").toLowerCase());
  if (combs.every(Boolean) && cambios.every(Boolean)) {
    if (new Set(combs).size === 1 && new Set(cambios).size === 1) resumo.push(`${n === 2 ? "Os dois" : "Todos"} são ${combs[0]}, com câmbio ${cambios[0]}.`);
    else if (n === 2) resumo.push(`O ${cols[0].m.nome} é ${combs[0]}, com câmbio ${cambios[0]}; o ${cols[1].m.nome} é ${combs[1]}, com câmbio ${cambios[1]}.`);
  }

  const celula = (fn) => cols.map((c) => `<td>${fn(c) || '<span class="na">—</span>'}</td>`).join("");
  const linha = (rot, fn) => `<tr class="lb"><th colspan="${n}" scope="colgroup">${rot}</th></tr><tr>${celula(fn)}</tr>`;
  const temTracao = cols.some((c) => c.v.tracao), temFab = cols.some((c) => c.v.fabricado);
  const linhas = [
    linha("Preço", (c) => c.v.preco ? `<b class="num">${reais(c.v.preco)}</b><small>${c.v.fipe ? "FIPE 0 km" : "sugerido de fábrica"}${c.v.mes ? ` · ${mesAno(c.v.mes)}` : ""}</small>${c.v.preco === menor ? '<span class="fato">menor preço</span>' : ""}` : ""),
    linha("Motor", (c) => esc(c.v.motor)),
    linha("Potência", (c) => c.v.cv ? `<b class="num">${c.v.cv} cv</b>${c.v.cv === maior ? '<br><span class="fato">maior potência</span>' : ""}` : ""),
    linha("Câmbio", (c) => esc(c.v.cambio)),
    linha("Combustível", (c) => esc(c.v.comb)),
    temTracao ? linha("Tração", (c) => esc(c.v.tracao || "")) : "",
    linha("Tipo", (c) => esc(c.v.carroc || c.m.carroc)),
    temFab ? linha("Fabricado em", (c) => esc(c.v.fabricado || "")) : "",
    linha("Ano-modelo", (c) => (c.v.ano ? String(c.v.ano) : "")),
    linha("Pontos fortes", (c) => (c.v.tags.length ? `<ul class="selos">${c.v.tags.map((k) => `<li class="selo" data-k="${k}">${ico(k)}${esc(TAG_NOME[k] || k)}</li>`).join("")}</ul>` : "")),
    linha("Outras versões", (c) => `${pl(c.m.versoes.length, "versão", "versões")}${c.m.precoMin && c.m.precoMax !== c.m.precoMin ? `, de ${reais(c.m.precoMin)} a ${reais(c.m.precoMax)}` : ""}<br><a class="fnt" href="${c.m.url}">Ver página do ${esc(c.m.nome)}</a>`),
    linha("Fonte do preço", (c) => (c.v.fonte && c.v.fonte.url ? `<a class="fnt" href="${esc(c.v.fonte.url)}" target="_blank" rel="noopener nofollow" title="${esc(c.v.fonte.nome)}">Ver fonte${SETA}</a>` : "")),
  ].join("");

  const cab = cols.map((c, i) => `<th scope="col"><a class="cmp-ph" href="${c.m.url}" tabindex="-1" aria-hidden="true">${fotoTag(c.m, 360, "(max-width:640px) 45vw, 260px", i < 2) || ""}</a>
<span class="cmp-mk">${esc(c.m.marca)}</span><a class="cmp-nm" href="${c.m.url}">${esc(c.m.nome)}</a>
<label class="sr" for="v${i}">Versão do ${esc(c.m.titulo)}</label><select id="v${i}" name="v${i}">${c.m.versoes.map((v) => `<option value="${esc(v.id)}"${v.id === c.v.id ? " selected" : ""}>${esc(v.nome || c.m.nome)}${v.preco ? ` · ${reais(v.preco)}` : ""}</option>`).join("")}</select></th>`).join("");

  // outras comparações: o primeiro carro com os parecidos dele
  const outras = [...new Map(ms.flatMap((m) => parecidos(base, m, 4).filter((x) => !ms.some((y) => y.id === x.id)).map((x) => [urlPar(m, x), `${m.nome} x ${x.nome}`]))).entries()].slice(0, 10);

  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>${esc(n === 2 ? `${nomes[0]} x ${nomes[1]}` : nomes.join(" x "))}</h1>
<p class="lead">Preço, motor, potência, câmbio e pontos fortes ${n === 2 ? "dos dois" : `dos ${n}`} lado a lado. Troque a versão de cada um no alto da coluna.</p>
${resumo.length ? `<div class="resumo">${resumo.map((r) => `<p>${esc(r)}</p>`).join("")}</div>` : ""}</div>
<section class="sec" aria-label="Comparação">
<form class="cmp-f" method="get" action="/comparar/${ms.map((m) => m.id).join("-vs-")}">
<div class="cmp-wrap"><table class="cmp" style="min-width:${n * 160}px"><colgroup>${cols.map(() => "<col>").join("")}</colgroup><thead><tr>${cab}</tr></thead><tbody>${linhas}</tbody></table></div>
<noscript><button class="btn cmp-ok" type="submit">Atualizar versões</button></noscript>
</form>
<p class="nota">Preço de tabela sugerido pela montadora ou FIPE 0 km. "Menor preço" e "maior potência" comparam só as versões escolhidas acima. Confirme os dados com a concessionária.</p>
<div class="acoes"><a class="btn pri" href="/?carro=${encodeURIComponent(ms[0].id)}">${ROLETA}Ver na roleta de preços</a>${n < MAX_CARROS ? `<a class="btn" href="/comparar/${ms[0].id}">${COMPARAR_ICO}Comparar com outro carro</a>` : ""}</div>
</section>
${outras.length ? `<section class="sec" aria-labelledby="s-ot"><h2 id="s-ot">Outras comparações</h2><ul class="chips">${outras.map(([u, t]) => `<li><a href="${u}">${esc(t)}</a></li>`).join("")}</ul></section>` : ""}
<script>(()=>{const f=document.querySelector(".cmp-f");if(!f)return;f.addEventListener("change",()=>{const v=[...f.querySelectorAll("select")].map(s=>s.value).join(",");location.href=f.getAttribute("action")+"?versoes="+encodeURIComponent(v).replace(/%2C/g,",")})})()</script>`;

  return pagina({
    titulo, descricao: desc, caminho: canon, corpo, css: CSS, indexar: n === 2 && !repetido,
    ld: [ldTrilha(itens), { "@context": "https://schema.org", "@type": "ItemList", name: itens[2].nome, itemListElement: ms.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + m.url, name: m.titulo })) }],
    imagemOg: ms[0].foto ? SITE + imagem(ms[0].foto, 800, "&fm=png") : null, imagemAlt: itens[2].nome,
  });
}
const PLURAL = { SUV: "SUVs", Hatch: "hatches", "Sedã": "sedãs", Picape: "picapes", Van: "vans", Perua: "peruas", Minivan: "minivans", Esportivo: "esportivos" };
const TAG_NOME = { eletrico: "Elétrico", hibrido: "Híbrido", potente: "Potente", economico: "Econômico", turbo: "Turbo", x4: "4x4", diesel: "Diesel", espaco: "Espaçoso", tech: "Tecnologia" };

/* ---------- escolher com qual carro comparar */

export function paginaEscolher(base, m, vid) {
  const v = m.versoes.find((x) => x.id === vid) || null;
  const itens = [INICIO, COMPARAR, { nome: m.titulo, url: `/comparar/${m.id}` }];
  const opcoes = parecidos(base, m, 12);
  const mesmoTipo = base.aVenda.filter((x) => x.id !== m.id && x.carroc === m.carroc && !opcoes.includes(x)).sort((a, b) => (a.precoMin ?? Infinity) - (b.precoMin ?? Infinity));
  const link = (x) => urlComparacao([{ m, v }, { m: x, v: null }]);
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>Comparar o ${esc(m.titulo)} com…</h1>
<p class="lead">Escolha o outro carro. Depois dá para trocar a versão de cada um e incluir mais carros${v ? `. Versão escolhida: ${esc(v.nome)}${v.preco ? `, ${reais(v.preco)}` : ""}` : ""}.</p></div>
${opcoes.length ? `<section class="sec" aria-labelledby="s-pp"><h2 id="s-pp">Na mesma faixa de preço</h2><ul class="grade">${opcoes.map((x) => cartao(x, { href: link(x) })).join("")}</ul></section>` : ""}
${mesmoTipo.length ? `<section class="sec" aria-labelledby="s-mt"><h2 id="s-mt">Outros ${esc(PLURAL[m.carroc] || "carros do mesmo tipo")}</h2><ul class="chips">${mesmoTipo.map((x) => `<li><a href="${link(x)}">${esc(x.titulo)}${x.precoMin ? ` <small>${reais(x.precoMin)}</small>` : ""}</a></li>`).join("")}</ul></section>` : ""}`;
  return pagina({ titulo: `Comparar o ${m.titulo} com outro carro | Autokan`, descricao: `Escolha um carro para comparar com o ${m.titulo}: preço de cada versão, motor, potência, câmbio e pontos fortes, lado a lado.`,
    caminho: `/comparar/${m.id}`, corpo, indexar: false, ld: [ldTrilha(itens)] });
}

/* ---------- todas as comparações (porta de entrada para o Google) */

export function paresPopulares(base, porModelo = 3) {
  const pares = new Map();
  for (const m of base.aVenda) for (const x of parecidos(base, m, porModelo)) { const u = urlPar(m, x); if (!pares.has(u)) pares.set(u, [m, x].sort((a, b) => a.id.localeCompare(b.id))); }
  return pares; // url → [modeloA, modeloB]
}

export function paginaComparacoes(base) {
  const itens = [INICIO, COMPARAR];
  const pares = paresPopulares(base, 2);
  const grupos = new Map();
  for (const [u, [a, b]] of pares) { const t = a.carroc === b.carroc ? a.carroc || "Outros" : "Tipos diferentes"; (grupos.get(t) || grupos.set(t, []).get(t)).push([u, a, b]); }
  const ordem = ["SUV", "Hatch", "Sedã", "Picape", "Esportivo", "Van", "Perua", "Minivan", "Tipos diferentes", "Outros"];
  const nomeGrupo = { SUV: "SUVs", Hatch: "Hatches", "Sedã": "Sedãs", Picape: "Picapes", Esportivo: "Esportivos", Van: "Vans", Perua: "Peruas", Minivan: "Minivans" };
  const secoes = [...grupos.entries()].sort((a, b) => ((ordem.indexOf(a[0]) + 1) || 99) - ((ordem.indexOf(b[0]) + 1) || 99)).map(([t, ps]) => {
    ps.sort((x, y) => Math.min(x[1].precoMin ?? Infinity, x[2].precoMin ?? Infinity) - Math.min(y[1].precoMin ?? Infinity, y[2].precoMin ?? Infinity));
    const gid = "g-" + t.normalize("NFKD").replace(/[^\w]+/g, "-").toLowerCase();
    return `<section class="sec" aria-labelledby="${gid}"><h2 id="${gid}">${esc(nomeGrupo[t] || t)}</h2><ul class="chips">${ps.map(([u, a, b]) => `<li><a href="${u}">${esc(a.titulo)} x ${esc(b.titulo)}</a></li>`).join("")}</ul></section>`;
  }).join("");
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>Comparar carros 0 km</h1>
<p class="lead">Preço de cada versão, motor, potência, câmbio e pontos fortes lado a lado, de 2 a 4 carros. Abaixo, comparações de carros na mesma faixa de preço. Para comparar qualquer carro, abra a página dele e toque em "Comparar com outro carro".</p></div>
${secoes}`;
  return pagina({ titulo: "Comparar carros 0 km: preço e versões lado a lado | Autokan",
    descricao: `Compare carros 0 km lado a lado: preço de cada versão, motor, potência, câmbio e pontos fortes. ${pares.size} comparações de carros na mesma faixa de preço.`,
    caminho: "/comparar", corpo, ld: [ldTrilha(itens)] });
}
