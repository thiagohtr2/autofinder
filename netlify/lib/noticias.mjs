/* Autokan: feed de notícias (/noticias). Resumos das notícias de carros com link para a matéria original,
   com filtros por assunto, marca, tipo de carro, período e busca. Sem nada de "adicionar ao site". */
import { SITE, ASSUNTOS, TIPOS, semAcento } from "./base.mjs";
import { pagina, esc, trilha, ldTrilha, SETA, INICIO } from "./paginas.mjs";

const POR_PAGINA = 24;
const NOTICIAS = { nome: "Notícias", url: "/noticias" };
const PERIODOS = [["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"], ["90", "Últimos 3 meses"]];
const NOME_AVISO = { recall: "Recall", servico: "Campanha de serviço", defeito: "Defeito relatado", midia: "Na imprensa" };
const dataBr = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const CSS = `
.nf-f{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.nf-f input[type=search]{flex:1 1 260px;min-width:0;height:44px;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:0 14px;font:600 15px var(--body);color:var(--ink)}
.nf-f select{flex:1 1 150px;height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:0 34px 0 12px;font:600 14px var(--body);color:var(--ink);-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%235d6577' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:14px}
.nf-f .btn{height:44px}
.nf-as{margin-top:12px}
.nf-res{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:22px 0 12px;font-size:13.5px;color:var(--muted);font-weight:600}
.nf-res a{font-weight:700}
.nf-l{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.nf{padding:16px 18px;border:1px solid var(--line);border-radius:18px;background:#fff}
.nf-m{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:12px;font-weight:700;color:var(--muted)}
.nf-c{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.03em;background:var(--panel);color:#3b4352}
.nf-c[data-a=precos]{background:#e8f6ee;color:#0d6b3c}.nf-c[data-a=lancamentos]{background:#e9f1ff;color:#1450c8}.nf-c[data-a=vendas]{background:#f0ebfb;color:#5b3bb0}
.nf-c[data-a=recalls]{background:#fdecea;color:#a3240f}.nf-c[data-a=avaliacoes]{background:#fff4e0;color:#8a5200}
.nf h2{margin:8px 0 0;font-family:var(--display);font-weight:600;font-size:17px;line-height:1.3;letter-spacing:-.01em}
.nf h2 a{color:var(--ink);text-decoration:none}
.nf h2 a:hover{color:var(--accent-ink);text-decoration:underline}
.nf p{margin:6px 0 0;font-size:14.5px;color:#2f3644;line-height:1.55}
.nf-af{font-size:13.5px!important}
.nf-cs{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.nf-cs a,.nf-cs span{display:inline-flex;align-items:center;height:28px;padding:0 11px;border:1px solid var(--line);border-radius:999px;font-size:12.5px;font-weight:700;color:var(--ink);text-decoration:none;background:#fff}
.nf-cs a:hover{border-color:var(--accent);color:var(--accent-ink)}
.nf-cs span{color:var(--muted)}
.nf-ft{display:flex;justify-content:flex-end;margin-top:10px}
.nf-ft a{font-size:13px;font-weight:700;text-decoration:none}
.nf-pg{display:flex;justify-content:space-between;gap:10px;margin-top:20px}
@media (max-width:640px){.nf{padding:14px}.nf h2{font-size:16px}.nf-f select{flex:1 1 calc(50% - 4px)}.nf-f input[type=search]{flex-basis:100%}}
`.replace(/\n\s*/g, "");

/* lê os filtros da URL, ignorando valores que não existem */
export function lerFiltros(base, params) {
  const f = {
    assunto: ASSUNTOS.some((a) => a.slug === params.get("assunto")) ? params.get("assunto") : "",
    marca: base.marcas.has(params.get("marca") || "") ? params.get("marca") : "",
    tipo: TIPOS.some((t) => t.slug === params.get("tipo")) ? params.get("tipo") : "",
    periodo: PERIODOS.some(([v]) => v === params.get("periodo")) ? params.get("periodo") : "",
    q: (params.get("q") || "").trim().slice(0, 80),
    pagina: Math.max(1, Math.min(200, parseInt(params.get("pagina") || "1", 10) || 1)),
  };
  return f;
}
const temFiltro = (f) => !!(f.assunto || f.marca || f.tipo || f.periodo || f.q);
const qs = (f, mudar = {}) => {
  const x = { ...f, pagina: 1, ...mudar }, p = new URLSearchParams();
  for (const k of ["q", "assunto", "marca", "tipo", "periodo"]) if (x[k]) p.set(k, x[k]);
  if (x.pagina > 1) p.set("pagina", String(x.pagina));
  const s = p.toString();
  return `/noticias${s ? `?${s}` : ""}`;
};

