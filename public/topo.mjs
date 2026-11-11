/* Autokan: o topo do site numa peça só: ☰, logo, buscar e a conta (Entrar e Cadastrar, ou o botão da pessoa).
   Usado pelas páginas do servidor (netlify/lib/paginas.mjs importa daqui) e pelo painel (admin.html importa no navegador),
   como a ficha-tecnica.mjs. A página inicial tem o mesmo topo com a busca e os filtros do computador; testes/topo.cjs
   confere que o topo sai com as mesmas medidas em todas as telas.
   O ☰ abre o menu da página: o menu do site nas páginas comuns e o menu do painel no painel. */

export const LUPA = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14 14 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const HAMBURGUER = '<svg class="hb-cel" viewBox="0 0 22 16" width="22" height="16" aria-hidden="true"><path d="M1 2H21M1 8H21M1 14H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><svg class="hb-pc" viewBox="0 0 22 13" width="22" height="13" aria-hidden="true"><path d="M1 2H21M1 6.5H21M1 11H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const FECHA_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/* cores e letras presas no topo e no menu, para saírem iguais em qualquer página */
const VARS = '--navy:#060b1c;--accent:#1d6bff;--ink:#0c111c;--muted:#5d6577;--line:#e7eaf0;--panel:#f5f7fa;--display:"Sora","Segoe UI",system-ui,sans-serif;--body:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif';

