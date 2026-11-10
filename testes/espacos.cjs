/* Autokan: verificação de espaçamento. Rode antes de cada envio:
     node testes/espacos.cjs                       (site local, http://localhost:8791)
     node testes/espacos.cjs https://deploy-preview-N--autokan.netlify.app
   Duas regras, em várias páginas, estados (busca aberta, filtros, ficha) e larguras (celular e computador):
   1. Laterais: nada sai da caixa do pai nem da tela (botão pregado na lateral, texto vazando).
   2. Encostados: dois blocos com fundo, borda ou sombra nunca ficam a menos de 3 px um do outro, em cima, embaixo
      ou do lado. Só passa quando os dois formam um mesmo painel (o mesmo fundo, sem borda) ou são linhas da mesma lista.
   3. Etiquetas soltas (selos e avisos posicionados por cima de uma caixa) não podem se encostar umas nas outras.
   Para um caso de propósito, marque o elemento com data-espaco="ok" e explique no código por quê.
   Sai com código 1 se achar problema. */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8791').replace(/\/$/, '');
const SO = process.env.ESPACOS_SO || '';      // para rodar só uma parte: ESPACOS_SO="busca"
const CSS = process.env.ESPACOS_CSS || '';    // para provar que a verificação pega um erro: ESPACOS_CSS=".q-vh{margin-top:0}"

const TELAS = [['celular 390', { width: 390, height: 844 }], ['celular 360', { width: 360, height: 740 }], ['computador', { width: 1280, height: 900 }]];
const PAGINAS = ['/', '/novidades', '/carros', '/carros/jeep', '/carros/jeep/compass', '/comparar/jeep-compass-vs-toyota-corolla-cross', '/comparar', '/noticias', '/suvs', '/carros-ate-150-mil', '/contato'];

/* estados da página inicial e da busca do topo das outras páginas */
const ESTADOS = [
  ['/', 'busca "mustang"', async (p) => { await abreBusca(p, 'mustang'); }],
  ['/', 'busca "chevrolet"', async (p) => { await abreBusca(p, 'chevrolet'); }],
  ['/', 'filtros abertos', async (p) => { await p.evaluate(() => openDrawer()); await p.waitForTimeout(600); }],
  ['/', 'ficha aberta', async (p) => { await p.evaluate(() => { const b = document.querySelector('.row:not(.ghost) .card.sel button.go') || document.querySelector('.showroom button.go'); b && b.click(); }); await p.waitForTimeout(900); }],
  ['/', 'ficha com oferta', async (p) => { await p.evaluate(() => { const c = CARS.find((x) => x.pc && x.bk) || CARS.find((x) => x.pc); c && openInfo(c.id); }); await p.waitForTimeout(900); }],
  ['/', 'filtro Black', async (p) => { await p.evaluate(() => { const q = document.querySelector('#quick [data-black]'); q && q.click(); }); await p.waitForTimeout(1800); }],
  ['/', 'cartão com o selo mais longo', async (p) => { await p.evaluate(() => { const c = CARS.filter((x) => typeof isBlack === 'function' && isBlack(x)).sort((a, b) => b.bk.length - a.bk.length)[0]; c && goToCar(c, true, true); }); await p.waitForTimeout(2500); }],
  ['/', 'cartão com Oferta e Novo', async (p) => { await p.evaluate(() => { const c = CARS.find((x) => typeof isOffer === 'function' && isOffer(x) && isNew(x)); c && goToCar(c, true, true); }); await p.waitForTimeout(2500); }],
  ['/', 'busca "rampage" (Black)', async (p) => { await abreBusca(p, 'rampage'); }],
  ['/carros/jeep/compass', 'busca do topo', async (p) => { await p.click('#tBuscaBtn'); await p.fill('#tBq', 'compass'); await p.waitForTimeout(600); }],
];
async function abreBusca(p, t) {
  await p.evaluate(() => { const sb = document.getElementById('sbtn'); if (sb && getComputedStyle(sb).display !== 'none' && !document.querySelector('.top.searching')) sb.click(); });
  await p.waitForTimeout(300);
  await p.evaluate((t) => { const q = document.getElementById('q'); q.focus(); q.value = t; q.dispatchEvent(new Event('input')); }, t); await p.waitForTimeout(500);
}

