/* Pontos fortes de cada versão: as MESMAS regras do site (public/index.html), copiadas daqui
   para as páginas próprias dos carros mostrarem exatamente os mesmos selos.
   Ao mudar uma regra no site, copie de novo o trecho de "const ICONS={" até o fim de deriveTags. */
const ICONS={
  eletrico:'<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  hibrido:'<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 19 13 11" stroke="currentColor" stroke-width="2"/>',
  potente:'<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 4 2 4 0-4-1-6 1-10z" fill="currentColor"/>',
  economico:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 15a3 3 0 0 0 3 3" stroke="currentColor" stroke-width="2" fill="none"/>',
  turbo:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12c0-4 2-6 5-6M12 12c-4 0-6-2-6-5M12 12c0 4-2 6-5 6M12 12c4 0 6 2 6 5" stroke="currentColor" stroke-width="2" fill="none"/>',
  x4:'<path d="M2 20 9 8l4 6 3-4 6 10z" fill="currentColor"/>',
  diesel:'<path fill-rule="evenodd" d="M12 2.2C9.6 5.3 4.8 11 4.8 15a7.2 7.2 0 0 0 14.4 0c0-4-4.8-9.7-7.2-12.8zM8.6 10.2h3.1a4.2 4.2 0 0 1 0 8.4H8.6zm2 2h1.1a2.2 2.2 0 0 1 0 4.4h-1.1z" fill="currentColor"/>',
  plugin:'<path d="M7 3v4.5M12 3v4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4.5 7.5h10v2.8a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M9.5 15.3V18a3 3 0 0 0 3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M13.5 21c.1-4.3 2.6-6.8 7.5-7-.2 4.6-2.7 7-7.5 7z" fill="currentColor"/>',
  espaco:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 8l9 5 9-5M12 13v8" stroke="currentColor" stroke-width="2" fill="none"/>',
  tech:'<rect x="3" y="5" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2"/>',
};
const TAGDESC={eletrico:"100% elétrico: anda só com a bateria, recarregada na tomada ou em carregador. Não usa combustível.",
  hibrido:"Combina motor a combustão com motor elétrico para gastar menos combustível. Inclui híbridos plug-in, que também recarregam na tomada.",
  potente:"Potência alta: retomadas e ultrapassagens mais fáceis.",
  economico:"Baixo consumo de combustível ou de energia para a categoria.",
  turbo:"Motor com turbocompressor: mais força com um motor menor.",
  x4:"Tração nas quatro rodas (4x4 ou AWD): mais aderência em terra, lama e piso escorregadio.",
  diesel:"Motor a diesel: muita força em baixa rotação e boa autonomia, comum em picapes e SUVs grandes.",
  espaco:"Cabine e/ou porta-malas amplos para a categoria.",
  tech:"Destaque em tecnologia: multimídia, conectividade e assistentes de condução."};
const TAGS={eletrico:"Elétrico",hibrido:"Híbrido",potente:"Potente",economico:"Econômico",turbo:"Turbo",x4:"4x4",diesel:"Diesel",espaco:"Espaçoso",tech:"Tecnologia"};
/* Pontos fortes calculados com regras fixas a partir da ficha de cada versão — o mesmo critério para todos os carros.
   Só "Tecnologia" (e "Espaçoso" em SUV/sedã/hatch) vêm da pesquisa, porque a base ainda não tem dado objetivo para isso. */
const POT_CV=180;
const TAGRULE={eletrico:"Propulsão 100% elétrica.",hibrido:"Tem motor elétrico ajudando o motor a combustão (híbrido, híbrido leve ou plug-in).",
  potente:`A partir de ${POT_CV} cv (maior potência informada na ficha da versão).`,economico:"Elétrico, híbrido (HEV, plug-in ou REEV) ou motor a combustão de até 1.0 litro.",
  turbo:"Motor com turbo citado na ficha (Turbo, TSI, TGDi, TFSI, EcoBoost, T200/T270, TCe…).",
  x4:"Tração integral citada na ficha (4x4, AWD, 4WD, 4MOTION, quattro, xDrive, ALL4, 4MATIC…).",
  diesel:"Combustível diesel.",espaco:"Carroceria picape, van, minivan ou perua, ou 7+ lugares — ou indicado na pesquisa (porta-malas/cabine grandes).",
  tech:"Indicado na pesquisa da versão: multimídia, conectividade e assistentes de condução (ADAS) citados na fonte."};
