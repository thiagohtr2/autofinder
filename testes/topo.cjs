/* Confere que o topo é o mesmo em todas as telas: ☰, logo, buscar, Entrar e Cadastrar com a mesma posição e o mesmo
   tamanho na página inicial, nas páginas do servidor, no painel e nos painéis Banco de dados e Radar.
     NODE_PATH=$(npm root -g) node testes/topo.cjs                         (site local, http://localhost:8791)
     NODE_PATH=$(npm root -g) node testes/topo.cjs https://deploy-preview-N--autokan.netlify.app
   Larguras de celular: 360, 390 e 430. Tolerância de 0,5 px. (No computador a página inicial tem a busca e os filtros
   no topo, então ele é diferente de propósito.) */
const { chromium } = require('playwright');
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const BASE = (process.argv[2] || 'http://localhost:8791').replace(/\/$/, '');
const LARGURAS = [[360, 780, true], [390, 844, true], [430, 932, true]];
/* cada tela: endereço e, se preciso, o que fazer antes de medir */
const TELAS = [
  ['início', '/', null],
  ['página do carro', '/carros/jeep/compass', null],
  ['lista', '/carros-ate-150-mil', null],
  ['painel', '/admin.html', null],
  ['banco de dados', '/', async (p) => { await p.evaluate(() => openDB()); }],
  ['radar', '/', async (p) => { await p.evaluate(() => openRadar()); }],
];
/* peças do topo: a página inicial tem o próprio topo (#mnBtn .logo #sbtn #loginbtn #signupbtn); as outras usam public/topo.mjs */
const mede = () => {
  const vis = (el) => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const r = (el) => { if (!vis(el)) return null; const b = el.getBoundingClientRect(); return { x: +b.left.toFixed(2), y: +b.top.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  const um = (...sels) => { for (const s of sels) { const els = [...document.querySelectorAll(s)].filter(vis); if (els.length) return els[0]; } return null; };
  return {
    barra: r(um('#topo', 'header.top')),
    menu: r(um('#mnBtn')),
    logo: r(um('#topo .ak-logo img.ico', '#topo .ak-logo img.full', 'header.top .logo-ico', 'header.top .logo-img')),
    buscar: r(um('#tBuscaBtn', '#sbtn')),
    entrar: r(um('#tConta .t-btn:not(.pri)', '#loginbtn')),
    cadastrar: r(um('#tConta .t-btn.pri', '#signupbtn')),
  };
};
(async () => {
  const b = await chromium.launch();
  const problemas = [];
  for (const [w, h, mob] of LARGURAS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    await ctx.addInitScript(() => { try { localStorage.setItem('autokan_dica_roleta', '1'); } catch (e) {} });
    const medidas = [];
    for (const [nome, url, antes] of TELAS) {
      const p = await ctx.newPage();
      await p.route(/tracker\.js/, (r) => r.abort());
      /* fotos e logos nunca vêm do Supabase nos testes: cada verificação abria centenas de fotos de ~1 MB e estourou a cota
         de tráfego do plano grátis (13/11/2026). No lugar, uma imagem de 1 px; o espaço do cartão é o mesmo */
      await p.route(/supabase\.co\/storage\/v1\/|\/\.netlify\/images/, (r) => r.fulfill({ contentType: 'image/png', body: Buffer.from(PNG_1PX, 'base64') }));
      await p.goto(BASE + url, { waitUntil: 'networkidle' }).catch(() => {});
      await p.waitForTimeout(1500);
      if (antes) { await antes(p); await p.waitForTimeout(700); }
      medidas.push([nome, await p.evaluate(mede)]);
      await p.close();
    }
    await ctx.close();
    const [ref, m0] = medidas[0];
    for (const [nome, m] of medidas.slice(1)) {
      for (const peca of Object.keys(m0)) {
        const a = m0[peca], c = m[peca];
        if (!a && !c) continue;
        if (!a || !c) { problemas.push(`${w}px · ${nome}: ${peca} ${c ? 'aparece' : 'não aparece'} (no ${ref} ${a ? 'aparece' : 'não aparece'})`); continue; }
        for (const k of ['x', 'y', 'w', 'h']) if (Math.abs(a[k] - c[k]) > 0.5) problemas.push(`${w}px · ${nome}: ${peca} ${k}=${c[k]} (no ${ref} ${a[k]})`);
      }
    }
    console.log(`${w}px:`, medidas.map(([n, m]) => `${n} ${m.barra ? m.barra.h : '-'}`).join(' · '));
  }
  await b.close();
  if (problemas.length) { console.log('Topo diferente entre as telas:\n- ' + problemas.join('\n- ')); process.exit(1); }
  console.log('Topo igual em todas as telas.');
})();
