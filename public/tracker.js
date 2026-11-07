/* Autokan: medição de uso (visitas, pessoas online, origem, aparelho e ações).
 *
 * COMO USAR
 * 1. Coloque em todas as páginas, no <head>, antes dos outros scripts:
 *      <script src="/tracker.js"></script>
 *    Sozinho, ele já registra a visita, a página vista, a origem (Instagram, Google,
 *    WhatsApp, links com ?utm_source=...), o aparelho, e mantém a pessoa como "online"
 *    enquanto a aba estiver aberta.
 * 2. Nas ações, chame giroTrack(tipo, dados):
 *      giroTrack("spin",     {price_band: 150})                         // a roleta parou em "até 150 mil"
 *      giroTrack("view_car", {version_id: "208", model_id: "peugeot-208"}) // abriu a ficha de um carro
 *      giroTrack("vote",     {version_id: "208", meta: {on: true}})     // curtiu (on:false = tirou a curtida)
 *      giroTrack("save",     {version_id: "208", meta: {on: true}})     // salvou na Minha garagem
 *      giroTrack("compare",  {meta: {versions: ["208", "onix-lt"]}})    // abriu uma comparação
 *      giroTrack("share",    {version_id: "208", meta: {via: "whatsapp"}})
 *      giroTrack("search",   {meta: {q: "onix"}})
 *      giroTrack("signup") / giroTrack("login")
 *      giroTrack("click",    {meta: {el: "site-oficial"}})               // cliques que valem acompanhar
 *    Tipos aceitos pelo banco: page_view, spin, view_car, compare, save, vote, share, search, signup, login, click.
 *    Em navegação sem recarregar a página, chame giroTrack("page_view", {path: "/comparar/..."}).
 *
 * PRIVACIDADE
 * Cada navegador recebe um código aleatório (visitante) e cada visita outro (sessão). Não
 * guardamos IP, nome nem e-mail de quem não tem conta. Quem está logado é ligado à própria
 * conta pelo banco. Os dados só podem ser lidos pela conta admin (funções admin_*).
 * Neste navegador, localStorage "autokan_sem_rastreio" = "1" desliga a medição (o painel
 * admin liga isso para as visitas do dono não contarem).
 */
