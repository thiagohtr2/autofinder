/* Autokan: comparação lado a lado (de 2 a 4 carros) e as páginas que levam até ela.
   Neutra: mostra os dados de cada versão na mesma linha e aponta só fatos (o menor preço, a maior potência),
   sem dar nota nem eleger um vencedor. */
import { SITE, parecidos, imagem, semAcento } from "./base.mjs";
import { linhasComparacao } from "./ficha-tecnica.mjs";
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
.cmp tr.gp th{text-align:left;font-family:var(--display);font-size:17px;font-weight:600;letter-spacing:-.01em;color:var(--ink);padding:26px 10px 4px}
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

export const urlComparacao = (pares) => `/comparar/${pares.map(({ m }) => m.id).join("-vs-")}${pares.some(({ v }) => v) ? `?versoes=${pares.map(({ v }) => (v ? encodeURIComponent(v.id) : "")).join(",").replace(/,+$/, "")}` : ""}`;

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
    linhasComparacao(cols, base.fontes),
  ].join("");

  const cab = cols.map((c, i) => `<th scope="col"><a class="cmp-ph" href="${c.m.url}" tabindex="-1" aria-hidden="true">${fotoTag(c.m, 360, "(max-width:640px) 45vw, 260px", i < 2) || ""}</a>
<span class="cmp-mk">${esc(c.m.marca)}</span><a class="cmp-nm" href="${c.m.url}">${esc(c.m.nome)}</a>
<label class="sr" for="v${i}">Versão do ${esc(c.m.titulo)}</label><select id="v${i}" name="v${i}">${c.m.versoes.map((v) => `<option value="${esc(v.id)}"${v.id === c.v.id ? " selected" : ""}>${esc(v.nome || c.m.nome)}${v.preco ? ` · ${reais(v.preco)}` : ""}</option>`).join("")}</select></th>`).join("");

  // outros carros para comparar com o primeiro (cards; cada um abre a comparação dos dois)
  const outros = porSemelhanca(base, ms[0]).filter((x) => !ms.some((y) => y.id === x.id)).slice(0, 8);

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
<div class="acoes"><a class="btn pri" href="/?carro=${encodeURIComponent(ms[0].id)}">${ROLETA}Ver carros do mesmo preço</a>${n < MAX_CARROS ? `<a class="btn" href="/comparar/${ms[0].id}">${COMPARAR_ICO}Comparar com outro carro</a>` : ""}</div>
</section>
${outros.length ? `<section class="sec" aria-labelledby="s-ot"><h2 id="s-ot">Compare o ${esc(ms[0].nome)} com outros carros</h2><ul class="grade">${outros.map((x) => cartao(x, { href: urlPar(ms[0], x) })).join("")}</ul><div class="acoes"><a class="btn" href="/comparar/${ms[0].id}">${COMPARAR_ICO}Buscar outro carro</a></div></section>` : ""}
<script>(()=>{const f=document.querySelector(".cmp-f");if(!f)return;f.addEventListener("change",()=>{const v=[...f.querySelectorAll("select")].map(s=>s.value).join(",");location.href=f.getAttribute("action")+"?versoes="+encodeURIComponent(v).replace(/%2C/g,",")})})()</script>`;

  return pagina({
    titulo, descricao: desc, caminho: canon, corpo, css: CSS, indexar: n === 2 && !repetido,
    ld: [ldTrilha(itens), { "@context": "https://schema.org", "@type": "ItemList", name: itens[2].nome, itemListElement: ms.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + m.url, name: m.titulo })) }],
    imagemOg: ms[0].foto ? SITE + imagem(ms[0].foto, 800, "&fm=png") : null, imagemAlt: itens[2].nome,
  });
}
const PLURAL = { SUV: "SUVs", Hatch: "hatches", "Sedã": "sedãs", Picape: "picapes", Van: "vans", Perua: "peruas", Minivan: "minivans", Esportivo: "esportivos" };
const TAG_NOME = { eletrico: "Elétrico", hibrido: "Híbrido", potente: "Potente", economico: "Econômico", turbo: "Turbo", x4: "4x4", diesel: "Diesel", espaco: "Espaçoso", tech: "Tecnologia" };

/* ---------- escolher carros: busca no topo e cards embaixo, 10 de cada vez (aparecem mais ao descer) */

const POR_VEZ = 10;
const CSS_ESCOLHA = `
.busca{display:flex;align-items:center;gap:10px;height:52px;padding:0 16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);margin:20px 0 4px;transition:border-color .15s,background .15s}
.busca:focus-within{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px rgba(29,107,255,.12)}
.busca svg{width:19px;height:19px;color:var(--muted);flex:none}
.busca input{flex:1;min-width:0;height:100%;border:0;background:none;font:600 16px var(--body);color:var(--ink);outline:none}
.busca input::placeholder{color:#8a92a3;font-weight:500}
.esc-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:22px 0 12px}
.esc-h h2{margin:0}
.esc-fim{height:1px}
`.replace(/\n\s*/g, "");
const LUPA = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14 14 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/* carros da lista: dados mínimos para o navegador montar os próximos cards e buscar */
function dadosEscolha(lista, href) {
  return lista.map((x) => ({
    h: href(x), mk: x.marca, n: x.nome, t: `${x.titulo}${x.ano ? ` ${x.ano}` : ""}`, p: x.precoMin || 0, f: x.foto || "",
    s: [x.carroc, x.combs.slice(0, 2).join(" ou "), pl(x.versoes.length, "versão", "versões")].filter(Boolean).join(" · "),
    q: semAcento(`${x.marca} ${x.nome} ${x.carroc} ${x.combs.join(" ")}`),
  }));
}

export function escolha({ lista, href, titulo, placeholder }) {
  const dados = dadosEscolha(lista, href);
  return `<label class="busca"><span class="sr">Buscar carro</span>${LUPA}<input id="esc-q" type="search" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="search"></label>