const TAGORDER=["eletrico","hibrido","diesel","potente","turbo","x4","economico","espaco","tech"];
const RX_TURBO=/turbo|\btsi\b|tgdi|t-gdi|tfsi|ecoboost|\bt200\b|\bt270\b|turbo 200|\btce\b|\btci\b|\btdi\b|\bthp\b/i;
const RX_X4=/4x4|\bawd\b|\b4wd\b|4motion|quattro|xdrive|\ball4\b|4matic|sh-awd|\bxwd\b|allgrip|\bq4\b|\be-awd\b|integral|4x4/i;
function cvOf(r){
  const t=`${r.e||""} ${r.v||""}`;let best=null;
  for(const m of t.matchAll(/(\d{1,4}(?:[.,]\d{3})?|\d{1,4})\s*cv/gi)){const n=+m[1].replace(/[.,](?=\d{3}$)/,"");if(n>=40&&n<2500&&(!best||n>best))best=n}
  return best||(r.cv>=40?Math.round(r.cv):null);
}
function deriveTags(r){
  const txt=`${r.v||""} ${r.e||""}`,low=txt.toLowerCase(),pr=(r.pr||"").toLowerCase(),fu=r.f||"",cv=cvOf(r),noEng=!(r.e||"").trim();
  const research=Array.isArray(r.k)?r.k:[],k={},R="Indicado na pesquisa da versão (a ficha da base ainda não traz esse dado).";
  const reev=/reev|range extender|gerador/i.test(txt);
  const elet=!reev&&(pr==="elétrico"||fu==="Elétrico");
  if(elet)k.eletrico="Propulsão 100% elétrica.";
  let hib=!elet&&(reev||pr.includes("híbrido")||/híbrido|hybrid|\bhev\d*\b|phev|dm-i|e-hev|mhev|\bp\d{3}e\b/i.test(txt)||fu.startsWith("Híbrido"));
  const phev=/plug|phev|dm-i|\bp\d{3}e\b/i.test(txt+" "+fu+" "+pr);
  const leve=hib&&!phev&&!reev&&(pr==="híbrido leve"||/mhev|híbrido leve|48v/i.test(txt));
  if(hib)k.hibrido=reev?"Elétrico com gerador a gasolina (REEV): o motor a combustão só recarrega a bateria.":leve?"Híbrido leve (MHEV): o motor elétrico só ajuda o motor a combustão.":phev?"Híbrido plug-in: também recarrega na tomada.":"Híbrido: motor elétrico e motor a combustão trabalham juntos.";
  else if(!elet&&noEng&&research.includes("hibrido")){hib=true;k.hibrido=R}
  if(fu==="Diesel"||/diesel|\btdi\b|cummins|\bdci\b|\bd\d{3}\b/i.test(txt))k.diesel="Combustível: diesel.";
  else if(research.includes("diesel"))k.diesel=R;
  if(cv){if(cv>=POT_CV)k.potente=`Este carro tem ${cv} cv.`}
  else if(research.includes("potente"))k.potente="Potência não informada na base; indicado na pesquisa da versão.";
  if(!elet&&RX_TURBO.test(txt)){const m=txt.match(RX_TURBO);k.turbo=`A ficha cita “${m[0].trim()}”.`}
  else if(!elet&&research.includes("turbo"))k.turbo=R;
  if(RX_X4.test(txt)){const m=txt.match(RX_X4);k.x4=`A ficha cita “${m[0].trim()}”.`}
  else if(research.includes("x4"))k.x4=R;
  const dm=elet?null:txt.match(/\b([0-9])[.,]([0-9])\b/),disp=dm?parseFloat(dm[1]+"."+dm[2]):null;
  if(elet)k.economico="Elétrico: custo por quilômetro bem menor que o de um carro a combustão.";
  else if(hib&&!leve&&k.hibrido!==R)k.economico=reev?"Roda quase sempre na eletricidade: gasta bem menos combustível.":"Híbrido (HEV/plug-in): gasta bem menos combustível que um equivalente só a combustão.";
  else if(disp&&disp<=1.0)k.economico=`Motor ${dm[0].replace(",",".")} litro.`;
  const body=r.b||"",seats=(low.match(/(\d{1,2})\s*lugares/)||[])[1];
  if(/^(Picape|Van|Minivan|Perua)$/.test(body))k.espaco=`Carroceria ${body.toLowerCase()}.`;
  else if(seats&&+seats>=7)k.espaco=`${seats} lugares.`;
  else if(research.includes("espaco"))k.espaco="Indicado na pesquisa da versão: cabine e/ou porta-malas grandes para a categoria.";
  if(research.includes("tech"))k.tech=TAGRULE.tech;
  return {k:TAGORDER.filter(x=>k[x]),why:k,cv};
}

export { ICONS, TAGS, TAGDESC, TAGRULE, TAGORDER, POT_CV, cvOf, deriveTags };
