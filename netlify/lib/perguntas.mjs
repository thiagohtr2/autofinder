/* Autokan: perguntas frequentes e dados estruturados (JSON-LD) a partir da ficha técnica de cada versão.
   Só usa números com fonte (versions.specs); quando as versões têm números diferentes, diz a faixa e qual versão
   fica em cada ponta. Nenhuma resposta compara com outros carros nem diz se o número é bom ou ruim. */
import { lugares } from "./rankings.mjs";

const dec = (n, c = 1) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: c });
const mil = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const dado = (v, g, c) => { const d = v.specs?.[g]?.[c]; return d && typeof d.v === "number" && d.v > 0 ? d : null; };
const texto = (v, g, c) => { const d = v.specs?.[g]?.[c]; return d && typeof d.v === "string" && d.v.trim() ? d.v.trim() : null; };
const nomeV = (v, m) => v.nome || m.nome;

/* menor e maior valor de um campo entre as versões, e quais versões ficam nas pontas */
function faixa(vs, g, c) {
  const xs = vs.map((v) => ({ v, d: dado(v, g, c) })).filter((x) => x.d);
  if (!xs.length) return null;
  const ns = xs.map((x) => x.d.v), min = Math.min(...ns), max = Math.max(...ns);
  return { min, max, n: xs.length, vMin: xs.find((x) => x.d.v === min).v, vMax: xs.find((x) => x.d.v === max).v, inmetro: xs.every((x) => /inmetro|pbev/i.test(x.d.s || "")) };
}
/* "13,7 km/l" ou "12,1 a 13,7 km/l" (r) e "13,7 km/l" ou "de 12,1 a 13,7 km/l" (dr): a unidade só no fim */
const r = (f, nf, u) => (f.min === f.max ? `${nf(f.min)} ${u}` : `${nf(f.min)} a ${nf(f.max)} ${u}`);
const dr = (f, nf, u) => (f.min === f.max ? `${nf(f.min)} ${u}` : `de ${nf(f.min)} a ${nf(f.max)} ${u}`);
const varia = (f) => (f.min !== f.max ? ", conforme a versão" : "");
const todas = (f, vs) => (vs.length > 1 && f.n < vs.length ? ` ${f.n === 1 ? "Uma versão tem" : `${f.n} das ${vs.length} versões têm`} esse dado com fonte.` : "");
const deCarga = (v) => { const l = lugares(v); return !!l && l.n <= 2; }; // versão de carga (sem banco traseiro)