function verifica() {
  const vw = innerWidth, out = [];
  const visivel = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && e.getClientRects().length; };
  const nome = (e) => ((e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) || e.tagName.toLowerCase();
  const ok = (e) => !!e.closest('[data-espaco="ok"]');
  // escondido, fileira-fantasma da roleta ou conteúdo de um "abre e fecha" fechado (só o título dele aparece)
  const fechado = (e) => !!e.closest('[hidden], .row.ghost') || (!!e.closest('details:not([open])') && !e.closest('summary') && e.tagName !== 'DETAILS');

  // 1. laterais
  document.querySelectorAll('button, a, input, select, textarea, img, h1, h2, h3, p, label, small, b, strong, li').forEach((e) => {
    if (!visivel(e) || fechado(e) || ok(e)) return;
    const s = getComputedStyle(e); if (s.position === 'absolute' || s.position === 'fixed') return;
    const P = e.parentElement; if (!P) return;
    const o = getComputedStyle(P).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return; // faixas que rolam de lado
    const ps = getComputedStyle(P), pr = P.getBoundingClientRect(), x = e.getBoundingClientRect();
    if (!x.width || !pr.width || ps.display === 'contents') return;
    const L = pr.left + parseFloat(ps.borderLeftWidth) + parseFloat(ps.paddingLeft), R = pr.right - parseFloat(ps.borderRightWidth) - parseFloat(ps.paddingRight);
    const fora = Math.max(L - x.left, x.right - R);
    let sc = P, rola = false; while (sc && sc !== document.body) { const ov = getComputedStyle(sc).overflowX; if (ov === 'auto' || ov === 'scroll') { rola = true; break; } sc = sc.parentElement; }
    const tela = !rola && (x.left < -0.5 || x.right > vw + 0.5);
    if (fora > 1.5 || tela) out.push(`lateral: ${nome(e)} sai de ${nome(P)} (${Math.round(fora)} px${tela ? ', sai da tela' : ''})`);
  });

  // 2. encostados: blocos com fundo, borda ou sombra
  const cor = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return v.length > 3 && v[3] < 0.05 ? null : v.slice(0, 3).join(','); };
  /* camada: o que fica por cima de outra coisa (lista suspensa, gaveta, fileira que rola) só é comparado com o que está na mesma camada */
  const camada = (e) => { let x = e.parentElement; while (x && x !== document.body) { const s = getComputedStyle(x); if (['absolute', 'fixed', 'sticky'].includes(s.position) || ['auto', 'scroll', 'hidden'].includes(s.overflowX) || ['auto', 'scroll'].includes(s.overflowY)) return x; x = x.parentElement; } return document.body; };
  const caixas = [];
  document.querySelectorAll('div, li, section, article, aside, header, nav, a, button, span, label, input, select, textarea, details, form, p, ul, ol, figure').forEach((e) => {
    if (!visivel(e) || fechado(e) || ok(e)) return;
    const s = getComputedStyle(e); if (s.position === 'absolute' || s.position === 'fixed' || s.display === 'contents' || s.display === 'inline') return;
    const r = e.getBoundingClientRect(); if (r.width < 12 || r.height < 12) return;
    const bg = cor(s.backgroundColor), fundo = bg && bg !== '255,255,255';
    const borda = ['Top', 'Right', 'Bottom', 'Left'].some((l) => parseFloat(s[`border${l}Width`]) > 0 && cor(s[`border${l}Color`]));
    const sombra = s.boxShadow && s.boxShadow !== 'none';
    if (!fundo && !borda && !sombra) return;
    caixas.push({ e, r, bg: fundo ? bg : null, borda, sombra, camada: camada(e), reto: parseFloat(s.borderTopLeftRadius) < 1 && parseFloat(s.borderBottomRightRadius) < 1 });
  });
  const ancestral = (a, b) => { let n = 0, x = a.e.parentElement; while (x && n < 5) { if (x.contains(b.e)) return x; x = x.parentElement; n++; } return null; };
  for (let i = 0; i < caixas.length; i++) for (let j = i + 1; j < caixas.length; j++) {
    const a = caixas[i], b = caixas[j];
    if (a.e.contains(b.e) || b.e.contains(a.e) || a.camada !== b.camada) continue;
    const pai = ancestral(a, b); if (!pai) continue;
    // seções da página de ponta a ponta e sem cantos arredondados (cabeçalho, faixa, rodapé de painel) se empilham de propósito
    const pw = pai.getBoundingClientRect().width;
    if (a.reto && b.reto && a.r.width >= pw * 0.95 && b.r.width >= pw * 0.95) continue;
    // um mesmo painel (o mesmo fundo, sem borda nem sombra) ou linhas da mesma lista podem se tocar
    if (a.bg && a.bg === b.bg && !a.borda && !b.borda && !a.sombra && !b.sombra) continue;
    if (a.e.parentElement === b.e.parentElement && a.e.tagName === b.e.tagName && (a.e.classList[0] || '') === (b.e.classList[0] || '') && a.r.width === b.r.width && !a.e.closest('.card')) continue; // linhas da mesma lista ou tabela
    const sobH = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), sobV = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    const vaoV = Math.max(b.r.top - a.r.bottom, a.r.top - b.r.bottom), vaoH = Math.max(b.r.left - a.r.right, a.r.left - b.r.right);
    if (sobH > 8 && vaoV > -1.5 && vaoV < 3) out.push(`encostados: ${nome(a.e)} e ${nome(b.e)} (${Math.max(0, Math.round(vaoV))} px na vertical)`);
    else if (sobV > 8 && vaoH > -1.5 && vaoH < 3) out.push(`encostados: ${nome(a.e)} e ${nome(b.e)} (${Math.max(0, Math.round(vaoH))} px na horizontal)`);
    else if (sobH > 8 && sobV > 8) out.push(`sobrepostos: ${nome(a.e)} e ${nome(b.e)}`);
  }
  // 3. etiquetas soltas (posição absoluta) na mesma caixa não podem se encostar nem se sobrepor
  //    (ex.: o selo Black e o "ilustrativa" no canto da foto do cartão)
  const etq = [];
  document.querySelectorAll('body *').forEach((e) => {
    if (!visivel(e) || fechado(e) || ok(e)) return;
    const solta = getComputedStyle(e).position === 'absolute';
    const P = e.parentElement, noGrupo = !solta && P && getComputedStyle(P).position === 'absolute' && P.getBoundingClientRect().height < 40; // selo dentro de um grupo de selos
    if (!solta && !noGrupo) return;
    if (!e.textContent.trim() && !(e.matches('button,[role="img"]') && e.querySelector('svg'))) return; // texto, ou ícone que é botão/imagem
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.height > 40 || r.width > 320) return;
    etq.push({ e, r, pai: solta ? e.offsetParent : P.offsetParent });
  });
  for (let i = 0; i < etq.length; i++) for (let j = i + 1; j < etq.length; j++) {
    const a = etq[i], b = etq[j];
    if (a.pai !== b.pai || a.e.contains(b.e) || b.e.contains(a.e)) continue;
    if (a.r.left < b.r.right + 2 && b.r.left < a.r.right + 2 && a.r.top < b.r.bottom + 2 && b.r.top < a.r.bottom + 2) out.push(`etiquetas encostadas: ${nome(a.e)} e ${nome(b.e)}`);
  }
  return { lateral: document.documentElement.scrollWidth > vw + 0.5, problemas: [...new Set(out)] };
}

