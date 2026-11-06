/* Autokan: HTML das páginas próprias (carro, marca, todas as marcas e listas).
   Tudo sai pronto do servidor, para o Google ler sem depender de JavaScript. */
import { SITE, FAIXAS, TIPOS, COMBUSTIVEIS, filtrar, parecidos, imagem } from "./base.mjs";
import { ICONS, TAGDESC } from "./pontos-fortes.mjs";

/* ---------- formatação */

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const reais = (n) => `R$\u00a0${num(n)}`; // sem quebra de linha entre "R$" e o valor
export const pl = (n, um, varios) => `${num(n)} ${n === 1 ? um : varios}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesAno = (s) => { const m = /^(\d{4})-(\d{2})/.exec(s || ""); return m ? `${MESES[+m[2] - 1]}/${m[1]}` : ""; };
const dataBr = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
export const lista = (itens) => (itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`);
export const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ""}</svg>`;
export const SETA = '<svg class="ext" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const STATUS = { on_sale: "À venda", announced: "Anunciado", pre_order: "Pré-venda" };
export const COMB_FRASE = { Flex: "flex", Gasolina: "a gasolina", Etanol: "a etanol", Diesel: "a diesel", "Elétrico": "100% elétrico", "Híbrido": "híbrido", "Híbrido plug-in": "híbrido plug-in" };
const PAIS_EM = { Brasil: "no Brasil", China: "na China", "México": "no México", Argentina: "na Argentina", Alemanha: "na Alemanha", EUA: "nos EUA", "Estados Unidos": "nos Estados Unidos", "Japão": "no Japão", "Coreia do Sul": "na Coreia do Sul", "Índia": "na Índia", "França": "na França", Espanha: "na Espanha", "Itália": "na Itália", "Reino Unido": "no Reino Unido", "Tailândia": "na Tailândia", Hungria: "na Hungria", "Eslováquia": "na Eslováquia", "Suécia": "na Suécia", "Bélgica": "na Bélgica", Turquia: "na Turquia", Uruguai: "no Uruguai", "Áustria": "na Áustria", Portugal: "em Portugal", "Indonésia": "na Indonésia", "África do Sul": "na África do Sul", "Polônia": "na Polônia", "República Tcheca": "na República Tcheca", "Canadá": "no Canadá", "Malásia": "na Malásia", Inglaterra: "na Inglaterra", Holanda: "na Holanda", "Países Baixos": "nos Países Baixos" };
const paisEm = (p) => PAIS_EM[p] || `em ${p}`;
const IMG_OG = `${SITE}/marca/autokan-compartilhar.jpg`;
const FONTES = "https://fonts.googleapis.com/css2?family=Sora:wght@300;600;700&family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap";

/* ---------- moldura comum */

const CSS = `
:root{--bg:#fff;--panel:#f5f7fa;--ink:#0c111c;--muted:#5d6577;--faint:#a9b0be;--line:#e7eaf0;--accent:#1d6bff;--accent-ink:#1857d6;--accent-soft:rgba(29,107,255,.08);--navy:#060b1c;--ok:#11864c;--warn:#b02a15;
  --display:"Sora","Segoe UI",system-ui,sans-serif;--body:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
html{background:var(--navy);-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.55 var(--body);-webkit-font-smoothing:antialiased}
a{color:var(--accent-ink)}
img{max-width:100%;height:auto;display:block}
.wrap{width:min(1120px,100%);margin:0 auto;padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right))}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.pular{position:absolute;left:12px;top:-60px;z-index:9;background:#fff;color:var(--ink);padding:8px 12px;border-radius:10px;font-weight:700}
.pular:focus{top:12px}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
/* topo */
.top{background:var(--navy);color:#fff;position:sticky;top:0;z-index:5;padding-top:env(safe-area-inset-top)}
.top-in{display:flex;align-items:center;gap:18px;height:60px}
.logo{display:flex;align-items:center;flex:none}
.logo .ico{display:none}
.top-nav{display:flex;gap:4px;margin-left:auto}
.top-nav a{color:#c9d3e6;text-decoration:none;font-weight:700;font-size:13.5px;padding:8px 10px;border-radius:10px}
.top-nav a:hover{color:#fff;background:rgba(255,255,255,.08)}
.top-cta{flex:none;display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:999px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;font-size:13.5px}
.top-cta svg{width:16px;height:16px}
.so-cel{display:none}
@media (max-width:640px){.logo .full{display:none}.logo .ico{display:block}.top-in{gap:8px}.top-nav a{padding:8px 7px;font-size:13px}.top-nav .so-pc,.top-cta .so-pc{display:none}.top-cta .so-cel{display:inline}.top-cta{height:32px;padding:0 11px;font-size:13px}}
/* trilha */
.trilha ol{list-style:none;display:flex;flex-wrap:wrap;gap:2px 0;margin:0;padding:18px 0 6px;font-size:13px;color:var(--muted)}
.trilha li+li::before{content:"/";margin:0 8px;color:var(--faint)}
.trilha a{color:var(--muted);text-decoration:none}
.trilha a:hover{color:var(--accent-ink);text-decoration:underline}
/* títulos e texto */
h1,h2,h3{font-family:var(--display);letter-spacing:-.02em;line-height:1.15;margin:0}
h1{font-weight:700;font-size:clamp(28px,4.6vw,42px)}
h2{font-weight:600;font-size:clamp(20px,2.6vw,26px);margin:0 0 14px}
h3{font-weight:600;font-size:16.5px;margin:0 0 4px}
.lead{font-size:17px;color:#3b4352;margin:12px 0 0;max-width:68ch}
.sec{padding:34px 0 6px}
.sec+.sec{border-top:1px solid var(--line);margin-top:28px}
.nota{font-size:13px;color:var(--muted);margin:12px 0 0;max-width:80ch}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
/* topo da página do carro */
.hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:28px;align-items:center;padding:10px 0 4px}
.hero-mk{display:inline-flex;align-items:center;gap:9px;text-decoration:none;color:var(--muted);font-weight:800;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.hero-mk:hover{color:var(--accent-ink)}
.hero-mk span{width:30px;height:30px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;overflow:hidden;padding:4px}
.hero-mk img{width:100%;height:100%;object-fit:contain}
.hero-sub{margin:10px 0 0;color:var(--muted);font-weight:600}
.preco{margin:20px 0 0;padding:16px 18px;border-radius:18px;background:var(--panel)}
.preco b{display:block;font-family:var(--mono);font-weight:600;font-size:clamp(22px,3.2vw,30px);letter-spacing:-.03em;line-height:1.15}
.preco small{display:block;margin-top:6px;font-size:12.5px;color:var(--muted)}
.preco .v{white-space:nowrap}
.preco .w{font-family:var(--body);font-weight:700;font-size:.62em;letter-spacing:0;color:var(--muted)}
.selos{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 0;padding:0;list-style:none}
.selo{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:5px 11px 5px 7px;border-radius:999px}
.selo svg,.pf-ic svg{width:15px;height:15px}
.acoes{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0 0}
.btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:12px;font-weight:700;font-size:14.5px;text-decoration:none;border:1px solid var(--line);color:var(--ink);background:#fff}
.btn.pri{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 10px 24px -12px rgba(29,107,255,.6)}
.btn:hover{border-color:var(--accent)}
.btn svg{width:16px;height:16px}
.ext{width:12px;height:12px;display:inline-block;vertical-align:-1px;margin-left:3px}
.foto{margin:0;position:relative;border-radius:22px;background:radial-gradient(120% 90% at 50% 100%,#eef2f8 0,#f7f9fc 60%,#fff 100%);aspect-ratio:16/9;display:grid;place-items:center;overflow:hidden}
.foto img{width:100%;height:100%;object-fit:contain}
.foto figcaption,.ilus{position:absolute;right:12px;bottom:10px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:rgba(255,255,255,.85);padding:3px 7px;border-radius:6px}
.foto .sem,.mc-sem{font-family:var(--display);font-weight:300;font-size:28px;color:var(--faint);letter-spacing:-.03em;padding:0 16px;text-align:center}
@media (max-width:860px){.hero{grid-template-columns:1fr;gap:18px}.hero .foto{order:-1}}
/* tabela de versões */
.tab-wrap{border:1px solid var(--line);border-radius:18px;overflow:hidden}
.vt{width:100%;border-collapse:collapse;font-size:14px}
.vt th{text-align:left;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);background:var(--panel);padding:10px 12px;white-space:nowrap}
.vt td{padding:12px;border-top:1px solid var(--line);vertical-align:top}
.vt td.vn{font-weight:700}
.vt td.vp{font-family:var(--mono);font-weight:600;white-space:nowrap}
.vt td.vp small{display:block;font-family:var(--body);font-weight:600;font-size:11.5px;color:var(--muted)}
.vt .na{color:var(--faint)}
.vt a{font-size:12.5px;font-weight:700;text-decoration:none;white-space:nowrap}
.st{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;background:#fff6dc;color:#8b6500;margin-left:6px;vertical-align:1px}
@media (max-width:760px){.tab-wrap{border:0;border-radius:0;overflow:visible}.vt thead{display:none}.vt,.vt tbody,.vt tr,.vt td{display:block;width:100%}
  .vt tr{border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin-bottom:10px}
  .vt td{border:0;padding:3px 0;display:flex;justify-content:space-between;gap:14px;text-align:right}
  .vt td::before{content:attr(data-l);font:700 12px var(--body);color:var(--muted);text-align:left;flex:none;padding-top:2px}
  .vt td.vn{display:block;text-align:left;font-size:15.5px;padding-bottom:6px}.vt td.vn::before{content:none}
  .vt td.vp small{text-align:right}}
@media (max-width:520px){.acoes .btn{flex:1 1 100%;justify-content:center}}
/* pontos fortes */
.pf{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;list-style:none;margin:0;padding:0}
.pf li{display:flex;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:16px}
.pf-ic{width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center}
.pf p{margin:2px 0 0;font-size:13.5px;color:#3b4352}
.pf small{display:block;margin-top:6px;font-size:12.5px;color:var(--muted)}
${["eletrico:#fbf3db:#e0a800", "hibrido:#deeee6:#11864c", "potente:#fae3e0:#d83a22", "economico:#dfeaff:#1d6bff", "turbo:#ece6f9:#7a4fd6", "x4:#dddedf:#0c111c", "diesel:#fceadd:#ea6a0c", "espaco:#e4e6fa:#4150d8", "tech:#dcf0f4:#0891b2"]
  .map((x) => { const [k, bg, c] = x.split(":"); return `[data-k="${k}"]{background:${bg};color:${c}}.selo[data-k="${k}"] svg{color:${c}}`; }).join("")}
.selo[data-k]{color:#1f2633}
/* ficha e perguntas */
.ficha{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:0}
.ficha div{padding:12px 14px;border-radius:14px;background:var(--panel)}
.ficha dt{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.ficha dd{margin:3px 0 0;font-weight:700}
.faq{display:grid;gap:18px;max-width:78ch}
.faq p{margin:0;color:#3b4352}
/* notícias e avisos */
.nt{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.nt li{padding:14px 16px;border:1px solid var(--line);border-radius:16px}
.nt a{font-family:var(--display);font-weight:600;font-size:15.5px;color:var(--ink);text-decoration:none;letter-spacing:-.01em}
.nt a:hover{color:var(--accent-ink);text-decoration:underline}
.nt p{margin:6px 0 0;font-size:14px;color:#3b4352}
.nt small{display:block;margin-top:8px;font-size:12px;color:var(--muted);font-weight:600}
.nt .av{border-color:#f5c6bf;background:#fffafa}
.nt .av b{font-family:var(--display);font-weight:600;font-size:15.5px}
/* cartões de carro e de marca */
.grade{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.mc{display:flex;flex-direction:column;height:100%;border:1px solid var(--line);border-radius:18px;overflow:hidden;text-decoration:none;color:var(--ink);background:#fff;transition:border-color .2s,box-shadow .2s,transform .2s}
.mc:hover{border-color:rgba(29,107,255,.5);box-shadow:0 18px 36px -24px rgba(29,107,255,.55);transform:translateY(-2px)}
.mc-ph{position:relative;aspect-ratio:16/9;background:radial-gradient(120% 90% at 50% 100%,#eef2f8 0,#f7f9fc 60%,#fff 100%);display:grid;place-items:center}
.mc-ph img{width:100%;height:100%;object-fit:contain}
.mc-sem{font-size:20px}
.mc-tx{display:flex;flex-direction:column;gap:2px;padding:12px 14px 14px;flex:1}
.mc-mk{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.mc-nm{font-family:var(--display);font-weight:600;font-size:17px;letter-spacing:-.02em;line-height:1.2}
.mc-sub{font-size:12.5px;color:var(--muted);font-weight:600}
.mc-pr{margin-top:auto;padding-top:8px;font-family:var(--mono);font-weight:600;font-size:15px;letter-spacing:-.02em}
.mc-pr small{font-family:var(--body);font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:0;margin-right:4px}
.mc-x{font-size:12px;color:var(--ok);font-weight:700}
@media (max-width:520px){.grade{grid-template-columns:1fr 1fr;gap:10px}.mc{border-radius:14px}.mc-tx{padding:9px 10px 11px}.mc-nm{font-size:15px}.mc-sub{font-size:11.5px}.mc-pr{font-size:13px}.mc-pr small{display:block;margin:0 0 1px}.mc-sem{font-size:15px}}
.marcas{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.bc{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:16px;text-decoration:none;color:var(--ink);transition:border-color .2s}
.bc:hover{border-color:rgba(29,107,255,.5)}
.bc-lg{width:42px;height:42px;flex:none;border-radius:50%;background:#fff;box-shadow:0 0 0 1px var(--line);display:grid;place-items:center;overflow:hidden;padding:6px;font:800 12px var(--body);color:var(--muted)}
.bc-lg img{width:100%;height:100%;object-fit:contain}
.bc b{display:block;font-family:var(--display);font-weight:600;font-size:15.5px}
.bc small{display:block;font-size:12.5px;color:var(--muted);font-weight:600}
.chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.chips a{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);font-weight:700;font-size:13.5px;background:#fff}
.chips a:hover{border-color:var(--accent);color:var(--accent-ink)}
.chips a[aria-current]{background:var(--ink);border-color:var(--ink);color:#fff}
.chips small{font-family:var(--mono);font-size:11.5px;color:var(--muted);font-weight:600}
.chips a[aria-current] small{color:#c9d3e6}
.lista-top{display:flex;flex-direction:column;gap:14px;padding:6px 0 0}
.lista-top .chips{margin-top:6px}
@media (max-width:640px){.lead{font-size:15.5px}.lista-top .chips{flex-wrap:nowrap;overflow-x:auto;margin-left:-16px;margin-right:-16px;padding:2px 16px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.lista-top .chips::-webkit-scrollbar{display:none}.lista-top .chips li{flex:none}}
.marca-top{display:flex;align-items:center;gap:16px;padding:6px 0 0}
.marca-top .bc-lg{width:64px;height:64px;padding:9px}
/* rodapé */
.foot{margin-top:56px;background:var(--navy);color:#c9d3e6;padding:40px 0 calc(28px + env(safe-area-inset-bottom))}
.foot-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:26px}
.foot b{display:block;color:#fff;font-family:var(--display);font-weight:600;font-size:14px;margin-bottom:10px}
.foot ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.foot a{color:#c9d3e6;text-decoration:none;font-size:13.5px}
.foot a:hover{color:#fff;text-decoration:underline}
.foot-nota{margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);font-size:12.5px;line-height:1.6;color:#9fb1d1;max-width:90ch}
.foot-copy{margin:10px 0 0;font-size:12.5px;color:#9fb1d1}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`.replace(/\n\s*/g, "");

export const COMPARAR_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16M16 4v16M4 8h8M12 16h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
/* endereço oficial da comparação de dois carros: os dois em ordem alfabética, para "A x B" e "B x A" serem a mesma página */
export const urlPar = (a, b) => `/comparar/${[a.id, b.id].sort().join("-vs-")}`;
export const ROLETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 1 1 16 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 16l4-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

function topo() {
  return `<header class="top"><div class="wrap top-in">
<a class="logo" href="/" aria-label="Autokan: página inicial"><img class="full" src="/marca/autokan-logo-topo-escuro.png?v=5" alt="Autokan" width="168" height="18"><img class="ico" src="/marca/autokan-simbolo-topo.png?v=5" alt="Autokan" width="42" height="18"></a>
<nav class="top-nav" aria-label="Principal"><a class="so-pc" href="/carros">Marcas</a><a class="so-pc" href="/carros#precos">Preços</a><a class="so-pc" href="/carros#tipos">Tipos</a><a href="/noticias">Notícias</a><a href="/comparar">Comparar</a></nav>
<a class="top-cta" href="/">${ROLETA}<span class="so-pc">Roleta de preços</span><span class="so-cel">Roleta</span></a>
</div></header>`;
}

function rodape() {
  const col = (titulo, itens) => `<div><b>${titulo}</b><ul>${itens.map(([u, t]) => `<li><a href="${u}">${esc(t)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="foot"><div class="wrap">
<div class="foot-cols">
${col("Por preço", FAIXAS.map((f) => [`/${f.slug}`, f.titulo.replace("Carros 0 km ", "")]))}
${col("Por tipo", TIPOS.map((t) => [`/${t.slug}`, t.curto]))}
${col("Por combustível", COMBUSTIVEIS.map((c) => [`/${c.slug}`, c.curto]))}
${col("Autokan", [["/", "Roleta de preços"], ["/carros", "Todas as marcas"], ["/comparar", "Comparar carros"], ["/noticias", "Notícias"]])}
</div>
<p class="foot-nota">Preços de tabela sugeridos pelas montadoras ou, quando elas não divulgam, da Tabela FIPE para carro 0 km. Cada versão tem link para a fonte. As fotos são ilustrativas. Confirme preço, versões e equipamentos com a concessionária antes de comprar.</p>
<p class="foot-copy">© ${new Date().getFullYear()} Autokan · Conheça. Compare. Escolha.</p>
</div></footer>`;
}

export function pagina({ titulo, descricao, caminho, imagemOg, imagemOgW = 800, imagemOgH = 450, imagemAlt, tipoOg = "website", ld = [], corpo, indexar = true, css = "" }) {
  const og = imagemOg || IMG_OG;
  const [ow, oh] = imagemOg ? [imagemOgW, imagemOgH] : [1200, 630];
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
${caminho ? `<link rel="canonical" href="${SITE}${caminho}">\n` : ""}<meta name="robots" content="${indexar ? "index, follow, max-image-preview:large" : "noindex, follow"}">
<meta property="og:type" content="${tipoOg}">
<meta property="og:site_name" content="Autokan">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
${caminho ? `<meta property="og:url" content="${SITE}${caminho}">\n` : ""}<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="${ow}">
<meta property="og:image:height" content="${oh}">
<meta property="og:image:alt" content="${esc(imagemAlt || "Autokan: todos os carros 0 km do Brasil por faixa de preço")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#060b1c">
<meta name="apple-mobile-web-app-title" content="Autokan">
<link rel="icon" type="image/png" sizes="32x32" href="/marca/favicon-32.png?v=5">
<link rel="icon" type="image/png" sizes="192x192" href="/marca/favicon-192.png?v=5">
<link rel="apple-touch-icon" href="/marca/apple-touch-icon.png?v=5">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="${FONTES}" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="${FONTES}"></noscript>
<style>${CSS}${css}</style>
${ld.map((x) => `<script type="application/ld+json">${json(x)}</script>`).join("\n")}
<script src="/tracker.js" defer></script>
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
${topo()}
<main id="conteudo" class="wrap">
${corpo}
</main>
${rodape()}
</body>
</html>`;
}

/* ---------- peças */

export const INICIO = { nome: "Início", url: "/" }, CARROS = { nome: "Carros", url: "/carros" };
export function trilha(itens) {
  return `<nav class="trilha" aria-label="Você está em"><ol>${itens.map((it, i) => (i < itens.length - 1 ? `<li><a href="${it.url}">${esc(it.nome)}</a></li>` : `<li aria-current="page">${esc(it.nome)}</li>`)).join("")}</ol></nav>`;
}
export const ldTrilha = (itens) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: itens.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.nome, item: SITE + it.url })) });
const ldLista = (nome, modelos) => ({ "@context": "https://schema.org", "@type": "ItemList", name: nome, numberOfItems: modelos.length, itemListElement: modelos.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + m.url, name: m.titulo })) });

export function fotoTag(m, w, sizes, prioridade = false) {
  if (!m.foto) return "";
  const ws = [w, Math.round(w * 1.6)];
  return `<img src="${imagem(m.foto, w)}" srcset="${ws.map((x) => `${imagem(m.foto, x)} ${x}w`).join(", ")}" sizes="${sizes}" alt="${esc(`${m.titulo}${m.ano ? ` ${m.ano}` : ""}`)}" width="${w}" height="${Math.round((w * 9) / 16)}" ${prioridade ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export function cartao(m, { de, extra, href } = {}) {
  const preco = de ?? m.precoMin;
  const sub = [m.carroc, m.combs.slice(0, 2).join(" ou "), m.aVenda ? pl(m.versoes.length, "versão", "versões") : STATUS[m.breve[0]?.status] || ""].filter(Boolean).join(" · ");
  return `<li><a class="mc" href="${href || m.url}"><span class="mc-ph">${fotoTag(m, 360, "(max-width:520px) 92vw, 260px") || `<span class="mc-sem">${esc(m.nome)}</span>`}</span><span class="mc-tx"><span class="mc-mk">${esc(m.marca)}</span><span class="mc-nm">${esc(m.nome)}</span><span class="mc-sub">${esc(sub)}</span>${extra ? `<span class="mc-x">${esc(extra)}</span>` : ""}<span class="mc-pr">${preco && Number.isFinite(preco) ? `<small>a partir de</small>${reais(preco)}` : "<small>preço ainda não divulgado</small>"}</span></span></a></li>`;
}

const logoMarca = (b, w = 64) => `<span class="bc-lg">${b.logo ? `<img src="${imagem(b.logo, w * 2)}" alt="" width="${w}" height="${w}" loading="lazy">` : esc(b.nome.slice(0, 2).toUpperCase())}</span>`;
function cartaoMarca(b) {
  const resumo = b.aVenda.length ? `${pl(b.aVenda.length, "modelo", "modelos")}${b.precoMin && Number.isFinite(b.precoMin) ? ` · a partir de ${reais(b.precoMin)}` : ""}` : "em breve";
  return `<li><a class="bc" href="${b.url}">${logoMarca(b, 30)}<span><b>${esc(b.nome)}</b><small>${resumo}</small></span></a></li>`;
}

function chipsListas(base, atual) {
  const chip = (l, rot) => { const n = filtrar(base, l).length; return n ? `<li><a href="/${l.slug}"${l.slug === atual ? ' aria-current="page"' : ""}>${esc(rot || l.curto)} <small>${n}</small></a></li>` : ""; };
  return {
    faixas: `<ul class="chips">${FAIXAS.map((f) => chip(f)).join("")}</ul>`,
    tipos: `<ul class="chips">${TIPOS.map((t) => chip(t)).join("")}</ul>`,
    combs: `<ul class="chips">${COMBUSTIVEIS.map((c) => chip(c)).join("")}</ul>`,
  };
}

/* ---------- página do modelo */

export function rotuloPreco(vs) {
  const comPreco = vs.filter((v) => v.preco);
  if (!comPreco.length) return "Preço ainda não divulgado pela montadora";
  const fipe = comPreco.filter((v) => v.fipe).length, mes = mesAno(comPreco.map((v) => v.mes).filter(Boolean).sort().pop());
  const tipo = fipe === comPreco.length ? "Tabela FIPE 0 km" : fipe ? "Preço sugerido de fábrica ou FIPE 0 km" : "Preço sugerido de fábrica";
  return `${tipo}${mes ? ` em ${mes}` : ""}`;
}

export function paginaModelo(base, m) {
  const marca = m.marcaInfo, nomeAno = `${m.titulo}${m.ano ? ` ${m.ano}` : ""}`;
  const vs = m.aVenda ? m.versoes : m.breve;
  const caminho = m.url;
  const itens = [INICIO, CARROS, { nome: marca.nome, url: marca.url }, { nome: m.nome, url: caminho }];
  const val = (n) => `<span class="v">${reais(n)}</span>`;
  const faixa = m.precoMin ? (m.precoMax && m.precoMax !== m.precoMin ? `<span class="w">De</span> ${val(m.precoMin)} <span class="w">a</span> ${val(m.precoMax)}` : val(m.precoMin)) : '<span class="w">Preço ainda não divulgado</span>';
  const cvTxt = m.cvMin ? (m.cvMax !== m.cvMin ? `de ${m.cvMin} a ${m.cvMax} cv` : `${m.cvMin} cv`) : null;
  const statusTxt = m.aVenda ? "" : STATUS[vs[0]?.status] || "";

  const temAno = new Set(vs.map((v) => v.ano)).size > 1, temTracao = vs.some((v) => v.tracao);
  const linhas = vs.map((v) => `<tr>
<td class="vn">${esc(v.nome || m.nome)}${v.status !== "on_sale" ? `<span class="st">${STATUS[v.status] || ""}</span>` : ""}</td>
${temAno ? `<td data-l="Ano" class="num">${v.ano || '<span class="na">—</span>'}</td>` : ""}
<td data-l="Preço" class="vp">${v.preco ? `<span>${reais(v.preco)}<small>${v.fipe ? "FIPE 0 km" : "sugerido de fábrica"}</small></span>` : '<span class="na">não divulgado</span>'}</td>
<td data-l="Motor">${v.motor ? esc(v.motor) : '<span class="na">—</span>'}</td>
<td data-l="Potência" class="num">${v.cv ? `${v.cv} cv` : '<span class="na">—</span>'}</td>
<td data-l="Câmbio">${v.cambio ? esc(v.cambio) : '<span class="na">—</span>'}</td>
<td data-l="Combustível">${v.comb ? esc(v.comb) : '<span class="na">—</span>'}</td>
${temTracao ? `<td data-l="Tração">${v.tracao ? esc(v.tracao) : '<span class="na">—</span>'}</td>` : ""}
<td data-l="Fonte">${v.fonte && v.fonte.url ? `<a href="${esc(v.fonte.url)}" target="_blank" rel="noopener nofollow" title="${esc(v.fonte.nome)}">Ver fonte${SETA}</a>` : '<span class="na">—</span>'}</td>
</tr>`).join("");
  const tabela = `<div class="tab-wrap"><table class="vt"><thead><tr><th>Versão</th>${temAno ? "<th>Ano</th>" : ""}<th>Preço</th><th>Motor</th><th>Potência</th><th>Câmbio</th><th>Combustível</th>${temTracao ? "<th>Tração</th>" : ""}<th>Fonte</th></tr></thead><tbody>${linhas}</tbody></table></div>`;

  const selos = m.tags.length ? `<ul class="selos">${m.tags.map((t) => `<li class="selo" data-k="${t.k}">${ico(t.k)}${esc(t.nome)}</li>`).join("")}</ul>` : "";
  const pontos = m.tags.length ? `<section class="sec" aria-labelledby="s-pf"><h2 id="s-pf">Pontos fortes do ${esc(m.titulo)}</h2>
<ul class="pf">${m.tags.map((t) => `<li><span class="pf-ic" data-k="${t.k}">${ico(t.k)}</span><div><h3>${esc(t.nome)}</h3><p>${esc(TAGDESC[t.k] || "")}</p>${t.porque ? `<small>No ${esc(m.nome)}: ${esc(t.porque)}</small>` : ""}</div></li>`).join("")}</ul>
<p class="nota">Os pontos fortes seguem as mesmas regras para todos os carros do Autokan, a partir da ficha de cada versão.</p></section>` : "";

  const ficha = [
    ["Tipo", m.carroc], ["Combustível", lista(m.combs)], ["Câmbio", lista(m.cambios)], ["Potência", cvTxt],
    ["Versões à venda", m.aVenda ? String(m.versoes.length) : null], ["Fabricado em", m.fabricado.length ? lista(m.fabricado) : null],
    ["Origem da marca", marca.pais], ["Ano-modelo", m.ano ? String(m.ano) : null],
  ].filter(([, v]) => v);

  // perguntas frequentes: respostas tiradas só dos dados da página
  const mais = m.versoes.filter((v) => v.preco), barata = mais[0], cara = mais[mais.length - 1];
  const faq = [];
  if (barata) faq.push([`Quanto custa o ${nomeAno}?`, `O ${nomeAno} custa a partir de ${reais(barata.preco)}${barata.nome ? ` na versão ${barata.nome}` : ""}${cara && cara !== barata ? ` e chega a ${reais(cara.preco)}${cara.nome ? ` na versão ${cara.nome}` : ""}` : ""}. ${rotuloPreco(m.versoes)}.`]);
  if (barata && mais.length > 1) faq.push([`Qual é a versão mais barata do ${m.titulo}?`, `É a ${barata.nome || m.nome}, por ${reais(barata.preco)}${barata.motor ? `, com motor ${barata.motor}` : ""}${barata.cambio ? ` e câmbio ${barata.cambio.toLowerCase()}` : ""}.`]);
  if (cvTxt) faq.push([`Qual é a potência do ${m.titulo}?`, m.cvMax !== m.cvMin ? `Vai de ${m.cvMin} cv a ${m.cvMax} cv, conforme a versão.` : `Tem ${m.cvMin} cv.`]);
  if (m.combs.length) faq.push([`O ${m.titulo} é flex, elétrico ou híbrido?`, m.combs.length === 1 ? `${m.aVenda && m.versoes.length > 1 ? "Todas as versões são" : "É"} ${COMB_FRASE[m.combs[0]] || m.combs[0].toLowerCase()}.` : `Há versões ${lista(m.combs.map((c) => COMB_FRASE[c] || c.toLowerCase()))}.`]);
  if (m.fabricado.length) faq.push([`Onde o ${m.titulo} é fabricado?`, `O ${m.titulo} vendido no Brasil é fabricado ${lista(m.fabricado.map(paisEm))}.`]);

  const noticias = m.noticias.slice(0, 6);
  const secNoticias = noticias.length ? `<section class="sec" aria-labelledby="s-nt"><h2 id="s-nt">Notícias do ${esc(m.titulo)}</h2><ul class="nt">${noticias.map((n) => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener nofollow">${esc(n.title)}${SETA}</a>${n.summary ? `<p>${esc(n.summary)}</p>` : ""}<small>${esc([n.source, dataBr(n.date)].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul><p class="nota">Resumos escritos pelo Autokan a partir das matérias. O texto completo está no site de cada fonte. <a href="/noticias?marca=${encodeURIComponent(marca.id)}">Todas as notícias da ${esc(marca.nome)}</a></p></section>` : "";
  const avisos = m.avisos.slice(0, 4);
  const secAvisos = avisos.length ? `<section class="sec" aria-labelledby="s-av"><h2 id="s-av">Recalls e avisos</h2><ul class="nt">${avisos.map((a) => `<li class="av"><b>${esc(a.title)}</b>${a.summary ? `<p>${esc(a.summary)}</p>` : ""}${a.affects ? `<p><strong>Afeta:</strong> ${esc(a.affects)}</p>` : ""}<small>${esc([a.source, dataBr(a.date)].filter(Boolean).join(" · "))}${a.url ? ` · <a href="${esc(a.url)}" target="_blank" rel="noopener nofollow" style="font:inherit">ver fonte${SETA}</a>` : ""}</small></li>`).join("")}</ul><p class="nota">Nem todo aviso atinge todas as unidades. Confira os detalhes na fonte e com a montadora.</p></section>` : "";

  const breve = m.aVenda && m.breve.length ? `<p class="nota"><strong>Em breve:</strong> ${esc(lista(m.breve.map((v) => `${v.nome || m.nome} (${(STATUS[v.status] || "").toLowerCase()}${v.preco ? `, ${reais(v.preco)}` : ""})`)))}.</p>` : "";
  const outros = marca.modelos.filter((x) => x.id !== m.id);
  const comp = parecidos(base, m);

  const desc = m.precoMin
    ? `${nomeAno} 0 km: ${m.precoMax !== m.precoMin ? `de ${reais(m.precoMin)} a ${reais(m.precoMax)}` : reais(m.precoMin)} em ${pl(m.versoes.length, "versão", "versões")}. Preço de cada versão, motor, potência, câmbio e pontos fortes.`
    : `${nomeAno}: versões, motor, potência e o que já se sabe do lançamento no Brasil.`;
  const titulo = (() => { const t = `${nomeAno}: preço, versões e ficha técnica`; return t.length <= 55 ? `${t} | Autokan` : t; })();

  const ld = [ldTrilha(itens)];
  const produto = { "@context": "https://schema.org", "@type": ["Product", "Car"], name: nomeAno, brand: { "@type": "Brand", name: marca.nome }, model: m.nome, url: SITE + caminho, description: desc };
  if (m.ano) produto.vehicleModelDate = String(m.ano);
  if (m.carroc) produto.bodyType = m.carroc;
  if (m.combs[0]) produto.fuelType = lista(m.combs);
  if (m.foto) produto.image = [SITE + imagem(m.foto, 1200)];
  if (m.precoMin) produto.offers = { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: m.precoMin, highPrice: m.precoMax || m.precoMin, offerCount: mais.length };
  ld.push(produto);

  const corpo = `${trilha(itens)}
<article>
<section class="hero">
<div>
<a class="hero-mk" href="${marca.url}">${marca.logo ? `<span><img src="${imagem(marca.logo, 64)}" alt="" width="22" height="22"></span>` : ""}${esc(marca.nome)}</a>
<h1>${esc(nomeAno)}</h1>
<p class="hero-sub">${esc([m.carroc, lista(m.combs), m.aVenda ? pl(m.versoes.length, "versão à venda", "versões à venda") : statusTxt].filter(Boolean).join(" · "))}</p>
<div class="preco"><b>${faixa}</b><small>${esc(rotuloPreco(m.versoes))}</small></div>
${selos}
<div class="acoes"><a class="btn pri" href="/?carro=${encodeURIComponent(m.id)}">${ROLETA}Ver na roleta de preços</a><a class="btn" href="/comparar/${m.id}">${COMPARAR_ICO}Comparar com outro carro</a>${marca.site ? `<a class="btn" href="${esc(marca.site)}" target="_blank" rel="noopener">Site da ${esc(marca.nome)}${SETA}</a>` : ""}</div>
</div>
<figure class="foto">${fotoTag(m, 640, "(max-width:860px) 92vw, 540px", true) || `<span class="sem">${esc(m.titulo)}</span>`}${m.foto ? "<figcaption>Imagem ilustrativa</figcaption>" : ""}</figure>
</section>

<section class="sec" aria-labelledby="s-vs"><h2 id="s-vs">Versões e preços do ${esc(nomeAno)}</h2>
${tabela}
<p class="nota">${esc(rotuloPreco(m.versoes))}. Cada versão tem link para a fonte do preço.</p>${breve}
</section>
${pontos}
${ficha.length ? `<section class="sec" aria-labelledby="s-fc"><h2 id="s-fc">Ficha do ${esc(m.titulo)}</h2><dl class="ficha">${ficha.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></section>` : ""}
${faq.length ? `<section class="sec" aria-labelledby="s-fq"><h2 id="s-fq">Perguntas frequentes</h2><div class="faq">${faq.map(([q, r]) => `<div><h3>${esc(q)}</h3><p>${esc(r)}</p></div>`).join("")}</div></section>` : ""}
${secNoticias}
${secAvisos}
${comp.length ? `<section class="sec" aria-labelledby="s-cp"><h2 id="s-cp">Compare o ${esc(m.nome)} com carros da mesma faixa de preço</h2><ul class="grade">${comp.map((x) => cartao(x, { href: urlPar(m, x) })).join("")}</ul><div class="acoes"><a class="btn" href="/comparar/${m.id}">${COMPARAR_ICO}Buscar outro carro para comparar</a></div></section>` : ""}
${outros.length ? `<section class="sec" aria-labelledby="s-om"><h2 id="s-om">Outros carros da ${esc(marca.nome)}</h2><ul class="grade">${outros.map((x) => cartao(x)).join("")}</ul></section>` : ""}
</article>`;

  return pagina({ titulo, descricao: desc, caminho, imagemOg: m.foto ? SITE + imagem(m.foto, 800, "&fm=png") : null, imagemAlt: `${nomeAno} (imagem ilustrativa)`, tipoOg: "product", ld, corpo });
}

/* ---------- página da marca */

export function paginaMarca(base, b) {
  const itens = [INICIO, CARROS, { nome: b.nome, url: b.url }];
  const av = b.aVenda, breve = b.modelos.filter((m) => !m.aVenda);
  const barato = av.find((m) => m.precoMin), caro = [...av].filter((m) => m.precoMax).sort((a, c) => c.precoMax - a.precoMax)[0];
  const tiposMarca = [...new Set(av.map((m) => m.carroc).filter(Boolean))];
  const lead = av.length
    ? `A ${b.nome} tem ${pl(av.length, "modelo", "modelos")} 0 km à venda no Brasil, em ${pl(b.versoes, "versão", "versões")}${barato && caro && barato !== caro ? `, de ${reais(barato.precoMin)} (${barato.nome}) a ${reais(caro.precoMax)} (${caro.nome})` : barato ? `, a partir de ${reais(barato.precoMin)}` : ""}.${tiposMarca.length ? ` Tipos: ${lista(tiposMarca.map((t) => t.toLowerCase().replace("suv", "SUV")))}.` : ""}`
    : `A ${b.nome} ainda não tem carro à venda no Brasil. Veja os lançamentos anunciados.`;
  const titulo = `Carros ${b.nome} 0 km ${base.anoLinha}: preços e versões | Autokan`;
  const desc = av.length
    ? `Todos os ${pl(av.length, "modelo", "modelos")} ${b.nome} 0 km à venda no Brasil${barato ? `, a partir de ${reais(barato.precoMin)}` : ""}. Compare preço de cada versão, motor, potência e ficha técnica.`
    : `Lançamentos ${b.nome} anunciados para o Brasil: modelos, versões previstas e o que já se sabe sobre preço e chegada às lojas.`;
  const outras = [...base.marcas.values()].filter((x) => x.id !== b.id && x.aVenda.length).sort((a, c) => a.nome.localeCompare(c.nome, "pt-BR"));
  const corpo = `${trilha(itens)}
<div class="marca-top">${logoMarca(b, 46)}<div><h1>Carros ${esc(b.nome)} 0 km</h1></div></div>
<p class="lead">${esc(lead)}</p>
<p class="nota">${b.pais ? `Origem da marca: ${esc(b.pais)}.` : ""}${b.site ? ` <a href="${esc(b.site)}" target="_blank" rel="noopener">Site oficial da ${esc(b.nome)}${SETA}</a> ·` : ""} <a href="/noticias?marca=${encodeURIComponent(b.id)}">Notícias da ${esc(b.nome)}</a></p>
${av.length ? `<section class="sec" aria-labelledby="s-md"><h2 id="s-md">Modelos ${esc(b.nome)} à venda</h2><ul class="grade">${av.map((m) => cartao(m)).join("")}</ul></section>` : ""}
${breve.length ? `<section class="sec" aria-labelledby="s-br"><h2 id="s-br">Em breve</h2><ul class="grade">${breve.map((m) => cartao(m)).join("")}</ul></section>` : ""}
<section class="sec" aria-labelledby="s-om"><h2 id="s-om">Outras marcas</h2><ul class="chips">${outras.map((x) => `<li><a href="${x.url}">${esc(x.nome)}</a></li>`).join("")}</ul></section>`;
  return pagina({ titulo, descricao: desc, caminho: b.url, ld: [ldTrilha(itens), ldLista(`Carros ${b.nome} 0 km`, b.modelos)], corpo,
    imagemOg: barato && barato.foto ? SITE + imagem(barato.foto, 800, "&fm=png") : null, imagemAlt: `Carros ${b.nome} 0 km` });
}

/* ---------- todas as marcas */

export function paginaCarros(base) {
  const itens = [INICIO, CARROS];
  const marcas = [...base.marcas.values()].sort((a, c) => (c.aVenda.length ? 1 : 0) - (a.aVenda.length ? 1 : 0) || a.nome.localeCompare(c.nome, "pt-BR"));
  const comVenda = marcas.filter((b) => b.aVenda.length);
  const ch = chipsListas(base);
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>Carros 0 km à venda no Brasil</h1>
<p class="lead">${pl(base.aVenda.length, "modelo", "modelos")} e ${pl(base.totalVersoes, "versão", "versões")} de ${pl(comVenda.length, "marca", "marcas")}, com o preço de cada versão, motor, potência e pontos fortes. Escolha por marca, faixa de preço, tipo ou combustível.</p></div>
<section class="sec" id="precos" aria-labelledby="s-fx"><h2 id="s-fx">Por faixa de preço</h2>${ch.faixas}</section>
<section class="sec" id="tipos" aria-labelledby="s-tp"><h2 id="s-tp">Por tipo</h2>${ch.tipos}</section>
<section class="sec" aria-labelledby="s-cb"><h2 id="s-cb">Por combustível</h2>${ch.combs}</section>
<section class="sec" id="marcas" aria-labelledby="s-mc"><h2 id="s-mc">Marcas</h2><ul class="marcas">${marcas.map(cartaoMarca).join("")}</ul></section>`;
  return pagina({ titulo: "Carros 0 km à venda no Brasil: todas as marcas e preços | Autokan",
    descricao: `Preço, versões e ficha técnica de ${pl(base.aVenda.length, "modelo", "modelos")} 0 km de ${comVenda.length} marcas à venda no Brasil. Encontre por marca, faixa de preço, tipo ou combustível.`,
    caminho: "/carros", ld: [ldTrilha(itens)], corpo });
}

/* ---------- listas: faixa de preço, tipo e combustível */

export function paginaLista(base, l) {
  const achados = filtrar(base, l);
  const caminho = `/${l.slug}`;
  const itens = [INICIO, CARROS, { nome: l.titulo.replace(" 0 km", ""), url: caminho }];
  const n = achados.length, primeiro = achados[0], ano = base.anoLinha;
  const ehFaixa = l.max !== undefined;
  const porTipo = (() => { const c = new Map(); achados.forEach(({ m }) => m.carroc && c.set(m.carroc, (c.get(m.carroc) || 0) + 1)); return [...c].sort((a, b) => b[1] - a[1]); })();
  const nomeTipo = (t, q) => { const x = TIPOS.find((y) => y.carroc === t); return x ? (q === 1 ? x.sing : x.curto.toLowerCase()).replace(/^suv(s?)$/i, "SUV$1") : t; };
  const comp = primeiro ? ` O mais barato é o ${primeiro.m.titulo}, por ${reais(primeiro.de)}.` : "";
  let h1, titulo, desc, lead;
  if (ehFaixa) {
    const faixaTxt = l.max === Infinity ? `acima de ${reais(l.min - 1)}` : `até ${reais(l.max)}`;
    h1 = `${l.titulo} em ${ano}`;
    titulo = `${l.titulo} em ${ano}: ${pl(n, "modelo", "modelos")} | Autokan`;
    lead = `${n === 1 ? "Há 1 modelo" : `Há ${num(n)} modelos`} 0 km com versões ${faixaTxt} à venda no Brasil, do mais barato ao mais caro.${comp}${porTipo.length > 1 ? ` Entre eles: ${lista(porTipo.slice(0, 5).map(([t, q]) => `${q} ${nomeTipo(t, q)}`))}.` : ""}`;
    desc = `${n === 1 ? "O carro" : `Os ${num(n)} carros`} 0 km com versões ${faixaTxt} no Brasil, do mais barato ao mais caro.${comp}`;
  } else {
    const de = achados.length ? Math.min(...achados.map((x) => x.de)) : null, ate = achados.length ? Math.max(...achados.map(({ vs }) => Math.max(...vs.map((v) => v.preco || 0)))) : null;
    h1 = `${l.titulo} ${ano}: preços e versões`;
    titulo = `${l.titulo} ${ano}: preços de ${pl(n, "modelo", "modelos")} | Autokan`;
    const faixaTxt = de && ate && Number.isFinite(de) ? `, de ${reais(de)} a ${reais(ate)}` : "";
    lead = `${n === 1 ? "Há 1 modelo" : `Há ${num(n)} modelos`} à venda no Brasil${faixaTxt}, do mais barato ao mais caro.${comp}`;
    desc = `Todos os ${pl(n, "modelo", "modelos")} ${l.titulo.replace(" 0 km", "").toLowerCase().replace("suvs", "SUVs")} 0 km à venda no Brasil${faixaTxt}. Compare preço de cada versão, motor e potência.`;
  }
  const ch = chipsListas(base, l.slug);
  const extra = (vs, m) => (ehFaixa && vs.length !== m.versoes.length ? `${pl(vs.length, "versão", "versões")} nesta faixa` : null);
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>${esc(h1)}</h1><p class="lead">${esc(lead)}</p>${ehFaixa ? ch.faixas : TIPOS.includes(l) ? ch.tipos : ch.combs}</div>
<section class="sec" aria-label="Modelos"><ul class="grade">${achados.map(({ m, vs, de }) => cartao(m, { de, extra: extra(vs, m) })).join("")}</ul>
<p class="nota">Preço de tabela sugerido pela montadora ou FIPE 0 km${base.mesPrecos ? ` em ${mesAno(base.mesPrecos)}` : ""}. Toque no carro para ver o preço de cada versão e a fonte.</p></section>
<section class="sec" aria-labelledby="s-mais"><h2 id="s-mais">Veja também</h2>${ehFaixa ? `${ch.tipos}<div style="height:10px"></div>${ch.combs}` : `${ch.faixas}<div style="height:10px"></div>${TIPOS.includes(l) ? ch.combs : ch.tipos}`}</section>`;
  return pagina({ titulo, descricao: desc, caminho, ld: [ldTrilha(itens), ldLista(h1, achados.map((x) => x.m))], corpo,
    imagemOg: primeiro && primeiro.m.foto ? SITE + imagem(primeiro.m.foto, 800, "&fm=png") : null, imagemAlt: h1 });
}

/* ---------- página não encontrada (sem depender do banco) */

export function pagina404() {
  const corpo = `<div class="lista-top" style="padding:48px 0 8px"><h1>Página não encontrada</h1>
<p class="lead">O endereço pode ter mudado ou o carro saiu de linha. Procure pela marca ou volte para a roleta de preços.</p>
<div class="acoes"><a class="btn pri" href="/">${ROLETA}Roleta de preços</a><a class="btn" href="/carros">Todas as marcas</a></div></div>`;
  return pagina({ titulo: "Página não encontrada | Autokan", descricao: "Esta página do Autokan não existe mais.", caminho: null, corpo, indexar: false });
}
