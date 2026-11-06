/* Autokan: ficha técnica completa de cada versão, montada de versions.specs (cada dado com a sua fonte).
   Só mostra o que tem fonte; campo sem dado não aparece. A conversão kgfm ↔ Nm aparece marcada com "≈". */
import { esc, SETA } from "./paginas.mjs";

const NM_POR_KGFM = 9.80665;
// mostra o número como está na fonte (até 2 casas); só a conversão kgfm ↔ Nm é arredondada
const num = (n, casas = 2) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas });
const CONTAGEM = new Set(["marchas", "cilindros", "lugares", "motores", "airbags"]);
const UNIDADE = { "km/l equivalente": "km/l-e", "cm³": "cm³", pol: "pol." };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function texto(d) {
  if (!d || d.v == null || d.v === "") return null;
  if (typeof d.v === "number") return CONTAGEM.has(d.u) || !d.u ? num(d.v) : `${num(d.v)} ${UNIDADE[d.u] || d.u}`;
  const t = String(d.v).trim();
  return t === "sim" ? "Sim" : t === "não" ? "Não" : cap(t);
}

/* campos que juntam mais de um dado (flex, kgfm e Nm) */
function potencia(g) {
  const e = g["potencia_cv_etanol"], ga = g["potencia_cv_gasolina"];
  if (e && ga && e.v !== ga.v) return { t: `${num(e.v)} cv (etanol) · ${num(ga.v)} cv (gasolina)`, s: [e.s, ga.s] };
  const d = g["potencia_cv"] || e || ga;
  return d ? { t: `${num(d.v)} cv`, s: [d.s] } : null;
}
function torque(g, base = "torque") {
  const par = (sufixo) => {
    const k = g[`${base}_kgfm${sufixo}`], n = g[`${base}_nm${sufixo}`];
    if (k && n) return { t: `${num(k.v)} kgfm (${num(n.v)} Nm)`, s: [k.s, n.s] };
    if (k) return { t: `${num(k.v)} kgfm (≈ ${num(k.v * NM_POR_KGFM, 0)} Nm)`, s: [k.s] };
    if (n) return { t: `${num(n.v)} Nm (≈ ${num(n.v / NM_POR_KGFM, 1)} kgfm)`, s: [n.s] };
    return null;
  };
  const e = par("_etanol"), ga = par("_gasolina");
  if (e && ga && e.t !== ga.t) return { t: `${e.t} etanol · ${ga.t} gasolina`, s: [...e.s, ...ga.s] };
  return par("") || e || ga;
}
function autonomia(g) {
  const d = g["eletrica_km"]; if (!d) return null;
  const c = g["ciclo"];
  return { t: `${num(d.v)} km${c ? ` (${c.v})` : ""}`, s: c ? [d.s, c.s] : [d.s] };
}

