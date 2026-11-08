/* Autokan: páginas próprias de cada carro, marca e lista, montadas no servidor a partir do banco,
   e o sitemap.xml. A Netlify guarda cada página pronta por 1 hora (e serve a guardada enquanto
   prepara a nova), então o banco é lido poucas vezes e as páginas acompanham o que muda nele. */
import { SITE, carregar, semAcento, FAIXAS, FAIXAS_ENTRE, TIPOS, COMBUSTIVEIS, filtrar, imagem, faixaPorSlug, lerMil, slugFaixa } from "../lib/base.mjs";
import { paginaModelo, paginaMarca, paginaCarros, paginaLista, pagina404, esc } from "../lib/paginas.mjs";
import { lerFiltros, paginaNoticias } from "../lib/noticias.mjs";
import { paginaNovidades } from "../lib/novidades.mjs";
import { paginaContato } from "../lib/contato.mjs";
import { paginaTermos, paginaPrivacidade } from "../lib/termos.mjs";
import { desligarAvisos, paginaAvisos } from "../lib/avisos.mjs";
import { RANKING, RANKINGS, paginaRanking, linhasRanking } from "../lib/rankings.mjs";
import { lerComparacao, paginaComparacao, paginaEscolher, paginaComparacoes, paresPopulares } from "../lib/comparar.mjs";

const LISTAS = new Map([...FAIXAS, ...FAIXAS_ENTRE, ...TIPOS, ...COMBUSTIVEIS].map((l) => [l.slug, l]));

const CACHE_OK = { "Cache-Control": "public, max-age=0, must-revalidate", "Netlify-CDN-Cache-Control": "s-maxage=3600,stale-while-revalidate=86400,durable" };
const CACHE_404 = { "Cache-Control": "public, max-age=0, must-revalidate", "Netlify-CDN-Cache-Control": "s-maxage=600,durable" };
const html = (corpo, status = 200, extra = {}) => new Response(corpo, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...(status === 200 ? CACHE_OK : CACHE_404), ...extra } });
const naoAchou = () => html(pagina404(), 404, { "X-Robots-Tag": "noindex" });

