/* Autokan: dados das páginas próprias (carros, marcas e listas), lidos do Supabase.
   Usa a mesma chave pública do site (public/supabase-adapter.js): só leitura, protegida pelas regras do banco.
   Segue as regras do site: só versões "à venda" entram nas listas; marcas e modelos tirados do site
   (painel Banco de dados) não ganham página; a foto é a do ano do carro ou a do ano mais próximo. */
import { TAGS, TAGORDER, deriveTags, cvOf } from "./pontos-fortes.mjs";

export const SITE = "https://autokan.com.br";
const SB = "https://ljgcvxadsekaicffztbi.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2N2eGFkc2VrYWljZmZ6dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTYyNjMsImV4cCI6MjEwOTM3MjI2M30._lZd1-cALOXrnR3nI0rwwWkfIAXYZ_qmVHJ7s3Ka2BM";
const PAGINA = 1000;
const VALIDADE_MS = 5 * 60 * 1000; // a mesma função atende várias páginas seguidas sem ler o banco de novo

/* ---------- leitura */

async function ler(tabela, consulta) {
  const linhas = [];
  for (let de = 0; ; de += PAGINA) {
    const r = await fetch(`${SB}/rest/v1/${tabela}?${consulta}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${de}-${de + PAGINA - 1}`, "Range-Unit": "items" },
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) throw new Error(`Supabase respondeu ${r.status} ao ler ${tabela}`);
    const pagina = await r.json();
    linhas.push(...pagina);
    if (pagina.length < PAGINA) return linhas;
  }
}

let guardado = null, guardadoEm = 0;
export function carregar() {
  if (guardado && Date.now() - guardadoEm < VALIDADE_MS) return guardado;
  const p = montar();
  guardado = p; guardadoEm = Date.now();
  p.catch(() => { if (guardado === p) guardado = null; });
  return p;
}

/* ---------- utilidades */