/* grupos na ordem da ficha: [grupo do banco, campo ou função, rótulo] */
export const GRUPOS = [
  ["Motor e câmbio", [
    ["motor", "descricao", "Motor"], ["motor", "cilindrada_cm3", "Cilindrada"], ["motor", "cilindros", "Cilindros"], ["motor", "aspiracao", "Alimentação"],
    ["motor", potencia, "Potência"], ["motor", "potencia_rotacao", "Potência máxima a"], ["motor", torque, "Torque"], ["motor", "torque_rotacao", "Torque máximo a"],
    ["motor", "potencia_combinada_cv", "Potência combinada"], ["motor", (g) => torque(g, "torque_combinado"), "Torque combinado"],
    ["motor", "potencia_eletrica_cv", "Potência elétrica"], ["motor", "motores_eletricos", "Motores elétricos"],
    ["mecanica", "cambio_tipo", "Câmbio"], ["mecanica", "marchas", "Marchas"], ["mecanica", "tracao", "Tração"],
  ]],
  ["Desempenho", [["desempenho", "aceleracao_0_100_s", "0 a 100 km/h"], ["desempenho", "velocidade_max_kmh", "Velocidade máxima"]]],
  ["Consumo e eficiência (Inmetro)", [
    ["consumo", "etanol_cidade_kml", "Etanol, cidade"], ["consumo", "etanol_estrada_kml", "Etanol, estrada"],
    ["consumo", "gasolina_cidade_kml", "Gasolina, cidade"], ["consumo", "gasolina_estrada_kml", "Gasolina, estrada"],
    ["consumo", "diesel_cidade_kml", "Diesel, cidade"], ["consumo", "diesel_estrada_kml", "Diesel, estrada"],
    ["consumo", "eletrico_cidade_kmle", "Elétrico, cidade"], ["consumo", "eletrico_estrada_kmle", "Elétrico, estrada"],
    ["consumo", "hibrido_etanol_cidade_kmle", "Híbrido com etanol, cidade"], ["consumo", "hibrido_etanol_estrada_kmle", "Híbrido com etanol, estrada"],
    ["consumo", "energia_mjkm", "Consumo de energia"], ["autonomia", "eletrica_inmetro_km", "Autonomia elétrica (Inmetro)"],
    ["eficiencia", "classe_categoria", "Nota na categoria"], ["eficiencia", "classe_geral", "Nota geral"], ["eficiencia", "categoria_pbev", "Categoria"],
    ["eficiencia", "selo_conpet", "Selo Conpet"], ["emissoes", "co2_fossil_gkm", "CO₂ fóssil"], ["consumo", "ciclo", "Medição"],
  ]],
  ["Bateria, recarga e autonomia", [
    ["bateria", "capacidade_kwh", "Bateria"], ["bateria", "quimica", "Tipo de bateria"], ["recarga", "ac_kw", "Recarga AC (máxima)"], ["recarga", "tempo_ac", "Tempo de recarga AC"],
    ["recarga", "dc_kw", "Recarga rápida DC (máxima)"], ["recarga", "tempo_dc", "Tempo de recarga rápida"], ["autonomia", autonomia, "Autonomia elétrica declarada"],
  ]],
  ["Dimensões e capacidades", [
    ["dimensoes", "comprimento_mm", "Comprimento"], ["dimensoes", "largura_mm", "Largura"], ["dimensoes", "altura_mm", "Altura"],
    ["dimensoes", "entre_eixos_mm", "Entre-eixos"], ["dimensoes", "vao_livre_mm", "Altura livre do solo"], ["peso", "ordem_marcha_kg", "Peso em ordem de marcha"],
    ["capacidades", "porta_malas_l", "Porta-malas"], ["capacidades", "tanque_l", "Tanque"], ["capacidades", "ocupantes", "Lugares"],
    ["capacidades", "carga_util_kg", "Carga útil"], ["capacidades", "cacamba_l", "Caçamba"],
  ]],
  ["Chassi, rodas e pneus", [
    ["chassi", "suspensao_dianteira", "Suspensão dianteira"], ["chassi", "suspensao_traseira", "Suspensão traseira"],
    ["chassi", "freios_dianteiros", "Freios dianteiros"], ["chassi", "freios_traseiros", "Freios traseiros"], ["chassi", "direcao", "Direção"],
    ["rodas", "aro_pol", "Rodas (aro)"], ["rodas", "material", "Material das rodas"], ["rodas", "pneus", "Pneus"],
  ]],
  ["Segurança", [
    ["seguranca", "airbags", "Airbags"], ["seguranca", "controle_estabilidade", "Controle de estabilidade"], ["seguranca", "controle_tracao", "Controle de tração"],
    ["seguranca", "frenagem_autonoma", "Frenagem autônoma de emergência"], ["seguranca", "piloto_automatico_adaptativo", "Piloto automático adaptativo"],
    ["seguranca", "assistente_faixa", "Assistente de permanência em faixa"], ["seguranca", "alerta_ponto_cego", "Alerta de ponto cego"],
    ["seguranca", "alerta_trafego_traseiro", "Alerta de tráfego traseiro"], ["seguranca", "farol_alto_automatico", "Farol alto automático"],
    ["seguranca", "deteccao_fadiga", "Detector de fadiga"], ["seguranca", "camera", "Câmera"], ["seguranca", "sensor_estacionamento", "Sensor de estacionamento"],
    ["seguranca", "isofix", "Isofix"], ["seguranca", "nota_latin_ncap", "Latin NCAP"],
  ]],
  ["Tecnologia e conforto", [
    ["tecnologia", "multimidia_pol", "Central multimídia"], ["tecnologia", "carplay_android_auto", "Apple CarPlay e Android Auto"],
    ["tecnologia", "painel_digital_pol", "Painel de instrumentos digital"], ["tecnologia", "conectividade", "Conectividade"],
    ["tecnologia", "carregador_inducao", "Carregador por indução"], ["tecnologia", "head_up_display", "Head-up display"],
    ["conforto", "ar_condicionado", "Ar-condicionado"], ["conforto", "partida_sem_chave", "Partida sem chave"], ["conforto", "bancos_couro", "Bancos de couro"],
    ["conforto", "banco_eletrico_motorista", "Banco do motorista elétrico"], ["conforto", "teto_solar", "Teto solar"],
  ]],
];