<div class="esc-h"><h2 id="esc-t">${esc(titulo)}</h2></div>
<ul class="grade" id="esc-l">${lista.slice(0, POR_VEZ).map((x) => cartao(x, { href: href(x) })).join("")}</ul>
<p class="lead" id="esc-v" hidden>Nenhum carro com esse nome. Tente só a marca ou só o modelo.</p>
<div class="esc-fim" id="esc-fim"></div>
<script type="application/json" id="esc-d">${JSON.stringify(dados).replace(/</g, "\\u003c")}</script>
<script>(()=>{const d=JSON.parse(document.getElementById("esc-d").textContent),ul=document.getElementById("esc-l"),q=document.getElementById("esc-q"),fim=document.getElementById("esc-fim"),tt=document.getElementById("esc-t"),vz=document.getElementById("esc-v"),T0=tt.textContent,N=${POR_VEZ};
let lista=d,feitos=ul.children.length;
const sa=t=>t.normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase(),e=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const im=(f,w)=>"/.netlify/images?url="+encodeURIComponent(f)+"&w="+w,rs=n=>"R$\\u00a0"+String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,".");
const card=x=>'<li><a class="mc" href="'+e(x.h)+'"><span class="mc-ph">'+(x.f?'<img src="'+im(x.f,360)+'" srcset="'+im(x.f,360)+' 360w, '+im(x.f,576)+' 576w" sizes="(max-width:520px) 46vw, 260px" alt="'+e(x.t)+'" width="360" height="203" loading="lazy" decoding="async">':'<span class="mc-sem">'+e(x.n)+'</span>')+'</span><span class="mc-tx"><span class="mc-mk">'+e(x.mk)+'</span><span class="mc-nm">'+e(x.n)+'</span><span class="mc-sub">'+e(x.s)+'</span><span class="mc-pr">'+(x.p?'<small>a partir de</small>'+rs(x.p):'<small>preço ainda não divulgado</small>')+'</span></span></a></li>';
const mais=()=>{if(feitos>=lista.length)return;ul.insertAdjacentHTML("beforeend",lista.slice(feitos,feitos+N).map(card).join(""));feitos=Math.min(lista.length,feitos+N)};
const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){mais();io.unobserve(fim);io.observe(fim)}},{rootMargin:"700px 0px"});io.observe(fim);
let tm;q.addEventListener("input",()=>{clearTimeout(tm);tm=setTimeout(()=>{const ts=sa(q.value.trim()).split(/\\s+/).filter(Boolean);
  lista=ts.length?d.filter(x=>ts.every(t=>x.q.includes(t))):d;tt.textContent=ts.length?(lista.length+(lista.length===1?" carro encontrado":" carros encontrados")):T0;
  vz.hidden=!!lista.length;ul.innerHTML="";feitos=0;mais();io.unobserve(fim);io.observe(fim)},120)});
})()</script>`;
}

/* ordem das sugestões para comparar com um carro: mesma faixa de preço e mesmo tipo primeiro, depois os mais diferentes */
export function porSemelhanca(base, m) {
  return base.aVenda.filter((x) => x.id !== m.id)
    .map((x) => ({ x, d: (m.precoMin && x.precoMin ? Math.abs(x.precoMin - m.precoMin) / m.precoMin : 2) + (x.carroc === m.carroc ? 0 : 0.35) + (x.bid === m.bid ? 0.05 : 0) }))
    .sort((a, b) => a.d - b.d).map(({ x }) => x);
}

/* ---------- escolher com qual carro comparar */

export function paginaEscolher(base, m, vid) {
  const v = m.versoes.find((x) => x.id === vid) || null;
  const itens = [INICIO, COMPARAR, { nome: m.titulo, url: `/comparar/${m.id}` }];
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>Comparar o ${esc(m.titulo)} com…</h1>
<p class="lead">Busque o outro carro ou escolha um dos sugeridos. Depois dá para trocar a versão de cada um e incluir mais carros${v ? `. Versão escolhida do ${esc(m.nome)}: ${esc(v.nome)}${v.preco ? `, ${reais(v.preco)}` : ""}` : ""}.</p></div>
<section class="sec" aria-label="Escolher o outro carro">${escolha({ lista: porSemelhanca(base, m), href: (x) => urlComparacao([{ m, v }, { m: x, v: null }]), titulo: `Sugeridos para comparar com o ${m.nome}`, placeholder: "Buscar carro: marca ou modelo" })}</section>`;
  return pagina({ titulo: `Comparar o ${m.titulo} com outro carro | Autokan`, descricao: `Escolha um carro para comparar com o ${m.titulo}: preço de cada versão, motor, potência, câmbio e pontos fortes, lado a lado.`,
    caminho: `/comparar/${m.id}`, corpo, css: CSS_ESCOLHA, indexar: false, ld: [ldTrilha(itens)] });
}