function filtrar(base, f, ignorar = "") {
  const desde = f.periodo ? new Date(Date.now() - (+f.periodo) * 864e5).toISOString().slice(0, 10) : "";
  const carroc = f.tipo ? TIPOS.find((t) => t.slug === f.tipo).carroc : "";
  const termos = semAcento(f.q).split(/\s+/).filter(Boolean);
  return base.feed.filter((it) => (ignorar === "assunto" || !f.assunto || it.assunto === f.assunto)
    && (!f.marca || it.bids.includes(f.marca))
    && (!carroc || it.tipos.includes(carroc))
    && (!desde || String(it.date) >= desde)
    && (!termos.length || termos.every((t) => it.busca.includes(t))));
}

function item(base, it) {
  const assunto = ASSUNTOS.find((a) => a.slug === it.assunto);
  const rotulo = it.tipo === "aviso" ? NOME_AVISO[it.aviso] || assunto.nome : assunto.nome;
  const carros = it.mids.map((m) => base.modelos.get(m)).filter((m) => m && m.marcaInfo);
  const marcasSoltas = carros.length ? [] : it.bids.map((b) => base.marcas.get(b)).filter(Boolean);
  const chips = [...carros.slice(0, 6).map((m) => `<li><a href="${m.url}">${esc(m.titulo)}</a></li>`), ...(carros.length > 6 ? [`<li><span>+${carros.length - 6}</span></li>`] : []),
    ...marcasSoltas.map((b) => `<li><a href="${b.url}">${esc(b.nome)}</a></li>`)].join("");
  const titulo = it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener nofollow">${esc(it.title)}</a>` : esc(it.title);
  return `<li class="nf"><div class="nf-m"><span class="nf-c" data-a="${it.assunto}">${esc(rotulo)}</span>${it.source ? `<span>${esc(it.source)}</span>` : ""}${it.date ? `<span>${dataBr(it.date)}</span>` : ""}</div>
<h2>${titulo}</h2>${it.summary ? `<p>${esc(it.summary)}</p>` : ""}${it.affects ? `<p class="nf-af"><strong>Afeta:</strong> ${esc(it.affects)}</p>` : ""}
${chips ? `<ul class="nf-cs">${chips}</ul>` : ""}${it.url ? `<div class="nf-ft"><a href="${esc(it.url)}" target="_blank" rel="noopener nofollow">Ler na fonte${SETA}</a></div>` : ""}</li>`;
}

