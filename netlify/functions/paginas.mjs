/* Autokan: páginas próprias de cada carro, marca e lista, montadas no servidor a partir do banco,
   e o sitemap.xml. A Netlify guarda cada página pronta por 1 hora (e serve a guardada enquanto
   prepara a nova), então o banco é lido poucas vezes e as páginas acompanham o que muda nele. */
import { SITE, carregar, FAIXAS, TIPOS, COMBUSTIVEIS, filtrar, imagem } from "../lib/base.mjs";
import { paginaModelo, paginaMarca, paginaCarros, paginaLista, pagina404, esc } from "../lib/paginas.mjs";

const LISTAS = new Map([...FAIXAS, ...TIPOS, ...COMBUSTIVEIS].map((l) => [l.slug, l]));

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

  let base;
  try { base = await carregar(); }
  catch (e) {
    console.error("paginas: falha ao ler o banco", e);
    return new Response("O Autokan está atualizando os dados. Tente de novo em alguns minutos.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "120" } });
  }

  if (caminho === "/sitemap.xml") return sitemap(base);
  if (caminho === "/carros") return html(paginaCarros(base));

  const p = caminho.split("/").filter(Boolean);
  if (p[0] === "carros" && p.length === 2) {
    const b = base.marcas.get(p[1]);
    return b ? html(paginaMarca(base, b)) : naoAchou();
  }
  if (p[0] === "carros" && p.length === 3) {
    const m = base.modelos.get(`${p[1]}-${p[2]}`);
    return m && m.bid === p[1] && m.marcaInfo ? html(paginaModelo(base, m)) : naoAchou();
  }
  if (p.length === 1 && LISTAS.has(p[0])) {
    const l = LISTAS.get(p[0]);
    return filtrar(base, l).length ? html(paginaLista(base, l)) : naoAchou();
  }
  return naoAchou();
};

function sitemap(base) {
  const dia = (d) => (d ? String(d).slice(0, 10) : base.lerEm.slice(0, 10));
  const url = (loc, mod, imgs = []) => `<url><loc>${SITE}${loc}</loc><lastmod>${dia(mod)}</lastmod>${imgs.map(([src, titulo]) => `<image:image><image:loc>${esc(SITE + src)}</image:loc><image:title>${esc(titulo)}</image:title></image:image>`).join("")}</url>`;
  const linhas = [
    url("/", base.atualizado), url("/carros", base.atualizado),
    ...[...FAIXAS, ...TIPOS, ...COMBUSTIVEIS].filter((l) => filtrar(base, l).length).map((l) => url(`/${l.slug}`, base.atualizado)),
    ...[...base.marcas.values()].map((b) => url(b.url, b.atualizado)),
    ...[...base.modelos.values()].filter((m) => m.marcaInfo).map((m) => url(m.url, m.atualizado, m.foto ? [[imagem(m.foto, 1200), `${m.titulo}${m.ano ? ` ${m.ano}` : ""} (imagem ilustrativa)`]] : [])),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${linhas.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", ...CACHE_OK } });
}

// escrito por extenso: a Netlify lê esta configuração sem rodar o código. Os tipos são os de TIPOS em netlify/lib/base.mjs.
export const config = {
  path: ["/carros", "/carros/*", "/carros-*", "/sitemap.xml", "/suvs", "/picapes", "/sedas", "/hatches", "/esportivos", "/vans", "/peruas", "/minivans"],
  method: ["GET", "HEAD"],
};