export const slugMarca = (nome) => nome.normalize("NFKD").replace(/[^\w]/g, "").toLowerCase(); // igual ao brandSlug do site
const urlArquivo = (bucket, caminho) => `${SB}/storage/v1/object/public/${bucket}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
const contar = (lista) => { const m = new Map(); lista.forEach((x) => x && m.set(x, (m.get(x) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).map(([x]) => x); };
const urlSegura = (u) => (typeof u === "string" && /^https?:\/\/[^\s"<>]+$/.test(u) ? u : null);

/* ---------- montagem */

async function montar() {
  const [versoes, marcasDb, modelosDb, midias, meta, fontesDb, noticiasDb, avisosDb, radarDb] = await Promise.all([
    ler("versions", "select=id,brand_id,brand,model_id,catalog_row,price_source_id,price_ref_month,drive,manufactured_in,updated_at&catalog_row=not.is.null&order=id"),
    ler("brands", "select=id,name,country&order=id"),
    ler("models", "select=id,brand_id,name,body&order=id"),
    ler("media", "select=kind,owner_id,bucket,storage_path,uploaded_at&is_current=eq.true&kind=in.(model_photo,brand_logo)&order=id"),
    ler("site_meta", "select=key,value&key=in.(visibility,brand_sites)&order=key"),
    ler("sources", "select=id,name,url&order=id"),
    ler("news", "select=model_id,title,summary,source,url,date&order=id"),
    ler("alerts", "select=model_id,kind,title,summary,affects,source,url,date&order=id"),
    // notícias de mercado do radar (o público lê só estas colunas; sem elas o resto do site funciona igual)
    ler("radar_items", "select=id,title,summary,kind,brand,model,model_id,date,source,url&order=id").catch(() => []),
  ]);

  const metaDe = (k) => (meta.find((x) => x.key === k) || {}).value || {};
  const vis = metaDe("visibility"), sitesMarcas = metaDe("brand_sites");
  const ids = (a) => new Set(Array.isArray(a) ? a.filter((x) => typeof x === "string") : []);
  const marcaFora = ids(vis.hidden_brands), modeloFora = ids(vis.hidden_models);
  const fontes = new Map(fontesDb.map((f) => [f.id, { nome: f.name || "", url: urlSegura(f.url) }]));
  const nomeModelo = new Map(modelosDb.map((m) => [m.id, m.name]));

  // fotos: carro = modelo num ano (ex.: jeep-compass_2028); a antiga fica guardada só pelo modelo
  const fotos = new Map(), logos = new Map();
  for (const x of midias) {
    const url = urlArquivo(x.bucket, x.storage_path);
    if (x.kind === "model_photo") fotos.set(x.owner_id, url);
    else logos.set(x.owner_id, url);
  }
  const anosFoto = new Map();
  for (const k of fotos.keys()) { const m = /^(.+)_((?:19|20)\d{2})$/.exec(k); if (m) (anosFoto.get(m[1]) || anosFoto.set(m[1], []).get(m[1])).push(+m[2]); }
  const fotoDe = (mid, ano) => { // mesma ordem do site: o próprio ano, o ano mais próximo (o mais novo no empate), a antiga
    if (ano && fotos.has(`${mid}_${ano}`)) return fotos.get(`${mid}_${ano}`);
    const anos = anosFoto.get(mid);
    if (anos) { const y = anos.reduce((b, y) => { const d = ano ? Math.abs(y - ano) - Math.abs(b - ano) : b - y; return d < 0 || (d === 0 && y > b) ? y : b; }); return fotos.get(`${mid}_${y}`); }
    return fotos.get(mid) || null;
  };

  const porModelo = (linhas) => { const m = new Map(); linhas.forEach((x) => (m.get(x.model_id) || m.set(x.model_id, []).get(x.model_id)).push(x)); return m; };
  const noticias = porModelo(noticiasDb), avisos = porModelo(avisosDb);

  const modelos = new Map();
  for (const v of versoes) {
    const r = v.catalog_row;
    if (!r || typeof r.i !== "string") continue;
    const bid = v.brand_id, mid = r.m || v.model_id;
    if (!bid || !mid || marcaFora.has(bid) || modeloFora.has(mid) || !mid.startsWith(bid + "-")) continue;
    let m = modelos.get(mid);
    if (!m) {
      m = { id: mid, bid, marca: v.brand || bid, nome: String(r.mn || nomeModelo.get(mid) || mid.slice(bid.length + 1)), slug: mid.slice(bid.length + 1), versoes: [], breve: [] };
      modelos.set(mid, m);
    }
    const tg = deriveTags(r);
    const versao = {
      id: r.i, nome: String(r.v || ""), ano: r.y || null, preco: typeof r.p === "number" && r.p > 0 ? r.p : null,
      fipe: r.pk === "fipe", mes: typeof v.price_ref_month === "string" ? v.price_ref_month : null, fonte: fontes.get(v.price_source_id) || null,
      motor: String(r.e || ""), cv: cvOf(r), cambio: String(r.t || ""), comb: String(r.f || ""), carroc: String(r.b || ""),
      tracao: v.drive || null, fabricado: v.manufactured_in || null, status: r.st || "on_sale", tags: tg.k, porque: tg.why, atualizado: v.updated_at,
    };
    (versao.status === "on_sale" ? m.versoes : m.breve).push(versao);
  }

  const porPreco = (a, b) => (a.preco ?? Infinity) - (b.preco ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR");
  for (const m of modelos.values()) {
    m.versoes.sort(porPreco); m.breve.sort(porPreco);
    const todas = m.versoes.length ? m.versoes : m.breve;
    m.aVenda = m.versoes.length > 0;
    m.ano = todas.reduce((y, v) => Math.max(y, v.ano || 0), 0) || null;
    const precos = m.versoes.map((v) => v.preco).filter(Boolean);
    m.precoMin = precos.length ? Math.min(...precos) : null;
    m.precoMax = precos.length ? Math.max(...precos) : null;
    m.carroc = contar(todas.map((v) => v.carroc))[0] || "";
    m.combs = contar(todas.map((v) => v.comb));
    m.cambios = contar(todas.map((v) => v.cambio));
    const cvs = todas.map((v) => v.cv).filter(Boolean);
    m.cvMin = cvs.length ? Math.min(...cvs) : null; m.cvMax = cvs.length ? Math.max(...cvs) : null;
    m.fabricado = contar(todas.map((v) => v.fabricado));
    const tags = new Map();
    todas.forEach((v) => v.tags.forEach((k) => { if (!tags.has(k)) tags.set(k, v.porque[k]); }));
    m.tags = TAGORDER.filter((k) => tags.has(k)).map((k) => ({ k, nome: TAGS[k], porque: tags.get(k) }));
    m.foto = fotoDe(mid0(m), m.ano);
    m.noticias = (noticias.get(m.id) || []).filter((n) => n.title && urlSegura(n.url)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    m.avisos = dedup((avisos.get(m.id) || []).filter((a) => a.title)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    m.atualizado = todas.reduce((d, v) => (v.atualizado && v.atualizado > d ? v.atualizado : d), "");
    m.url = `/carros/${m.bid}/${m.slug}`;
    m.titulo = `${m.marca} ${m.nome}`;
  }

  const marcas = new Map();
  for (const b of marcasDb) {
    const lista = [...modelos.values()].filter((m) => m.bid === b.id);
    if (!lista.length) continue;
    lista.sort((a, b2) => (a.aVenda === b2.aVenda ? 0 : a.aVenda ? -1 : 1) || (a.precoMin ?? Infinity) - (b2.precoMin ?? Infinity) || a.nome.localeCompare(b2.nome, "pt-BR"));
    const aVenda = lista.filter((m) => m.aVenda);
    marcas.set(b.id, {
      id: b.id, nome: b.name || lista[0].marca, pais: b.country || null, logo: logos.get(b.id) || null,
      site: urlSegura(sitesMarcas[slugMarca(b.name || "")]), modelos: lista, aVenda,
      precoMin: aVenda.length ? Math.min(...aVenda.map((m) => m.precoMin ?? Infinity)) : null,
      versoes: aVenda.reduce((t, m) => t + m.versoes.length, 0),
      atualizado: lista.reduce((d, m) => (m.atualizado > d ? m.atualizado : d), ""), url: `/carros/${b.id}`,
    });
  }
  for (const m of modelos.values()) m.marcaInfo = marcas.get(m.bid) || null;

  const aVenda = [...modelos.values()].filter((m) => m.aVenda && m.marcaInfo);
  const anos = contar(aVenda.flatMap((m) => m.versoes.map((v) => v.ano)));
  const meses = contar(aVenda.flatMap((m) => m.versoes.map((v) => v.mes)));
  return {
    modelos, marcas, aVenda, feed: montarFeed({ noticiasDb, avisosDb, radarDb, modelos, marcas }),
    anoLinha: anos[0] || new Date().getFullYear(), mesPrecos: meses.sort().pop() || null,
    totalVersoes: aVenda.reduce((t, m) => t + m.versoes.length, 0),
    atualizado: [...modelos.values()].reduce((d, m) => (m.atualizado > d ? m.atualizado : d), ""),
    lerEm: new Date().toISOString(),
  };
}
const mid0 = (m) => m.id;
function dedup(lista) { const vistos = new Set(); return lista.filter((a) => { const k = `${a.title}|${a.date}`; if (vistos.has(k)) return false; vistos.add(k); return true; }); }

/* ---------- listas (faixa de preço, tipo e combustível) */

const mil = (n) => n * 1000;
export const FAIXAS = [100, 120, 150, 200, 250, 300, 500].map((n) => ({
  slug: `carros-ate-${n}-mil`, curto: `Até ${n} mil`, max: mil(n), min: 0,
  titulo: `Carros 0 km até R$ ${n} mil`,
})).concat([{ slug: "carros-acima-de-500-mil", curto: "Acima de 500 mil", min: mil(500) + 1, max: Infinity, titulo: "Carros 0 km acima de R$ 500 mil" }]);

/* faixas sem sobreposição (atalhos e rodapé) e faixas livres digitadas na caixa "De R$ … até R$ …" */
export const FAIXAS_ENTRE = [[100, 150], [150, 200], [200, 300], [300, 500]].map(([a, b]) => ({
  slug: `carros-de-${a}-a-${b}-mil`, curto: `${a} a ${b} mil`, min: mil(a), max: mil(b), titulo: `Carros 0 km de R$ ${a} mil a R$ ${b} mil`,
}));
export const ATALHOS_PRECO = [FAIXAS[0], ...FAIXAS_ENTRE, FAIXAS[FAIXAS.length - 1]];
const fmtMil = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export function faixaPorSlug(slug) {
  let m;
  if ((m = /^carros-ate-(\d{1,5})-mil$/.exec(slug))) {
    const n = +m[1]; if (n < 10) return null;
    return FAIXAS.find((f) => f.slug === slug) || { slug, curto: `Até ${fmtMil(n)} mil`, min: 0, max: mil(n), titulo: `Carros 0 km até R$ ${fmtMil(n)} mil`, livre: true };
  }
  if ((m = /^carros-de-(\d{1,5})-a-(\d{1,5})-mil$/.exec(slug))) {
    const a = +m[1], b = +m[2]; if (b <= a) return null;
    return FAIXAS_ENTRE.find((f) => f.slug === slug) || { slug, curto: `${fmtMil(a)} a ${fmtMil(b)} mil`, min: mil(a), max: mil(b), titulo: `Carros 0 km de R$ ${fmtMil(a)} mil a R$ ${fmtMil(b)} mil`, livre: true };
  }
  if ((m = /^carros-acima-de-(\d{1,5})-mil$/.exec(slug))) {
    const n = +m[1];
    return FAIXAS.find((f) => f.slug === slug) || { slug, curto: `Acima de ${fmtMil(n)} mil`, min: mil(n) + 1, max: Infinity, titulo: `Carros 0 km acima de R$ ${fmtMil(n)} mil`, livre: true };
  }
  return null;
}
/* lê o que a pessoa digitou na caixa de preço e devolve em mil reais: "150", "150 mil", "150.000", "1,2 mi" */
export function lerMil(v) {
  let t = String(v || "").trim().toLowerCase();
  if (!t) return null;
  const milhao = /\bmi\b|milh/.test(t);
  t = t.replace(/[^\d,.]/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); else t = t.replace(",", ".");
  let n = parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (milhao) n *= 1000; else if (n >= 10000) n /= 1000;
  return Math.max(1, Math.min(20000, Math.round(n)));
}
/* endereço da faixa digitada (em mil reais) */
export function slugFaixa(de, ate) {
  if (de && ate && de > ate) [de, ate] = [ate, de];
  if (de && ate && de === ate) ate = de + 1;
  if (de && ate) return `carros-de-${de}-a-${ate}-mil`;
  if (ate) return `carros-ate-${ate}-mil`;
  if (de) return `carros-acima-de-${de}-mil`;
  return null;
}

export const TIPOS = [
  ["suvs", "SUV", "SUVs", "SUV"], ["picapes", "Picape", "Picapes", "picape"], ["sedas", "Sedã", "Sedãs", "sedã"], ["hatches", "Hatch", "Hatches", "hatch"],
  ["esportivos", "Esportivo", "Esportivos", "esportivo"], ["vans", "Van", "Vans", "van"], ["peruas", "Perua", "Peruas", "perua"], ["minivans", "Minivan", "Minivans", "minivan"],
].map(([slug, carroc, plural, sing]) => ({ slug, carroc, curto: plural, sing, titulo: `${plural} 0 km` }));

export const COMBUSTIVEIS = [
  { slug: "carros-eletricos", tag: "eletrico", curto: "Elétricos", titulo: "Carros elétricos 0 km" },
  { slug: "carros-hibridos", tag: "hibrido", curto: "Híbridos", titulo: "Carros híbridos 0 km" },
  { slug: "carros-diesel", tag: "diesel", curto: "Diesel", titulo: "Carros a diesel 0 km" },
];

/* modelos de uma lista, com as versões que entram nela (do mais barato ao mais caro) */
export function filtrar(base, lista) {
  const teste = lista.max !== undefined ? (v) => v.preco && v.preco >= lista.min && v.preco <= lista.max
    : lista.carroc ? (v) => v.carroc === lista.carroc
    : (v) => v.tags.includes(lista.tag);
  return base.aVenda.map((m) => ({ m, vs: m.versoes.filter(teste) })).filter((x) => x.vs.length)
    .map(({ m, vs }) => ({ m, vs, de: Math.min(...vs.map((v) => v.preco ?? Infinity)) }))
    .sort((a, b) => a.de - b.de || a.m.titulo.localeCompare(b.m.titulo, "pt-BR"));
}

/* carros parecidos para comparar: mesma faixa de preço, mesmo tipo primeiro */
export function parecidos(base, m, n = 8) {
  if (!m.precoMin) return [];
  return base.aVenda.filter((x) => x.id !== m.id && x.precoMin && Math.abs(x.precoMin - m.precoMin) / m.precoMin <= 0.2)
    .map((x) => ({ x, d: Math.abs(x.precoMin - m.precoMin) / m.precoMin + (x.carroc === m.carroc ? 0 : 0.25) + (x.bid === m.bid ? 0.1 : 0) }))
    .sort((a, b) => a.d - b.d).slice(0, n).map(({ x }) => x);
}

/* imagens pelo CDN de imagens da Netlify (tamanho certo e formato leve); o endereço do Supabase já é aceito no netlify.toml */
export const imagem = (url, w, extra = "") => (url ? `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}${extra}` : null);

/* ---------- feed de notícias (/noticias): notícias por carro, notícias de mercado do radar e recalls.
   Uma matéria que fala de vários carros vira um item só, com os carros dela. Sem nada de "adicionar ao site". */

export const ASSUNTOS = [
  { slug: "precos", nome: "Preços e ofertas" },
  { slug: "lancamentos", nome: "Lançamentos e novidades" },
  { slug: "vendas", nome: "Vendas e mercado" },
  { slug: "avaliacoes", nome: "Avaliações e testes" },
  { slug: "recalls", nome: "Recalls e avisos" },
  { slug: "outras", nome: "Outras notícias" },
];
const ASSUNTO_RADAR = { preco: "precos", novo_carro: "lancamentos", nova_versao: "lancamentos", marca: "lancamentos", fim_de_linha: "lancamentos" };
// palpite pelo texto, na ordem: recall, vendas, preço (palavras fortes), lançamento, preço (qualquer valor), outras
const RX_ASSUNTO = [
  ["recalls", /\brecall|convoca/i],
  ["avaliacoes", /^teste\b|\bteste:|avaliação|avaliamos|primeiras impressões|impressões ao dirigir|andamos|dirigimos|ao volante|\breview\b|comparativo|vale a pena\?/i],
  ["vendas", /mais vendid|emplacament|\bvendas?\b|ranking|market share|participação de mercado|vendeu|\blidera|licenciament/i],
  ["precos", /desconto|\bcorte\b|\breduz|redução de preço|oferta|bônus|taxa (zero|0)|\bjuros?\b|financiament|mais barat|fica mais car|reajust|aumenta (o )?preço/i],
  ["lancamentos", /lança|lançament|estreia|\bchega|nova geração|flagra|revela|apresenta|reestiliza|facelift|pré-venda|teaser|\bganham?\b|\brecebe|\bmelhora|\batualiza|sai de linha|fim de linha|\bversões?\b|série especial|edição limitada/i],
  ["precos", /\bpreços?\b|\bR\$\s?\d|tabela/i],
];
const assuntoDe = (texto) => (RX_ASSUNTO.find(([, rx]) => rx.test(texto)) || ["outras"])[0];
const semAcento = (t) => String(t || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function montarFeed({ noticiasDb, avisosDb, radarDb, modelos, marcas }) {
  const porUrl = new Map();
  const marcaPorNome = new Map([...marcas.values()].map((b) => [semAcento(b.nome), b.id]));
  const bidDe = (mid) => (modelos.get(mid) || {}).bid || [...marcas.keys()].find((b) => mid && mid.startsWith(b + "-")) || null;
  const juntar = (chave, base, mids, bids) => {
    let it = porUrl.get(chave);
    if (!it) { it = { ...base, mids: new Set(), bids: new Set() }; porUrl.set(chave, it); }
    else {
      if ((base.summary || "").length > (it.summary || "").length) it.summary = base.summary;
      if (String(base.date || "") > String(it.date || "")) it.date = base.date;
    }
    mids.forEach((m) => m && it.mids.add(m));
    bids.forEach((b) => b && it.bids.add(b));
    return it;
  };
  for (const n of noticiasDb) {
    const url = urlSegura(n.url); if (!url || !n.title) continue;
    juntar(url, { tipo: "noticia", assunto: assuntoDe(`${n.title} ${n.summary || ""}`), title: n.title, summary: n.summary || "", source: n.source || "", url, date: n.date || "" }, [n.model_id], [bidDe(n.model_id)]);
  }
  for (const r of radarDb) {
    const url = urlSegura(r.url); if (!url || !r.title) continue;
    const bid = r.model_id ? bidDe(r.model_id) : marcaPorNome.get(semAcento(r.brand)) || null;
    const assunto = ASSUNTO_RADAR[r.kind] || assuntoDe(`${r.title} ${r.summary || ""}`); // evento e "outro": pelo texto
    const it = juntar(url, { tipo: "mercado", assunto, title: r.title, summary: r.summary || "", source: r.source || "", url, date: r.date || "" }, [r.model_id], [bid]);
    if (it.tipo === "noticia" && ASSUNTO_RADAR[r.kind]) it.assunto = ASSUNTO_RADAR[r.kind]; // o tipo dado pelo radar é mais preciso que o palpite pelo título
  }
  for (const a of avisosDb) {
    const url = urlSegura(a.url); if (!a.title) continue;
    const chave = url || `aviso:${a.title}|${a.date}`;
    const it = juntar(chave, { tipo: "aviso", assunto: "recalls", aviso: a.kind || "recall", title: a.title, summary: a.summary || "", affects: a.affects || "", source: a.source || "", url, date: a.date || "" }, [a.model_id], [bidDe(a.model_id)]);
    if (!it.affects && a.affects) it.affects = a.affects;
  }
  return [...porUrl.values()].map((it, i) => {
    const mids = [...it.mids].filter((m) => modelos.has(m));
    const tipos = new Set(mids.map((m) => modelos.get(m).carroc).filter(Boolean));
    return { ...it, mids, bids: [...it.bids], tipos: [...tipos], busca: semAcento(`${it.title} ${it.summary} ${it.source} ${mids.map((m) => modelos.get(m).titulo).join(" ")}`), ordem: i };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.ordem - b.ordem);
}
export { semAcento };

