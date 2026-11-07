/* Autokan: histórico de preço na página de cada carro.
   Junta os preços que cada versão já teve no site (public.version_prices, desde que ela entrou no Autokan)
   e as mudanças noticiadas com fonte (public.price_changes). Mostra o gráfico só quando o preço mudou;
   sem mudança, diz desde quando o preço é o mesmo. */
import { esc, reais, SETA } from "./paginas.mjs";

const dia = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const soma = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const br = (d) => d.split("-").reverse().join("/");
const hoje = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/* preço que valia em cada dia: o de tabela (o último registrado no site ou a última mudança definitiva noticiada),
   trocado pela oferta enquanto ela vale (do início até o fim informado; sem fim, até hoje) */
const inicio = (m) => dia(m.starts_on) || dia(m.reported_on);
function precoEm(v, d) {
  let base = null, baseD = "";
  for (const x of v.precos || []) { const vd = dia(x.valid_from); if (vd && vd <= d && vd >= baseD && x.price > 0) { base = x.price; baseD = vd; } }
  const ms = (v.mudancas || []).filter((m) => inicio(m) && m.old_price > 0 && m.new_price > 0).sort((a, b) => inicio(a).localeCompare(inicio(b)));
  for (const m of ms) if (m.change_type !== "promocional" && inicio(m) <= d && inicio(m) >= baseD) { base = m.new_price; baseD = inicio(m); }
  if (base == null && ms.length && d < inicio(ms[0])) base = ms[0].old_price;
  let oferta = null;
  for (const m of ms) { const fim = dia(m.ends_on); if (m.change_type === "promocional" && inicio(m) <= d && (!fim || fim >= d)) oferta = m.new_price; }
  return oferta ?? base;
}

/* pontos do gráfico (em degraus), do mais antigo ao mais novo, só quando o preço muda */
export function serie(v) {
  const agora = hoje(), datas = new Set([agora]);
  for (const x of v.precos || []) { const d = dia(x.valid_from); if (d) datas.add(d); }
  for (const m of v.mudancas || []) {
    const d = inicio(m); if (!d) continue;
    datas.add(d); datas.add(soma(d, -1));
    const fim = dia(m.ends_on); if (fim) datas.add(soma(fim, 1));
  }
  const out = [];
  for (const d of [...datas].filter((d) => d <= agora).sort()) {
    const p = precoEm(v, d); if (!(p > 0)) continue;
    const ult = out[out.length - 1];
    if (!ult || ult.p !== p) out.push({ d, p });
  }
  return out;
}

function grafico(pts, nome) {
  const W = 640, H = 150, L = 78, R = 16, T = 14, B = 26;
  const ini = new Date(pts[0].d + "T12:00:00Z").getTime(), fimD = hoje() > pts[pts.length - 1].d ? hoje() : pts[pts.length - 1].d;
  const fim = Math.max(new Date(fimD + "T12:00:00Z").getTime(), ini + 86400000);
  const ps = pts.map((x) => x.p), lo = Math.min(...ps), hi = Math.max(...ps), pad = Math.max((hi - lo) * 0.15, hi * 0.01);
  const x = (d) => L + ((new Date(d + "T12:00:00Z").getTime() - ini) / (fim - ini)) * (W - L - R);
  const y = (p) => T + (1 - (p - (lo - pad)) / ((hi + pad) - (lo - pad))) * (H - T - B);
  let path = `M${x(pts[0].d).toFixed(1)},${y(pts[0].p).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) path += `H${x(pts[i].d).toFixed(1)}V${y(pts[i].p).toFixed(1)}`;
  path += `H${(W - R).toFixed(1)}`;
  const dots = pts.map((p) => `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.p).toFixed(1)}" r="3.5"/>`).join("");
  const resumo = `${nome}: de ${reais(pts[0].p)} em ${br(pts[0].d)} para ${reais(pts[pts.length - 1].p)} em ${br(pts[pts.length - 1].d)}`;
  return `<svg class="hp-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resumo)}">
<line x1="${L}" x2="${W - R}" y1="${y(hi).toFixed(1)}" y2="${y(hi).toFixed(1)}" class="hp-grid"/><line x1="${L}" x2="${W - R}" y1="${y(lo).toFixed(1)}" y2="${y(lo).toFixed(1)}" class="hp-grid"/>
<text x="${L - 8}" y="${(y(hi) + 4).toFixed(1)}" text-anchor="end">${reais(hi)}</text>${hi !== lo ? `<text x="${L - 8}" y="${(y(lo) + 4).toFixed(1)}" text-anchor="end">${reais(lo)}</text>` : ""}
<text x="${L}" y="${H - 6}">${br(pts[0].d)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${br(fimD)}</text>
<path d="${path}" class="hp-l"/>${dots}</svg>`;
}