(async () => {
  const b = await chromium.launch();
  let total = 0;
  const roda = async (rotulo, vp, url, acao) => {
    if (SO && !`${rotulo} ${url}`.includes(SO)) return;
    const p = await b.newPage({ viewport: vp });
    await p.route('**/tracker.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.giroTrack=function(){}' })); // visitas de teste não contam
    const res = await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => null);
    if (url === '/') await p.waitForFunction(() => typeof loaded !== 'undefined' && loaded, null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
    if (CSS) await p.addStyleTag({ content: CSS });
    if (acao) await acao(p).catch((e) => console.log(`  (não consegui montar o estado: ${e.message.split('\n')[0]})`));
    let r = await p.evaluate(verifica);
    // na página inicial, confere a roleta em várias faixas de preço (cada faixa mostra carros diferentes)
    if (url === '/' && !acao) for (const f of [0.1, 0.3, 0.55, 0.8]) {
      await p.evaluate((f) => dial.goTo(Math.round((VALUES.length - 1) * f)), f); await p.waitForTimeout(1600);
      const x = await p.evaluate(verifica); r = { lateral: r.lateral || x.lateral, problemas: [...new Set([...r.problemas, ...x.problemas])] };
    }
    if (r.lateral) r.problemas.unshift('a página rola de lado');
    if (r.problemas.length) { total += r.problemas.length; console.log(`\n✗ ${rotulo} · ${url}${res ? '' : ' (não abriu)'}\n  ` + r.problemas.slice(0, 25).join('\n  ') + (r.problemas.length > 25 ? `\n  … e mais ${r.problemas.length - 25}` : '')); }
    await p.close();
  };
  for (const [nomeTela, vp] of TELAS) {
    for (const u of PAGINAS) await roda(nomeTela, vp, u);
    for (const [u, estado, acao] of ESTADOS) await roda(`${nomeTela} · ${estado}`, vp, u, acao);
  }
  console.log(total ? `\n${total} problema(s) de espaçamento.` : '\nNenhum problema de espaçamento.');
  await b.close();
  process.exit(total ? 1 : 0);
})();