export function paginaNoticias(base, f) {
  const achados = filtrar(base, f);
  const total = achados.length, paginas = Math.max(1, Math.ceil(total / POR_PAGINA)), pg = Math.min(f.pagina, paginas);
  const mostra = achados.slice((pg - 1) * POR_PAGINA, pg * POR_PAGINA);
  const marca = f.marca ? base.marcas.get(f.marca) : null, assunto = ASSUNTOS.find((a) => a.slug === f.assunto), tipo = TIPOS.find((t) => t.slug === f.tipo);
  const h1 = `${assunto ? assunto.nome : marca || tipo ? "Notícias" : "Notícias de carros 0 km"}${marca ? ` da ${marca.nome}` : ""}${tipo ? ` · ${tipo.curto}` : ""}`;
  const indexar = !temFiltro(f) && pg === 1;

  // quantas notícias há em cada assunto com os outros filtros
  const semAssunto = filtrar(base, f, "assunto");
  const contaAssunto = (slug) => semAssunto.filter((it) => it.assunto === slug).length;
  const chipsAssunto = `<nav aria-label="Assunto"><ul class="chips nf-as"><li><a href="${qs(f, { assunto: "" })}"${!f.assunto ? ' aria-current="page"' : ""}>Todas <small>${num(semAssunto.length)}</small></a></li>${ASSUNTOS.map((a) => { const n = contaAssunto(a.slug); return n || f.assunto === a.slug ? `<li><a href="${qs(f, { assunto: a.slug })}"${f.assunto === a.slug ? ' aria-current="page"' : ""}>${esc(a.nome)} <small>${num(n)}</small></a></li>` : ""; }).join("")}</ul></nav>`;

  const contaMarca = new Map(); base.feed.forEach((it) => it.bids.forEach((b) => contaMarca.set(b, (contaMarca.get(b) || 0) + 1)));
  const marcasOp = [...base.marcas.values()].filter((b) => contaMarca.get(b.id)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const opcao = (v, t, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;
  const form = `<form class="nf-f" method="get" action="/noticias" role="search" aria-label="Filtrar notícias">
<label class="sr" for="nf-q">Buscar nas notícias</label><input id="nf-q" name="q" type="search" placeholder="Buscar: Onix, recall, desconto…" value="${esc(f.q)}" enterkeyhint="search">
<label class="sr" for="nf-marca">Marca</label><select id="nf-marca" name="marca">${opcao("", "Todas as marcas", !f.marca)}${marcasOp.map((b) => opcao(b.id, b.nome, f.marca === b.id)).join("")}</select>
<label class="sr" for="nf-tipo">Tipo de carro</label><select id="nf-tipo" name="tipo">${opcao("", "Todos os tipos", !f.tipo)}${TIPOS.map((t) => opcao(t.slug, t.curto, f.tipo === t.slug)).join("")}</select>
<label class="sr" for="nf-per">Período</label><select id="nf-per" name="periodo">${opcao("", "Qualquer data", !f.periodo)}${PERIODOS.map(([v, t]) => opcao(v, t, f.periodo === v)).join("")}</select>
${f.assunto ? `<input type="hidden" name="assunto" value="${esc(f.assunto)}">` : ""}<button class="btn" type="submit">Filtrar</button>
</form>`;

  const res = `<div class="nf-res" role="status"><span>${total ? `${num(total)} ${total === 1 ? "notícia" : "notícias"}${paginas > 1 ? ` · página ${pg} de ${paginas}` : ""}` : "Nenhuma notícia com esses filtros"}</span>${temFiltro(f) ? `<a href="/noticias">Limpar filtros</a>` : ""}</div>`;
  const nav = paginas > 1 ? `<nav class="nf-pg" aria-label="Páginas">${pg > 1 ? `<a class="btn" href="${qs(f, { pagina: pg - 1 })}" rel="prev">← Mais recentes</a>` : "<span></span>"}${pg < paginas ? `<a class="btn" href="${qs(f, { pagina: pg + 1 })}" rel="next">Mais antigas →</a>` : ""}</nav>` : "";

  const itens = [INICIO, NOTICIAS];
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>${esc(h1)}</h1>
<p class="lead">Resumos das notícias do mercado de carros novos no Brasil, com link para a matéria original: preços e ofertas, lançamentos, vendas, avaliações e recalls. Atualizado várias vezes por dia.</p>
${form}
${chipsAssunto}</div>
${res}
${mostra.length ? `<ul class="nf-l">${mostra.map((it) => item(base, it)).join("")}</ul>` : `<p class="lead">Tente outra palavra, outra marca ou um período maior.</p>`}
${nav}
<p class="nota">Resumos escritos pelo Autokan a partir das matérias. O texto completo está no site de cada fonte. Recalls e avisos nem sempre atingem todas as unidades: confira na fonte e com a montadora.</p>
<script>(()=>{const f=document.querySelector(".nf-f");if(!f)return;f.addEventListener("submit",()=>f.querySelectorAll("input,select").forEach(x=>{if(!x.value)x.disabled=true}));f.querySelectorAll("select").forEach(s=>s.addEventListener("change",()=>f.requestSubmit?f.requestSubmit():f.submit()))})()</script>`;

  return pagina({
    titulo: indexar ? "Notícias de carros 0 km: preços, lançamentos e recalls | Autokan" : `${h1}${pg > 1 ? ` (página ${pg})` : ""} | Autokan`,
    descricao: "Resumo das notícias de carros novos no Brasil: preços e ofertas, lançamentos, vendas, avaliações e recalls, com link para a matéria original. Filtre por marca, assunto e tipo.",
    caminho: indexar ? "/noticias" : null, corpo, css: CSS, indexar,
    ld: [ldTrilha(itens)],
  });
}