export const TOPO_CSS = `
.ak-top,.mn{${VARS}}
.ak-top{font:400 15px/1.55 var(--body);-webkit-font-smoothing:antialiased}
.ak-top *,.ak-top *::before,.ak-top *::after{box-sizing:border-box}
.ak-top button{font-family:inherit}
.ak-top img{max-width:100%;height:auto;display:block}
.ak-top .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ak-wrap{width:min(1120px,100%);margin:0 auto;padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right))}
.ak-top{background:var(--navy);color:#fff;position:sticky;top:0;z-index:5;padding-top:env(safe-area-inset-top)}
.ak-in{display:flex;align-items:center;gap:18px;height:60px}
.ak-logo{display:flex;align-items:center;flex:none}
.ak-logo .ico{display:none}
.ak-acts{display:flex;align-items:center;gap:8px;flex:none;margin-left:auto}
.ak-mn{flex:none;width:34px;height:34px;padding:0;border:0;border-radius:10px;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer}
.ak-mn svg{width:22px;height:auto}
.ak-mn:hover,.ak-mn[aria-expanded="true"]{background:rgba(255,255,255,.1)}
.ak-mn+.ak-logo{margin-left:-6px}
@media (max-width:640px){.ak-mn+.ak-logo{margin-left:0}}
.t-ic{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;padding:0;text-decoration:none}
.t-ic svg{width:16px;height:16px}
.t-ic:hover,.t-ic.on{background:#fff;color:var(--navy);border-color:#fff}
.t-conta{display:flex;align-items:center;gap:8px;position:relative}
.t-btn{display:inline-flex;align-items:center;height:34px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.28);color:#fff;text-decoration:none;font-weight:700;font-size:13.5px;white-space:nowrap}
.t-btn:hover{background:rgba(255,255,255,.1)}
.t-btn.pri{background:var(--accent);border-color:var(--accent)}
.t-pf{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:#eaf1ff;color:var(--accent);font:700 14px var(--display);display:grid;place-items:center;overflow:hidden;cursor:pointer;padding:0}
.t-pf img{width:100%;height:100%;object-fit:cover}
.t-pm{position:absolute;right:0;top:calc(100% + 10px);z-index:9;width:250px;background:#fff;color:var(--ink);border-radius:16px;box-shadow:0 24px 60px -20px rgba(6,11,28,.45),0 0 0 1px var(--line);padding:6px;display:flex;flex-direction:column}
.t-pm[hidden]{display:none}
.t-pm-h{display:flex;flex-direction:column;gap:2px;padding:10px 10px 8px;border-bottom:1px solid var(--line);margin-bottom:4px;min-width:0}
.t-pm-h b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t-pm-h small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t-pm a,.t-pm button{display:block;width:100%;text-align:left;padding:10px;border:0;background:none;border-radius:10px;color:var(--ink);text-decoration:none;font:600 14px var(--body);cursor:pointer}
.t-pm a:hover,.t-pm button:hover{background:var(--panel)}
.t-pm a[hidden]{display:none}
.t-busca{background:var(--navy);padding:0 0 12px}
.t-busca[hidden]{display:none}
.t-bq{display:flex;align-items:center;gap:10px;height:46px;padding:0 14px;border-radius:12px;background:#fff;color:var(--muted)}
.t-bq svg{width:17px;height:17px;flex:none}
.t-bq input{flex:1;min-width:0;height:100%;border:0;background:none;font:600 16px var(--body);color:var(--ink);outline:none}
.t-br{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}
.t-br:empty{display:none}
.t-br a{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:2px 12px;padding:10px 12px;border-radius:10px;color:#fff;text-decoration:none}
@media (hover:hover){.t-br a:hover{background:rgba(255,255,255,.1)}}
.t-br a.on,.t-br a:active{background:rgba(255,255,255,.1)}
.t-br b{font-weight:700;font-size:15px}
.t-ano{margin-left:7px;font-weight:500;font-size:11.5px;font-variant-numeric:tabular-nums;color:#a3a3a3}
.t-br small{font-size:12.5px;color:#9fb1d1;white-space:nowrap}
.t-nada{padding:10px 12px;color:#9fb1d1;font-size:14px}
@media (max-width:640px){.ak-logo .full{display:none}.ak-logo .ico{display:block;transform:translateY(2px)}.ak-in{gap:8px}.t-ic{width:30px;height:30px}.t-ic svg{width:14px;height:14px}.t-btn{height:30px;padding:0 12px;font-size:12.5px}.t-pf{width:32px;height:32px}.ak-acts{gap:6px}}
@media (max-width:370px){.t-btn{padding:0 10px}}
/* ===== topo no padrão da bancada (aba "Design do topo", 10/11/2026) =====
   celular (até 760 px): barra de 42 px; ☰ de 27 px (desenho de 22 × 16, traços de 2 px a cada 6 px); logo de 18 px no meio da barra, 10 px depois do ☰;
   buscar de 30 px só com o contorno (lupa de 14); Entrar e Cadastrar com 30 px, letra de 12,5 e 13 px dos lados; 12 px entre eles e do buscar.
   computador: barra de 64 px; ☰ de 30 px (desenho de 22 × 13, traços a cada 4,5 px); buscar de 34 px (lupa de 16);
   Entrar e Cadastrar com 32 px, letra de 12,5 e 12 px dos lados. O texto dos botões fica no meio pela altura das maiúsculas. */
.ak-mn .hb-pc{display:none}
.t-btn>span{display:block;text-box:trim-both cap alphabetic}
.t-ic{background:transparent;border-color:rgba(255,255,255,.28)}
@media (min-width:761px){.ak-mn .hb-cel{display:none}.ak-mn .hb-pc{display:block}.ak-in{height:64px}.ak-mn{width:30px;height:30px}.ak-mn+.ak-logo{margin-left:-8px}.ak-acts,.t-conta{gap:12px}.t-ic{width:34px;height:34px}.t-ic svg{width:16px;height:16px}.t-btn{height:32px;padding:0 12px;font-size:12.5px}.t-pf{width:32px;height:32px}}
@media (max-width:760px){.ak-in{height:42px;gap:8px}.ak-mn{width:27px;height:27px}.ak-mn+.ak-logo{margin-left:2px}.ak-logo .ico{transform:none}.ak-acts,.t-conta{gap:12px}.t-ic{width:30px;height:30px}.t-ic svg{width:14px;height:14px}.t-btn{height:30px;padding:0 13px;font-size:12.5px}.t-pf{width:30px;height:30px}}
@media (max-width:359px){.t-btn{padding:0 10px}.ak-acts,.t-conta{gap:8px}}
`.replace(/\n\s*/g, "");

