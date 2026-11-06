/* Autokan: campos da ficha técnica (versions.specs) e como cada um aparece. Usado pelo servidor (páginas do carro e
   comparação, via netlify/lib/ficha-tecnica.mjs) e pela ficha da roleta no navegador. Só mostra o que tem fonte;
   campo sem dado não aparece. A conversão kgfm ↔ Nm aparece marcada com "≈". */
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
  if (e && ga && e.v !== ga.v) return { t: `${num(e.v)} cv (etanol) · ${num(ga.v)} cv (gasolina)`, s: [e.s, ga.s], r: e.r };
  const d = g["potencia_cv"] || e || ga;
  return d ? { t: `${num(d.v)} cv`, s: [d.s], r: d.r } : null;
}
function torque(g, base = "torque") {
  const par = (sufixo) => {
    const k = g[`${base}_kgfm${sufixo}`], n = g[`${base}_nm${sufixo}`];
    if (k && n) return { t: `${num(k.v)} kgfm (${num(n.v)} Nm)`, s: [k.s, n.s], r: k.r };
    if (k) return { t: `${num(k.v)} kgfm (≈ ${num(k.v * NM_POR_KGFM, 0)} Nm)`, s: [k.s], r: k.r };
    if (n) return { t: `${num(n.v)} Nm (≈ ${num(n.v / NM_POR_KGFM, 1)} kgfm)`, s: [n.s], r: n.r };
    return null;
  };
  const e = par("_etanol"), ga = par("_gasolina");
  if (e && ga && e.t !== ga.t) return { t: `${e.t} etanol · ${ga.t} gasolina`, s: [...e.s, ...ga.s], r: e.r };
  return par("") || e || ga;
}
function autonomia(g) {
  const d = g["eletrica_km"]; if (!d) return null;
  const c = g["ciclo"];
  return { t: `${num(d.v)} km${c ? ` (${c.v})` : ""}`, s: c ? [d.s, c.s] : [d.s], r: d.r };
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

/* lista [{grupo, itens:[{rot, t, s:[ids de fonte], r:referência}]}] de uma versão; vazia quando não há dado */
export function fichaDe(specs) {
  if (!specs || typeof specs !== "object") return [];
  const out = [];
  for (const [grupo, campos] of GRUPOS) {
    const itens = [];
    for (const [g, campo, rot] of campos) {
      const dados = specs[g] || {};
      let r = null;
      if (typeof campo === "function") r = campo(dados);
      else { const t = texto(dados[campo]); if (t) r = { t, s: [dados[campo].s], r: dados[campo].r }; }
      if (r) itens.push({ rot, chave: typeof campo === "string" ? `${g}.${campo}` : `${g}.${rot}`, t: r.t, s: [...new Set(r.s.filter(Boolean))], r: r.r || null });
    }
    if (itens.length) out.push({ grupo, itens });
  }
  return out;
}

/* completude: quantos dos 15 dados principais a versão tem com fonte (o mesmo critério do relatório da base) */
export const PRINCIPAIS = [
  ["Potência", (s) => s.motor && (s.motor.potencia_cv || s.motor.potencia_cv_etanol || s.motor.potencia_cv_gasolina || s.motor.potencia_combinada_cv)],
  ["Torque", (s) => s.motor && Object.keys(s.motor).some((k) => k.startsWith("torque_") && !k.endsWith("rotacao"))],
  ["Câmbio", (s) => s.mecanica && s.mecanica.cambio_tipo], ["Tração", (s) => s.mecanica && s.mecanica.tracao],
  ["0 a 100 km/h", (s) => s.desempenho && s.desempenho.aceleracao_0_100_s], ["Velocidade máxima", (s) => s.desempenho && s.desempenho.velocidade_max_kmh],
  ["Consumo", (s) => s.consumo && Object.keys(s.consumo).some((k) => /_km(l|le)$/.test(k))],
  ["Comprimento", (s) => s.dimensoes && s.dimensoes.comprimento_mm], ["Entre-eixos", (s) => s.dimensoes && s.dimensoes.entre_eixos_mm],
  ["Porta-malas", (s) => s.capacidades && s.capacidades.porta_malas_l], ["Peso", (s) => s.peso && s.peso.ordem_marcha_kg],
  ["Tanque ou bateria", (s) => (s.capacidades && s.capacidades.tanque_l) || (s.bateria && s.bateria.capacidade_kwh)],
  ["Airbags", (s) => s.seguranca && s.seguranca.airbags], ["Controle de estabilidade", (s) => s.seguranca && s.seguranca.controle_estabilidade],
  ["Central multimídia", (s) => s.tecnologia && (s.tecnologia.multimidia_pol || s.tecnologia.carplay_android_auto)],
];
export function completude(specs) {
  const s = specs && typeof specs === "object" ? specs : {};
  const tem = PRINCIPAIS.filter(([, f]) => f(s)).map(([n]) => n);
  return { pct: Math.round((tem.length / PRINCIPAIS.length) * 100), tem, faltam: PRINCIPAIS.map(([n]) => n).filter((n) => !tem.includes(n)) };
}

/* ano da ficha usada quando é diferente do ano-modelo da versão (ex.: dado da ficha 2026 num carro 2027); senão null */
export function anoOutro(item, anoVersao) {
  const r = item && item.r != null ? String(item.r) : "";
  return /^(19|20)\d{2}$/.test(r) && anoVersao && +r !== +anoVersao ? r : null;
}