export function perguntasFicha(m, vs) {
  const t = m.titulo, out = [];

  // consumo (combustão e híbridos): gasolina ou diesel, cidade e estrada, e etanol nos flex
  const comb = faixa(vs, "consumo", "gasolina_cidade_kml") ? "gasolina" : faixa(vs, "consumo", "diesel_cidade_kml") ? "diesel" : null;
  if (comb) {
    const ci = faixa(vs, "consumo", `${comb}_cidade_kml`), es = faixa(vs, "consumo", `${comb}_estrada_kml`);
    const eci = faixa(vs, "consumo", "etanol_cidade_kml"), ees = faixa(vs, "consumo", "etanol_estrada_kml");
    let a = `Pela medição do Inmetro, com ${comb}, o ${t} faz ${dr(ci, dec, "km/l")} na cidade${es ? ` e ${dr(es, dec, "km/l")} na estrada` : ""}`;
    a += eci ? `. Com etanol, ${dr(eci, dec, "km/l")} na cidade${ees ? ` e ${dr(ees, dec, "km/l")} na estrada` : ""}.` : ".";
    if (ci.min !== ci.max) a += ` O menor consumo na cidade é o da versão ${nomeV(ci.vMax, m)}.`;
    out.push([`Qual é o consumo do ${t}?`, a + todas(ci, vs)]);
  }

  // autonomia elétrica (elétricos e híbridos plug-in): a do Inmetro; a declarada pela montadora só se for de outro ciclo
  const ai = faixa(vs, "autonomia", "eletrica_inmetro_km"), ad = faixa(vs, "autonomia", "eletrica_km");
  const ciclo = ad ? texto(ad.vMax, "autonomia", "ciclo") : null;
  const outroCiclo = ad && !(ai && (!ciclo || /inmetro|pbev/i.test(ciclo)));
  const bat = faixa(vs, "bateria", "capacidade_kwh");
  if (ai || outroCiclo) {
    const so = m.combs.every((c) => c === "Elétrico") ? "" : " só no modo elétrico";
    let a = ai ? `Pelo Inmetro, o ${t} roda ${dr(ai, mil, "km")}${so} com a bateria carregada${varia(ai)}.` : "";
    if (outroCiclo) a += `${a ? " " : ""}A montadora declara ${dr(ad, mil, "km")}${ciclo ? ` no ciclo ${ciclo}` : ""}${ai ? ", que é outro método de medição" : ""}.`;
    if (bat) a += ` A bateria tem ${dr(bat, dec, "kWh")}.`;
    out.push([`Qual é a autonomia do ${t}?`, a]);
  }

  // porta-malas: as versões de carga (2 lugares) ficam à parte, porque o número delas é o do compartimento de carga
  const pm = faixa(vs.filter((v) => !deCarga(v)), "capacidades", "porta_malas_l");
  const carga = vs.filter((v) => deCarga(v) && dado(v, "capacidades", "porta_malas_l"));
  if (pm || carga.length) {
    let a = pm ? `O porta-malas do ${t} tem ${dr(pm, mil, "litros")}${varia(pm)}, pela ficha da montadora. Cada montadora mede de um jeito; a forma de medir está na fonte da ficha técnica.` : "";
    for (const v of carga) a += `${a ? " " : ""}Na versão ${nomeV(v, m)}, de carga e sem banco traseiro, o compartimento tem ${mil(dado(v, "capacidades", "porta_malas_l").v)} litros.`;
    out.push([`Qual é o tamanho do porta-malas do ${t}?`, a]);
  }

  // lugares: só quando todas as versões têm o dado (ou quase todas, com o mesmo número)
  const lg = vs.map((v) => ({ v, l: lugares(v) })).filter((x) => x.l);
  const ns = [...new Set(lg.map((x) => x.l.n))].sort((a, b) => a - b);
  if (lg.length === vs.length || lg.length * 2 > vs.length) {
    out.push([`Quantos lugares tem o ${t}?`, ns.length === 1 ? `O ${t} tem ${ns[0]} lugares${lg.length < vs.length ? " nas versões com esse dado" : ""}.`
      : `Depende da versão: ${ns.map((n) => `${n} lugares ${(() => { const q = lg.filter((x) => x.l.n === n).map((x) => nomeV(x.v, m)); return q.length > 3 ? `em ${q.length} versões` : `na${q.length > 1 ? "s" : ""} ${q.join(", ")}`; })()}`).join("; ")}.${lg.length < vs.length ? " As outras versões ainda não têm esse dado com fonte." : ""}`]);
  }

  const co = faixa(vs, "dimensoes", "comprimento_mm"), la = faixa(vs, "dimensoes", "largura_mm"), al = faixa(vs, "dimensoes", "altura_mm"), ee = faixa(vs, "dimensoes", "entre_eixos_mm");
  if (co || la || al || ee) {
    const partes = [co && `comprimento de ${r(co, mil, "mm")}`, la && `largura de ${r(la, mil, "mm")}`, al && `altura de ${r(al, mil, "mm")}`, ee && `entre-eixos de ${r(ee, mil, "mm")}`].filter(Boolean);
    out.push([`Quais são as medidas do ${t}?`, `Pela ficha da montadora: ${partes.join(", ").replace(/, ([^,]*)$/, " e $1")}.`]);
  }

  const ac = faixa(vs, "desempenho", "aceleracao_0_100_s"), vm = faixa(vs, "desempenho", "velocidade_max_kmh");
  if (ac || vm) {
    let a = ac ? `O ${t} vai de 0 a 100 km/h em ${r(ac, dec, "segundos")}${ac.min !== ac.max ? ` (a mais rápida é a versão ${nomeV(ac.vMin, m)})` : ""}` : "";
    if (vm) a += `${a ? ", e a" : "A"} velocidade máxima é de ${r(vm, mil, "km/h")}`;
    out.push([`Qual é o desempenho do ${t}?`, `${a}, pela ficha da montadora.`]);
  }

  const ab = faixa(vs, "seguranca", "airbags");
  if (ab) out.push([`Quantos airbags tem o ${t}?`, `O ${t} tem ${dr(ab, String, "airbags")}${varia(ab)}, pela ficha da montadora.${todas(ab, vs)}`]);

  const notas = vs.map((v) => [texto(v, "eficiencia", "classe_categoria"), texto(v, "eficiencia", "classe_geral"), texto(v, "eficiencia", "categoria_pbev")]).filter((x) => x[0] || x[1]);
  if (notas.length) {
    const cat = [...new Set(notas.map((x) => x[0]).filter(Boolean))].sort(), ger = [...new Set(notas.map((x) => x[1]).filter(Boolean))].sort();
    const categoria = notas.find((x) => x[2])?.[2];
    const classe = (xs) => (xs.length === 1 ? `classe ${xs[0]}` : `classes ${xs[0]} a ${xs[xs.length - 1]}`);
    out.push([`Qual é a nota do ${t} no Inmetro?`, `Na etiqueta de eficiência do Inmetro, que vai de A (mais eficiente) a E, o ${t} tem ${[cat.length && `${classe(cat)} na categoria${categoria ? ` “${categoria}”` : ""}`, ger.length && `${classe(ger)} no geral`].filter(Boolean).join(" e ")}${cat.length > 1 || ger.length > 1 ? ", conforme a versão" : ""}.`]);
  }
  return out;
}