/* ---------- todas as comparações (porta de entrada para o Google) */

export function paresPopulares(base, porModelo = 3) {
  const pares = new Map();
  for (const m of base.aVenda) for (const x of parecidos(base, m, porModelo)) { const u = urlPar(m, x); if (!pares.has(u)) pares.set(u, [m, x].sort((a, b) => a.id.localeCompare(b.id))); }
  return pares; // url → [modeloA, modeloB]
}

export function paginaComparacoes(base) {
  const itens = [INICIO, COMPARAR];
  const lista = [...base.aVenda].sort((a, b) => (a.precoMin ?? Infinity) - (b.precoMin ?? Infinity) || a.titulo.localeCompare(b.titulo, "pt-BR"));
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>Comparar carros 0 km</h1>
<p class="lead">Preço de cada versão, motor, potência, câmbio e pontos fortes lado a lado, de 2 a 4 carros. Escolha o primeiro carro; em seguida, o outro.</p></div>
<section class="sec" aria-label="Escolher o primeiro carro">${escolha({ lista, href: (x) => `/comparar/${x.id}`, titulo: "Escolha o primeiro carro", placeholder: "Buscar carro: marca ou modelo" })}</section>`;
  return pagina({ titulo: "Comparar carros 0 km: preço e versões lado a lado | Autokan",
    descricao: `Compare carros 0 km lado a lado: preço de cada versão, motor, potência, câmbio e pontos fortes. Escolha entre ${base.aVenda.length} modelos à venda no Brasil.`,
    caminho: "/comparar", corpo, css: CSS_ESCOLHA, ld: [ldTrilha(itens)] });
}