export default async (req) => {
  const url = new URL(req.url);
  let caminho;
  try { caminho = decodeURIComponent(url.pathname); } catch { return naoAchou(); }

  // um endereço só para cada página: sem barra no fim e em minúsculas
  const certo = caminho.length > 1 ? caminho.replace(/\/+$/, "").toLowerCase() : caminho;
  if (certo !== caminho) return new Response(null, { status: 301, headers: { Location: `${encodeURI(certo)}${url.search}`, ...CACHE_OK } });

  // contato: não depende do banco
  if (caminho === "/contato") return html(paginaContato());
  if (caminho === "/termos") return html(paginaTermos());
  if (caminho === "/privacidade") return html(paginaPrivacidade());
  // link "desligar avisos de preço" do e-mail: abrir o link só mostra a confirmação (programas de e-mail abrem
  // links sozinhos); desliga no POST, que vem do botão da página ou do "cancelar inscrição" do Gmail e outros
  if (caminho === "/avisos/desligar") {
    const t = url.searchParams.get("t") || "";
    const semCache = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
    if (req.method !== "POST") return new Response(paginaAvisos(/^[0-9a-f-]{36}$/i.test(t) ? "confirmar" : "invalido", t), { status: 200, headers: semCache });
    let ok = false;
    try { ok = await desligarAvisos(t); } catch (e) { console.error("avisos: falha ao desligar", e); }
    const navegador = (req.headers.get("accept") || "").includes("text/html");
    if (!navegador) return new Response(ok ? "ok" : "nao encontrado", { status: ok ? 200 : 404, headers: { ...semCache, "Content-Type": "text/plain; charset=utf-8" } });
    return new Response(paginaAvisos(ok ? "ok" : "invalido"), { status: ok ? 200 : 404, headers: semCache });
  }

  let base;
  try { base = await carregar(); }
  catch (e) {
    console.error("paginas: falha ao ler o banco", e);
    return new Response("O Autokan está atualizando os dados. Tente de novo em alguns minutos.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "120" } });
  }

  if (caminho === "/sitemap.xml") return sitemap(base);
  if (caminho === "/busca.json") return busca(base);
  if (caminho === "/carros") return html(paginaCarros(base));
  if (caminho === "/comparar") return html(paginaComparacoes(base));
  // lançamentos: a lista muda quando entra um lançamento ou acaba um prazo; a Netlify guarda por 1 hora como as outras
  if (caminho === "/novidades") return html(paginaNovidades(base));
  if (caminho === "/noticias") {
    // o feed muda várias vezes por dia: a Netlify guarda por 15 minutos, uma cópia para cada combinação de filtros
    return html(paginaNoticias(base, lerFiltros(base, url.searchParams)), 200, {
      "Netlify-CDN-Cache-Control": "s-maxage=900,stale-while-revalidate=3600,durable",
      "Netlify-Vary": "query=q|assunto|marca|tipo|periodo|pagina",
    });
  }

  const p = caminho.split("/").filter(Boolean);
  if (p[0] === "carros" && p.length === 2) {
    const b = base.marcas.get(p[1]);
    return b ? html(paginaMarca(base, b)) : naoAchou();
  }
  if (p[0] === "carros" && p.length === 3) {
    const m = base.modelos.get(`${p[1]}-${p[2]}`);
    return m && m.bid === p[1] && m.marcaInfo ? html(paginaModelo(base, m)) : naoAchou();
  }
  if (p[0] === "comparar" && p.length === 2) {
    // a página muda conforme as versões escolhidas: a Netlify guarda uma cópia para cada escolha
    const porVersao = { "Netlify-Vary": "query=versoes|versao|v0|v1|v2|v3" };
    if (!p[1].includes("-vs-")) {
      const m = base.modelos.get(p[1]);
      return m && m.aVenda && m.marcaInfo ? html(paginaEscolher(base, m, url.searchParams.get("versao") || (url.searchParams.get("versoes") || "").split(",")[0]), 200, porVersao) : naoAchou();
    }
    const pares = lerComparacao(base, p[1], url.searchParams);
    return pares ? html(paginaComparacao(base, pares), 200, porVersao) : naoAchou();
  }
  // caixa "De R$ … até R$ …": leva ao endereço da faixa (ex.: /carros-de-150-a-200-mil)
  if (caminho === "/carros-faixa") {
    const alvo = slugFaixa(lerMil(url.searchParams.get("de")), lerMil(url.searchParams.get("ate")));
    const ver = url.searchParams.get("ver") === "versoes" ? "?ver=versoes" : "";
    return new Response(null, { status: 302, headers: { Location: alvo ? `/${alvo}${ver}` : "/carros#precos", "Cache-Control": "no-store" } });
  }
  if (p.length === 1 && RANKING.has(p[0])) return html(paginaRanking(base, RANKING.get(p[0])));
  if (p.length === 1) {
    const l = LISTAS.get(p[0]) || faixaPorSlug(p[0]);
    if (l) {
      const q = url.searchParams, de = lerMil(q.get("de")), ate = lerMil(q.get("ate"));
      const opts = { de: de ? de * 1000 : 0, ate: ate ? ate * 1000 : 0, versoes: q.get("ver") === "versoes" };
      if (opts.de && opts.ate && opts.de > opts.ate) [opts.de, opts.ate] = [opts.ate, opts.de];
      return html(paginaLista(base, l, opts), 200, { "Netlify-Vary": "query=de|ate|ver" });
    }
  }
  return naoAchou();
};

/* lista para a busca do topo das páginas: modelos à venda e marcas */
function busca(base) {
  const m = base.aVenda.map((x) => ({ n: x.titulo, u: x.url, p: x.precoMin || 0, q: semAcento(`${x.marca} ${x.nome} ${x.carroc}`) }))
    .sort((a, b) => a.n.localeCompare(b.n, "pt-BR"));
  const b = [...base.marcas.values()].filter((x) => x.aVenda.length).map((x) => ({ n: x.nome, u: x.url, s: `${x.aVenda.length} ${x.aVenda.length > 1 ? "modelos" : "modelo"}`, q: semAcento(x.nome) }));
  return new Response(JSON.stringify({ m, b }), { headers: { "Content-Type": "application/json; charset=utf-8", ...CACHE_OK } });
}

function sitemap(base) {
  const dia = (d) => (d ? String(d).slice(0, 10) : base.lerEm.slice(0, 10));
  const url = (loc, mod, imgs = []) => `<url><loc>${SITE}${loc}</loc><lastmod>${dia(mod)}</lastmod>${imgs.map(([src, titulo]) => `<image:image><image:loc>${esc(SITE + src)}</image:loc><image:title>${esc(titulo)}</image:title></image:image>`).join("")}</url>`;
  const linhas = [
    url("/", base.atualizado), url("/carros", base.atualizado), url("/comparar", base.atualizado), url("/noticias", (base.feed[0] || {}).date || base.atualizado), url("/novidades", (base.lancamentos[0] || {}).lancado_em || base.atualizado), url("/contato", "2026-11-06"), url("/termos", "2026-11-07"), url("/privacidade", "2026-11-07"),
    ...[...FAIXAS, ...FAIXAS_ENTRE, ...TIPOS, ...COMBUSTIVEIS].filter((l) => filtrar(base, l).length).map((l) => url(`/${l.slug}`, base.atualizado)),
    ...RANKINGS.filter((r) => linhasRanking(base, r).length >= 3).map((r) => url(`/${r.slug}`, base.atualizado)),
    ...[...base.marcas.values()].map((b) => url(b.url, b.atualizado)),
    ...[...base.modelos.values()].filter((m) => m.marcaInfo).map((m) => url(m.url, m.atualizado, m.foto ? [[imagem(m.foto, 1200), `${m.titulo}${m.ano ? ` ${m.ano}` : ""} (imagem ilustrativa)`]] : [])),
    ...[...paresPopulares(base)].map(([u, [a, b]]) => url(u, a.atualizado > b.atualizado ? a.atualizado : b.atualizado)),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${linhas.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", ...CACHE_OK } });
}

// escrito por extenso: a Netlify lê esta configuração sem rodar o código. Os tipos são os de TIPOS em netlify/lib/base.mjs.
export const config = {
  path: ["/carros", "/carros/*", "/carros-*", "/comparar", "/comparar/*", "/noticias", "/novidades", "/contato", "/termos", "/privacidade", "/avisos/desligar", "/sitemap.xml", "/busca.json", "/suvs-com-maior-porta-malas", "/suvs", "/picapes", "/sedas", "/hatches", "/esportivos", "/vans", "/peruas", "/minivans"],
  method: ["GET", "HEAD"],
};
