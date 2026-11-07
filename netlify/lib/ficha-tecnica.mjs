/* Autokan: ficha técnica completa de cada versão (página do carro e comparação), com a fonte de cada dado.
   Os campos e o formato de cada um ficam em public/ficha-tecnica.mjs, o mesmo arquivo que a roleta usa no navegador. */
import { esc, SETA } from "./paginas.mjs";
import { GRUPOS, fichaDe, anoOutro } from "../../public/ficha-tecnica.mjs";

const dataBr = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10).split("-").reverse().join("/") : "");

/* fontes numeradas na ordem em que aparecem */
function numerar(ficha) {
  const ordem = [];
  ficha.forEach((g) => g.itens.forEach((i) => i.s.forEach((s) => { if (!ordem.includes(s)) ordem.push(s); })));
  return ordem;
}
const refs = (i, ordem) => i.s.map((s) => ordem.indexOf(s) + 1).filter((n) => n > 0);
function listaFontes(ordem, fontes, id) {
  return `<ol class="ft-fontes">${ordem.map((s, n) => {
    const f = fontes.get(s) || {};
    const quando = dataBr(f.consultado);
    return `<li id="${id}-f${n + 1}">${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener nofollow">${esc(f.nome || "Fonte")}${SETA}</a>` : esc(f.nome || "Fonte")}${quando ? ` <small>consultada em ${quando}</small>` : ""}</li>`;
  }).join("")}</ol>`;
}

export const CSS_FICHA = `
.ft-v{border:1px solid var(--line);border-radius:16px;margin:0 0 10px;background:#fff}
.ft-v>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;font-weight:700}
.ft-v>summary::-webkit-details-marker{display:none}
.ft-v>summary::after{content:"";flex:none;width:10px;height:10px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);margin-top:-4px;transition:transform .15s}
.ft-v[open]>summary::after{transform:rotate(-135deg);margin-top:4px}
.ft-v>summary small{font-weight:600;color:var(--muted);margin-left:auto}
.ft-b{padding:0 16px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px 22px}
.ft-g h3{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:12px 0 4px}
.ft-g dl{margin:0}
.ft-g dl>div{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px}
.ft-g dt{color:#3b4352}
.ft-g dd{margin:0;font-weight:700;text-align:right}
.ft-a{display:inline-block;margin-left:6px;padding:0 6px;border-radius:6px;background:var(--panel);font-size:10.5px;font-weight:700;color:var(--muted);vertical-align:1px}
.ft-r{font-size:10px;font-weight:700;margin-left:2px;vertical-align:super;line-height:0}
.ft-r a{text-decoration:none}
.ft-fontes{grid-column:1/-1;margin:10px 0 0;padding-left:20px;font-size:12.5px;color:var(--muted)}
.ft-fontes li{margin:2px 0}
.ft-fontes a{font-weight:700}
`.replace(/\n\s*/g, "");

/* seção da página do modelo: uma ficha por versão (a primeira aberta) */
export function secaoFicha(m, fontes) {
  const vs = (m.aVenda ? m.versoes : m.breve).map((v) => ({ v, f: fichaDe(v.specs) })).filter((x) => x.f.length);
  if (!vs.length) return "";
  const blocos = vs.map(({ v, f }, k) => {
    const ordem = numerar(f), id = `ft-${v.id.replace(/[^\w-]/g, "")}`;
    const grupos = f.map((g) => `<div class="ft-g"><h3>${esc(g.grupo)}</h3><dl>${g.itens.map((i) => `<div><dt>${esc(i.rot)}</dt><dd>${esc(i.t)}${anoOutro(i, v.ano) ? `<small class="ft-a" title="Dado da ficha do ano-modelo ${anoOutro(i, v.ano)}">ficha ${anoOutro(i, v.ano)}</small>` : ""}<span class="ft-r">${refs(i, ordem).map((n) => `<a href="#${id}-f${n}" aria-label="fonte ${n}">${n}</a>`).join(",")}</span></dd></div>`).join("")}</dl></div>`).join("");
    return `<details class="ft-v" id="${id}"${k === 0 ? " open" : ""}><summary>${esc(v.nome || m.nome)}${v.ano ? ` ${v.ano}` : ""}<small>${f.reduce((n, g) => n + g.itens.length, 0)} dados</small></summary><div class="ft-b">${grupos}${listaFontes(ordem, fontes, id)}</div></details>`;
  }).join("");
  const faltam = (m.aVenda ? m.versoes : m.breve).length - vs.length;
  return `<section class="sec" id="ficha-tecnica" aria-labelledby="s-ft"><h2 id="s-ft">Ficha técnica completa</h2>${blocos}
<p class="nota">Cada número tem a fonte ao lado (montadora, Inmetro ou imprensa especializada), com o link e a data da consulta. "Ficha 2026" marca dado tirado da ficha do ano-modelo anterior, quando a montadora ainda não publicou a nova e nada indica mudança. Campo sem fonte confirmada fica de fora.${faltam > 0 ? ` ${faltam === 1 ? "Uma versão ainda não tem" : `${faltam} versões ainda não têm`} ficha confirmada.` : ""} Viu algo errado? <a href="/contato?assunto=erro&amp;pagina=${encodeURIComponent(m.url)}&amp;titulo=${encodeURIComponent(m.titulo)}" rel="nofollow">Avise a gente</a>.</p></section>`;
}

/* linhas extras da comparação: um bloco por grupo, só os campos que alguma das versões tem */
export function linhasComparacao(cols, fontes) {
  const fichas = cols.map((c) => fichaDe(c.v.specs));
  if (!fichas.some((f) => f.length)) return "";
  const n = cols.length, out = [];
  const porChave = fichas.map((f) => new Map(f.flatMap((g) => g.itens.map((i) => [i.chave, i]))));
  for (const [grupo, campos] of GRUPOS) {
    const linhas = [];
    for (const [g, campo, rot] of campos) {
      const chave = typeof campo === "string" ? `${g}.${campo}` : `${g}.${rot}`;
      const vals = porChave.map((m) => m.get(chave));
      if (!vals.some(Boolean)) continue;
      linhas.push(`<tr class="lb"><th colspan="${n}" scope="colgroup">${esc(rot)}</th></tr><tr>${vals.map((i, k) => `<td>${i ? `${esc(i.t)}${i.rot !== rot ? `<small>${esc(i.rot.replace(/^\S+\s/, ""))}</small>` : ""}${anoOutro(i, cols[k].v.ano) ? `<small>ficha ${anoOutro(i, cols[k].v.ano)}</small>` : ""}` : '<span class="na">—</span>'}</td>`).join("")}</tr>`);
    }
    if (linhas.length) out.push(`<tr class="gp"><th colspan="${n}" scope="colgroup">${esc(grupo)}</th></tr>${linhas.join("")}`);
  }
  const fontesCol = fichas.map((f) => numerar(f).map((s) => fontes.get(s)).filter((x) => x && x.url));
  out.push(`<tr class="lb"><th colspan="${n}" scope="colgroup">Fontes da ficha técnica</th></tr><tr>${fontesCol.map((fs) => `<td>${fs.length ? fs.map((f) => `<a class="fnt" href="${esc(f.url)}" target="_blank" rel="noopener nofollow">${esc(f.nome)}${SETA}</a>`).join("<br>") : '<span class="na">—</span>'}</td>`).join("")}</tr>`);
  return out.join("");
}