export const CSS_HIST = `
.hp{display:grid;gap:12px}
.hp-v{border:1px solid var(--line);border-radius:16px;padding:14px 16px;background:#fff}
.hp-v h3{margin:0 0 6px;font-size:15px}
.hp-g{display:block;width:100%;height:auto;max-width:640px}
.hp-g text{font:600 11px var(--body);fill:#5d6577}
.hp-grid{stroke:#e7eaf0;stroke-width:1}
.hp-l{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round}
.hp-g circle{fill:#fff;stroke:var(--accent);stroke-width:2}
.hp-m{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:4px;font-size:13.5px;color:#2a3140}
.hp-m .dn{color:#0d6b3c;font-weight:700}.hp-m .up{color:#b02a15;font-weight:700}
.hp-m a{font-size:12.5px;font-weight:700;text-decoration:none}
`.replace(/\n\s*/g, "");

export function secaoHistorico(m) {
  const vs = m.aVenda ? m.versoes : m.breve;
  const comMudanca = vs.map((v) => ({ v, pts: serie(v) })).filter((x) => new Set(x.pts.map((p) => p.p)).size > 1);
  const desde = vs.flatMap((v) => (v.precos || []).map((p) => dia(p.valid_from))).filter(Boolean).sort()[0];
  if (!comMudanca.length && !desde) return "";
  const blocos = comMudanca.map(({ v, pts }) => {
    const nome = `${m.titulo} ${v.nome || ""}`.trim();
    const evs = [];
    for (const x of v.mudancas || []) {
      const d = inicio(x); if (!d) continue;
      evs.push({ d, x, fim: false });
      const f = dia(x.ends_on); if (x.change_type === "promocional" && f && f < hoje()) evs.push({ d: soma(f, 1), x, fim: true });
    }
    const mud = evs.sort((a, b) => a.d.localeCompare(b.d)).map(({ d, x, fim }) => {
      const desceu = fim ? x.old_price < x.new_price : x.new_price < x.old_price;
      const texto = fim
        ? `${br(d)}: fim da oferta, volta a ${reais(x.old_price)}`
        : `${br(d)}: ${reais(x.old_price)} → ${reais(x.new_price)}${x.change_type === "promocional" ? `, oferta${dia(x.ends_on) ? ` até ${br(dia(x.ends_on))}` : ""}` : ""}`;
      const fonte = x.source_url && /^https?:\/\//.test(x.source_url) ? ` · <a href="${esc(x.source_url)}" target="_blank" rel="noopener nofollow">${esc(x.source_name || "fonte")}${SETA}</a>` : "";
      return `<li><span class="${desceu ? "dn" : "up"}">${desceu ? "↓" : "↑"}</span> ${esc(texto)}${fonte}</li>`;
    }).join("");
    return `<div class="hp-v"><h3>${esc(v.nome || m.nome)}</h3>${grafico(pts, nome)}${mud ? `<ul class="hp-m">${mud}</ul>` : ""}</div>`;
  }).join("");
  const semMudanca = vs.length - comMudanca.length;
  const nota = comMudanca.length
    ? `${semMudanca ? `${semMudanca === 1 ? "A outra versão" : `As outras ${semMudanca} versões`} não ${semMudanca === 1 ? "mudou" : "mudaram"} de preço${desde ? ` desde ${br(desde)}` : ""}. ` : ""}Preços de referência; confirme com a concessionária.`
    : `Nenhuma versão do ${m.titulo} mudou de preço${desde ? ` desde ${br(desde)}, quando passamos a acompanhar` : ""}. Quando mudar, o gráfico aparece aqui.`;
  return `<section class="sec" id="historico-preco" aria-labelledby="s-hp"><h2 id="s-hp">Histórico de preço</h2>${blocos ? `<div class="hp">${blocos}</div>` : ""}<p class="nota">${esc(nota)}</p></section>`;
}