/* menu lateral: a moldura (fundo escuro e painel que entra pela esquerda) e o que vai dentro */
export const MENU_CSS = `
.mn{position:fixed;inset:0;z-index:70}
.mn[hidden]{display:none}
.mn-fundo{position:absolute;inset:0;background:rgba(6,11,28,.45);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);animation:mn-f .2s ease}
.mn-p{position:absolute;left:0;top:0;bottom:0;width:min(330px,88vw);display:flex;flex-direction:column;background:#fff;color:#0c111c;box-shadow:24px 0 60px -24px rgba(6,11,28,.5);animation:mn-a .26s cubic-bezier(.2,.8,.2,1);outline:none;padding-top:env(safe-area-inset-top,0px);font-family:var(--body)}
@keyframes mn-a{from{transform:translateX(-100%)}}
@keyframes mn-f{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.mn-p,.mn-fundo{animation:none}}
.mn-h{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e7eaf0}
.mn-h img{display:block;height:18px;width:auto}
.mn-x{flex:none;width:34px;height:34px;padding:0;border:1px solid #e1e5ee;border-radius:50%;background:#fff;color:#0c111c;display:grid;place-items:center;cursor:pointer}
.mn-x svg{width:14px;height:14px}
.mn-x:hover{border-color:#1d6bff;color:#1d6bff}
.mn-b{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:6px 6px calc(28px + env(safe-area-inset-bottom,0px))}
.mn-conta{display:flex;gap:8px;padding:10px 10px 4px}
.mn-conta:empty{display:none}
.mn-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 14px;border:1px solid #d6dbe5;border-radius:999px;background:#fff;color:#0c111c;font:700 14px var(--body);text-decoration:none;cursor:pointer}
.mn-btn.pri{background:#1d6bff;border-color:#1d6bff;color:#fff}
.mn-eu{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.mn-eu b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-eu small{font-size:12px;color:#5d6577;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-conta .mn-eu+.mn-btn{flex:none}
.mn-t{margin:18px 10px 6px;font:800 10.5px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:#5d6577}
.mn-i{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:12px;color:#0c111c;text-decoration:none;font-weight:700;font-size:14.5px;line-height:1.25}
.mn-i[hidden]{display:none}
.mn-i:hover,.mn-i:focus-visible{background:#f2f6fd}
.mn-i svg{width:20px;height:20px;flex:none;color:#1d6bff}
.mn-i>span{display:flex;flex-direction:column;min-width:0}
.mn-l{display:block}
.mn-i small{font-weight:500;font-size:12px;color:#5d6577}
.mn-i.mn-black svg{color:#0c111c}
.mn-i.mn-black b{display:inline-block;margin-right:4px;padding:3px 5px 2px;border-radius:3px;background:#000;color:#fff;font:900 10px/1 var(--body);letter-spacing:.06em;text-transform:uppercase}
.mn-g summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border-radius:12px;font-weight:700;font-size:14px;color:#0c111c;cursor:pointer}
.mn-g summary::-webkit-details-marker{display:none}
.mn-g summary::after{content:"";flex:none;width:7px;height:7px;margin-right:4px;border-right:2px solid #8a93a6;border-bottom:2px solid #8a93a6;transform:rotate(45deg) translateY(-2px);transition:transform .2s}
.mn-g[open] summary::after{transform:rotate(-135deg) translateY(-2px)}
.mn-g summary:hover,.mn-g summary:focus-visible{background:#f2f6fd}
.mn-g ul{list-style:none;margin:0 0 6px;padding:0 0 0 12px}
.mn-g li a{display:block;padding:8px 10px;border-radius:10px;color:#2a3242;text-decoration:none;font-size:13.5px;font-weight:600}
.mn-g li a:hover,.mn-g li a:focus-visible{background:#f2f6fd}
.mn-erro{padding:20px 16px;color:#5d6577;font-size:14px}
`.replace(/\n\s*/g, "");

/* rotuloMenu: o que o leitor de tela diz no ☰ (ex.: "Abrir o menu do painel") */
export function topoHTML({ rotuloMenu = "Abrir menu" } = {}) {
  return `<header class="ak-top" id="topo"><div class="ak-wrap ak-in">
<button type="button" class="ak-mn" id="mnBtn" aria-label="${rotuloMenu}" aria-expanded="false" aria-controls="menu">${HAMBURGUER}</button>
<a class="ak-logo" href="/" aria-label="Autokan: página inicial"><img class="full" src="/marca/autokan-logo-topo-escuro.png?v=6" alt="Autokan" width="168" height="18"><img class="ico" src="/marca/autokan-simbolo-topo.png?v=6" alt="Autokan" width="42" height="18"></a>
<div class="ak-acts">
<button type="button" class="t-ic" id="tBuscaBtn" aria-label="Buscar carro" title="Buscar carro" aria-expanded="false" aria-controls="tBusca">${LUPA}</button>
<span class="t-conta" id="tConta"><a class="t-btn" href="/?entrar=1"><span>Entrar</span></a><a class="t-btn pri" href="/?cadastrar=1"><span>Cadastrar</span></a></span>
</div></div>
<div class="t-busca" id="tBusca" hidden><div class="ak-wrap"><label class="t-bq">${LUPA}<span class="sr">Buscar carro ou marca</span><input type="search" id="tBq" placeholder="Buscar carro ou marca" autocomplete="off" enterkeyhint="go"></label><ul class="t-br" id="tBr"></ul></div></div>
</header>`.replace(/\n/g, "");
}