(function () {
  "use strict";
  var SB_URL = "https://ljgcvxadsekaicffztbi.supabase.co";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2N2eGFkc2VrYWljZmZ6dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTYyNjMsImV4cCI6MjEwOTM3MjI2M30._lZd1-cALOXrnR3nI0rwwWkfIAXYZ_qmVHJ7s3Ka2BM";
  var AUTH_KEY = "sb-ljgcvxadsekaicffztbi-auth-token";   // onde o supabase-js guarda o login
  var SESSION_IDLE_MS = 30 * 60 * 1000;                   // 30 min parado = nova visita
  var HEARTBEAT_MS = 45 * 1000;                           // o painel considera online quem deu sinal nos últimos 90 s
  var TYPES = {page_view: 1, spin: 1, view_car: 1, compare: 1, save: 1, vote: 1, share: 1, search: 1, signup: 1, login: 1, click: 1};

  function store(kind) { try { var s = window[kind]; s.setItem("__t", "1"); s.removeItem("__t"); return s; } catch (e) { return null; } }
  var ls = store("localStorage");
  var mem = {};
  function get(k) { try { return ls ? ls.getItem(k) : (mem[k] || null); } catch (e) { return mem[k] || null; } }
  function set(k, v) { try { if (ls) ls.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }

  var noop = function () {};
  if (get("autokan_sem_rastreio") === "1") { window.giroTrack = noop; window.giroTrackOff = true; return; }
  // navegador controlado por programa (testes automáticos, robôs): não entra nos números
  if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i.test(navigator.userAgent || "")) { window.giroTrack = noop; window.giroTrackOff = true; return; }
  if (!window.fetch || !window.Promise) { window.giroTrack = noop; return; }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  var visitor = get("autokan_visitante");
  if (!visitor) { visitor = uuid(); set("autokan_visitante", visitor); }

  function session() {
    var now = Date.now(), raw = get("autokan_sessao"), s = null;
    try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
    var fresh = !s || !s.id || now - (s.last || 0) > SESSION_IDLE_MS;
    if (fresh) s = {id: uuid(), last: now};
    s.last = now; set("autokan_sessao", JSON.stringify(s));
    return {id: s.id, fresh: fresh};
  }

  // usa o login da pessoa (se houver e não tiver vencido) para o banco ligar a visita à conta
  function bearer() {
    try {
      var raw = get(AUTH_KEY); if (!raw) return KEY;
      var t = JSON.parse(raw), tok = t && (t.access_token || (t.currentSession && t.currentSession.access_token));
      var exp = t && (t.expires_at || (t.currentSession && t.currentSession.expires_at));
      if (tok && exp && exp * 1000 > Date.now() + 15000) return tok;
    } catch (e) {}
    return KEY;
  }

  function rpc(fn, body) {
    var auth = bearer();
    var send = function (token) {
      return fetch(SB_URL + "/rest/v1/rpc/" + fn, {
        method: "POST", keepalive: true,
        headers: {"Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + token},
        body: JSON.stringify(body)
      });
    };
    return send(auth).then(function (r) {
      if ((r.status === 401 || r.status === 403) && auth !== KEY) return send(KEY);   // login vencido: registra como visitante
      return r;
    }).catch(noop);
  }

  // ---------- de onde veio e em que aparelho
  function device() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return "tablet";
    if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/i.test(ua)) return "celular";
    return "computador";
  }
  function browser() {
    var ua = navigator.userAgent || "";
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
    if (/WhatsApp/i.test(ua)) return "WhatsApp";
    if (/SamsungBrowser/i.test(ua)) return "Samsung";
    if (/Edg\//i.test(ua)) return "Edge";
    if (/OPR\/|Opera/i.test(ua)) return "Opera";
    if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
    if (/CriOS|Chrome/i.test(ua)) return "Chrome";
    if (/Safari/i.test(ua)) return "Safari";
    return "Outro";
  }
  function os() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return "iOS";
    if (/Android/i.test(ua)) return "Android";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Outro";
  }
  function origin() {
    var q = new URLSearchParams(location.search), src = q.get("utm_source") || q.get("ref") || "";
    var ref = document.referrer || "";
    try { if (ref && new URL(ref).host === location.host) ref = ""; } catch (e) { ref = ""; }
    // navegadores dentro de apps quase nunca mandam o referrer: o próprio app avisa pelo user agent
    if (!src) { var b = browser(); if (b === "Instagram") src = "instagram"; else if (b === "Facebook") src = "facebook"; }
    return {referrer: ref, utm_source: src.toLowerCase(), utm_medium: (q.get("utm_medium") || "").toLowerCase(), utm_campaign: q.get("utm_campaign") || ""};
  }
  function path() { return location.pathname + (location.hash && location.hash.length < 60 ? location.hash : ""); }

  // ---------- fila: o primeiro sinal da visita sai antes de qualquer evento
  var chain = Promise.resolve(), sess = session(), started = false;
  function ping(full) {
    var s = session();
    if (s.fresh) { sess = s; full = true; }
    var info = {path: path()};
    if (full) {
      var o = origin();
      info.referrer = o.referrer; info.utm_source = o.utm_source; info.utm_medium = o.utm_medium; info.utm_campaign = o.utm_campaign;
      info.device = device(); info.browser = browser(); info.os = os();
      info.screen_w = String(Math.round(screen.width || 0));
      info.language = navigator.language || "";
      try { info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    }
    chain = chain.then(function () { return rpc("track_ping", {p_session: s.id, p_visitor: visitor, p_info: info}); });
    return chain;
  }
  function track(type, d) {
    if (!TYPES[type]) return;
    d = d || {};
    var s = session();
    if (s.fresh) { sess = s; ping(true); }
    var meta = d.meta && typeof d.meta === "object" ? d.meta : {};
    var body = {
      p_session: s.id, p_visitor: visitor, p_type: type, p_path: d.path || path(),
      p_version_id: d.version_id != null ? String(d.version_id) : null,
      p_model_id: d.model_id != null ? String(d.model_id) : null,
      p_price_band: d.price_band != null && isFinite(d.price_band) ? Math.round(d.price_band) : null,
      p_meta: meta
    };
    chain = chain.then(function () { return rpc("track_event", body); });
  }
  window.giroTrack = track;

  function start() {
    if (started) return; started = true;
    ping(true);
    track("page_view");
    setInterval(function () { if (document.visibilityState === "visible") ping(false); }, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") ping(false); });
  }
  // páginas abertas em segundo plano só contam quando a pessoa olha para elas
  if (document.visibilityState === "prerender") document.addEventListener("visibilitychange", start, {once: true});
  else start();
})();