/* ficha em JSON-LD (schema.org Car): um valor quando todas as versões são iguais, faixa (minValue/maxValue) quando variam */
export function ldFicha(m, vs) {
  const qv = (f, unitCode, unitText, extra = {}) => f ? { "@type": "QuantitativeValue", ...(f.min === f.max ? { value: f.min } : { minValue: f.min, maxValue: f.max }), unitCode, unitText, ...extra } : undefined;
  const cvs = vs.map((v) => v.cv).filter((n) => n > 0);
  const cv = cvs.length ? { min: Math.min(...cvs), max: Math.max(...cvs) } : null;
  const motor = {
    "@type": "EngineSpecification",
    enginePower: qv(cv, undefined, "cv"),
    torque: qv(faixa(vs, "motor", "torque_kgfm"), undefined, "kgfm") || qv(faixa(vs, "motor", "torque_nm"), "NU", "Nm"),
    engineDisplacement: qv(faixa(vs, "motor", "cilindrada_cm3"), "CMQ", "cm³"),
    fuelType: m.combs.join(", ") || undefined,
  };
  const out = {
    vehicleEngine: Object.values(motor).filter(Boolean).length > 1 ? motor : undefined,
    vehicleTransmission: m.cambios.join(", ") || undefined,
    cargoVolume: qv(faixa(vs.filter((v) => !deCarga(v)), "capacidades", "porta_malas_l"), "LTR", "litros"),
    fuelCapacity: qv(faixa(vs, "capacidades", "tanque_l"), "LTR", "litros"),
    weight: qv(faixa(vs, "peso", "ordem_marcha_kg"), "KGM", "kg"),
    width: qv(faixa(vs, "dimensoes", "largura_mm"), "MMT", "mm"),
    height: qv(faixa(vs, "dimensoes", "altura_mm"), "MMT", "mm"),
    wheelbase: qv(faixa(vs, "dimensoes", "entre_eixos_mm"), "MMT", "mm"),
    accelerationTime: qv(faixa(vs, "desempenho", "aceleracao_0_100_s"), "SEC", "s", { valueReference: "0 a 100 km/h" }),
    speed: qv(faixa(vs, "desempenho", "velocidade_max_kmh"), "KMH", "km/h", { name: "Velocidade máxima" }),
    numberOfAirbags: (() => { const f = faixa(vs, "seguranca", "airbags"); return f && f.min === f.max ? f.min : undefined; })(),
  };
  const lg = vs.map((v) => lugares(v)).filter(Boolean).map((x) => x.n);
  if (lg.length === vs.length || (new Set(lg).size === 1 && lg.length * 2 > vs.length)) out.seatingCapacity = qv({ min: Math.min(...lg), max: Math.max(...lg) }, "C62", "lugares");
  const eff = [["gasolina_cidade_kml", "Gasolina, cidade (Inmetro)"], ["gasolina_estrada_kml", "Gasolina, estrada (Inmetro)"], ["etanol_cidade_kml", "Etanol, cidade (Inmetro)"], ["etanol_estrada_kml", "Etanol, estrada (Inmetro)"], ["diesel_cidade_kml", "Diesel, cidade (Inmetro)"], ["diesel_estrada_kml", "Diesel, estrada (Inmetro)"]]
    .map(([c, nome]) => qv(faixa(vs, "consumo", c), undefined, "km/l", { name: nome })).filter(Boolean);
  if (eff.length) out.fuelEfficiency = eff;
  const extra = [];
  const ai = faixa(vs, "autonomia", "eletrica_inmetro_km");
  if (ai) extra.push({ "@type": "PropertyValue", name: "Autonomia elétrica (Inmetro)", ...(ai.min === ai.max ? { value: ai.min } : { minValue: ai.min, maxValue: ai.max }), unitCode: "KMT", unitText: "km" });
  const bat = faixa(vs, "bateria", "capacidade_kwh");
  if (bat) extra.push({ "@type": "PropertyValue", name: "Capacidade da bateria", ...(bat.min === bat.max ? { value: bat.min } : { minValue: bat.min, maxValue: bat.max }), unitCode: "KWH", unitText: "kWh" });
  if (extra.length) out.additionalProperty = extra;
  return JSON.parse(JSON.stringify(out)); // tira os campos vazios
}

export const ldPerguntas = (faq) => ({ "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) });