/* moldura do menu: fundo escuro + painel; o conteúdo vai dentro de #menuP */
export const molduraMenu = (conteudo = "", rotulo = "Menu") => `<div class="mn" id="menu" hidden><div class="mn-fundo" data-mn-fecha></div><aside class="mn-p" id="menuP" role="dialog" aria-modal="true" aria-label="${rotulo}" tabindex="-1">${conteudo}</aside></div>`;

/* O que o topo faz no navegador: a conta da pessoa (Entrar e Cadastrar, ou o botão com o menu da conta), o ☰ e a busca.
   A sessão é a mesma da roleta, guardada no navegador. sb e chave: endereço e chave pública do Supabase.
   O ☰ abre o menu que estiver em #menuP (o do site nas páginas comuns, o do painel no painel). */
export function iniciaTopo({ sb, chave } = {}) {
  const CH = "sb-" + String(sb || "").split("//")[1]?.split(".")[0] + "-auth-token";
  const e = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const sa = (t) => String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const $ = (id) => document.getElementById(id);

  /* conta */
  let s = null;
  try { s = JSON.parse(localStorage.getItem(CH) || "null"); } catch (x) {}
  const u = s && s.user, box = $("tConta");
  if (u && box) {
    const m = u.user_metadata || {}, nome = m.full_name || m.name || (u.email || "").split("@")[0] || "Você";
    const av = typeof m.avatar_url === "string" && /^https:\/\//.test(m.avatar_url) ? m.avatar_url : "";
    box.innerHTML = '<button type="button" class="t-pf" id="tPf" aria-haspopup="menu" aria-expanded="false" aria-controls="tPm" aria-label="Sua conta" title="Sua conta">' + (av ? '<img src="' + e(av) + '" alt="" referrerpolicy="no-referrer">' : e(nome.trim().charAt(0).toUpperCase())) + "</button>" +
      '<div class="t-pm" id="tPm" role="menu" aria-label="Sua conta" hidden><div class="t-pm-h"><b>' + e(nome) + "</b><small>" + e(u.email || "") + "</small></div>" +
      '<a role="menuitem" href="/salvos">Salvos</a><a role="menuitem" href="/">Escolha o preço</a><a role="menuitem" href="/admin.html" class="t-adm" hidden>Painel de uso</a><a role="menuitem" href="/admin.html#mensagens" class="t-adm" hidden>Mensagens</a><button type="button" role="menuitem" id="tVerPc" hidden></button><a role="menuitem" href="/contato">Fale com a gente</a><button type="button" role="menuitem" id="tSair">Sair</button></div>';
    const pf = $("tPf"), pm = $("tPm");
    const abre = (v) => { pm.hidden = !v; pf.setAttribute("aria-expanded", String(v)); };
    pf.onclick = (x) => { x.stopPropagation(); abre(pm.hidden); };
    document.addEventListener("click", (x) => { if (!pm.hidden && !x.target.closest("#tPm")) abre(false); });
    document.addEventListener("keydown", (x) => { if (x.key === "Escape" && !pm.hidden) { abre(false); pf.focus(); } });
    const tok = s.access_token, valido = tok && (!s.expires_at || s.expires_at * 1000 > Date.now());
    if (valido) fetch(sb + "/rest/v1/profiles?select=role&id=eq." + encodeURIComponent(u.id), { headers: { apikey: chave, Authorization: "Bearer " + tok } })
      .then((r) => (r.ok ? r.json() : [])).then((r) => {
        if (!(r[0] && r[0].role === "admin")) return;
        document.querySelectorAll(".t-adm").forEach((a) => (a.hidden = false));
        const vp = $("tVerPc");
        if (vp && window.autokanCelular && window.autokanCelular()) {
          const rot = () => { vp.textContent = window.autokanVerPC() ? "Ver como no celular" : "Ver como no computador"; };
          rot(); vp.hidden = false; vp.onclick = () => { abre(false); window.autokanVerPC(!window.autokanVerPC()); rot(); };
        }
      }).catch(() => {});
    $("tSair").onclick = () => {
      (valido ? fetch(sb + "/auth/v1/logout", { method: "POST", headers: { apikey: chave, Authorization: "Bearer " + tok } }) : Promise.resolve())
        .catch(() => {}).finally(() => { try { localStorage.removeItem(CH); } catch (x) {} location.reload(); });
    };
  }

  /* menu lateral (☰): abre por cima da página; fecha no X, no fundo escuro ou com Esc; o Tab não sai do menu enquanto ele está aberto */
  const mn = $("menu"), mp = $("menuP"), mb = $("mnBtn");
  let volta = null;
  /* parte "Sua conta" do menu: Entrar e Cadastrar, ou o nome e Sair. Chame de novo se trocar o conteúdo do menu */
  const conta = () => {
    const cb = $("mnConta"); if (!cb) return;
    const md = (u && u.user_metadata) || {};
    cb.innerHTML = u ? '<span class="mn-eu"><b>' + e(md.full_name || md.name || (u.email || "").split("@")[0] || "Você") + "</b><small>" + e(u.email || "") + '</small></span><button type="button" class="mn-btn" data-mn-sair>Sair</button>'
      : '<a class="mn-btn" href="/?entrar=1">Entrar</a><a class="mn-btn pri" href="/?cadastrar=1">Cadastrar</a>';
  };
  const abreMenu = () => { if (!mn) return; volta = document.activeElement; mn.hidden = false; mb.setAttribute("aria-expanded", "true"); document.documentElement.style.overflow = "hidden"; const x = mp.querySelector(".mn-x"); if (x) x.focus(); };
  const fechaMenu = () => { if (!mn || mn.hidden) return; mn.hidden = true; mb.setAttribute("aria-expanded", "false"); document.documentElement.style.overflow = ""; if (volta && volta.focus) volta.focus(); };
  if (mn && mp && mb) {
    conta();
    const focaveis = () => [...mp.querySelectorAll("a[href],button,summary,input,select")].filter((x) => x.offsetParent !== null && !x.disabled);
    mb.onclick = () => (mn.hidden ? abreMenu() : fechaMenu());
    mn.addEventListener("click", (x) => {
      if (x.target.closest("[data-mn-fecha]")) fechaMenu();
      else if (x.target.closest("[data-mn-sair]")) { const b = $("tSair"); if (b) b.click(); }
    });
    document.addEventListener("keydown", (x) => {
      if (mn.hidden) return;
      if (x.key === "Escape") { x.preventDefault(); fechaMenu(); return; }
      if (x.key === "Tab") {
        const f = focaveis(); if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (x.shiftKey && document.activeElement === a) { x.preventDefault(); z.focus(); }
        else if (!x.shiftKey && document.activeElement === z) { x.preventDefault(); a.focus(); }
      }
    });
  }

  /* busca */
  const bb = $("tBuscaBtn"), bx = $("tBusca"), q = $("tBq"), ul = $("tBr");
  let dados = null, sel = -1, itens = [];
  const carrega = () => dados || (dados = fetch("/busca.json").then((r) => r.json()).catch(() => ({ m: [], b: [] })));
  const abreB = (v) => { bx.hidden = !v; bb.setAttribute("aria-expanded", String(v)); bb.classList.toggle("on", v); if (v) { carrega(); q.focus(); } else { q.value = ""; ul.innerHTML = ""; } };
  if (bb && bx && q && ul) {
    bb.onclick = () => abreB(bx.hidden);
    document.addEventListener("keydown", (x) => { if (x.key === "Escape" && !bx.hidden) abreB(false); });
    const rs = (n) => "R$ " + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    q.addEventListener("input", async () => {
      const d = await carrega(), ts = sa(q.value.trim()).split(/\s+/).filter(Boolean);
      sel = -1;
      if (!ts.length) { ul.innerHTML = ""; itens = []; return; }
      const ok = (x) => ts.every((t) => x.q.includes(t)), bs = d.b.filter(ok).slice(0, 3), ms = d.m.filter(ok).slice(0, 8);
      itens = [...bs, ...ms];
      ul.innerHTML = itens.length ? itens.map((x) => '<li><a href="' + e(x.u) + '"><b>' + e(x.n) + (x.a ? '<span class="t-ano">' + e(String(x.a)) + "</span>" : "") + "</b><small>" + (x.p ? (x.s ? e(x.s) + " · " : "") + "a partir de " + rs(x.p) : x.s ? e(x.s) : "marca") + "</small></a></li>").join("") : '<li class="t-nada">Nenhum carro com esse nome</li>';
    });
    q.addEventListener("keydown", (x) => {
      const as = ul.querySelectorAll("a"); if (!as.length) return;
      if (x.key === "ArrowDown" || x.key === "ArrowUp") { x.preventDefault(); sel = (sel + (x.key === "ArrowDown" ? 1 : -1) + as.length) % as.length; as.forEach((a, i) => a.classList.toggle("on", i === sel)); as[sel].scrollIntoView({ block: "nearest" }); }
      if (x.key === "Enter") { x.preventDefault(); location.href = as[Math.max(0, sel)].getAttribute("href"); }
    });
  }
  return { abreMenu, fechaMenu, buscar: abreB, conta, logado: !!u };
}