/* lista [{grupo, itens:[{rot, t, s:[ids de fonte]}]}] de uma versão; vazia quando não há dado */
export function fichaDe(specs) {
  if (!specs || typeof specs !== "object") return [];
  const out = [];
  for (const [grupo, campos] of GRUPOS) {
    const itens = [];
    for (const [g, campo, rot] of campos) {
      const dados = specs[g] || {};
      let r = null;
      if (typeof campo === "function") r = campo(dados);
      else { const t = texto(dados[campo]); if (t) r = { t, s: [dados[campo].s] }; }
      if (r) itens.push({ rot, chave: typeof campo === "string" ? `${g}.${campo}` : `${g}.${rot}`, t: r.t, s: [...new Set(r.s.filter(Boolean))] });
    }
    if (itens.length) out.push({ grupo, itens });
  }
  return out;
}

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
    const grupos = f.map((g) => `<div class="ft-g"><h3>${esc(g.grupo)}</h3><dl>${g.itens.map((i) => `<div><dt>${esc(i.rot)}</dt><dd>${esc(i.t)}<span class="ft-r">${refs(i, ordem).map((n) => `<a href="#${id}-f${n}" aria-label="fonte ${n}">${n}</a>`).join(",")}</span></dd></div>`).join("")}</dl></div>`).join("");
    return `<details class="ft-v" id="${id}"${k === 0 ? " open" : ""}><summary>${esc(v.nome || m.nome)}${v.ano ? ` ${v.ano}` : ""}<small>${f.reduce((n, g) => n + g.itens.length, 0)} dados</small></summary><div class="ft-b">${grupos}${listaFontes(ordem, fontes, id)}</div></details>`;
  }).join("");
  const faltam = (m.aVenda ? m.versoes : m.breve).length - vs.length;
  return `<section class="sec" id="ficha-tecnica" aria-labelledby="s-ft"><h2 id="s-ft">Ficha técnica completa</h2>${blocos}
<p class="nota">Cada número tem a fonte ao lado (montadora, Inmetro ou imprensa especializada), com o link e a data da consulta. Campo sem fonte confirmada fica de fora.${faltam > 0 ? ` ${faltam === 1 ? "Uma versão ainda não tem" : `${faltam} versões ainda não têm`} ficha confirmada.` : ""} Viu algo errado? <a href="/contato?assunto=erro&amp;pagina=${encodeURIComponent(m.url)}&amp;titulo=${encodeURIComponent(m.titulo)}" rel="nofollow">Avise a gente</a>.</p></section>`;
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
      linhas.push(`<tr class="lb"><th colspan="${n}" scope="colgroup">${esc(rot)}</th></tr><tr>${vals.map((i) => `<td>${i ? esc(i.t) : '<span class="na">—</span>'}</td>`).join("")}</tr>`);
    }
    if (linhas.length) out.push(`<tr class="gp"><th colspan="${n}" scope="colgroup">${esc(grupo)}</th></tr>${linhas.join("")}`);
  }
  const fontesCol = fichas.map((f) => numerar(f).map((s) => fontes.get(s)).filter((x) => x && x.url));
  out.push(`<tr class="lb"><th colspan="${n}" scope="colgroup">Fontes da ficha técnica</th></tr><tr>${fontesCol.map((fs) => `<td>${fs.length ? fs.map((f) => `<a class="fnt" href="${esc(f.url)}" target="_blank" rel="noopener nofollow">${esc(f.nome)}${SETA}</a>`).join("<br>") : '<span class="na">—</span>'}</td>`).join("")}</tr>`);
  return out.join("");
}
