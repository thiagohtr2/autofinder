/* Puxar para atualizar (celular e tablet).
   Ao puxar a página para baixo pelo topo, a página inteira desce e revela, atrás dela, uma faixa com o ícone de atualizar
   parado no lugar (não é o círculo que flutua sobre a página: esse, do navegador, fica desligado por overscroll-behavior no CSS).
   O ícone gira conforme o dedo desce; passou do ponto, fica azul e, ao soltar, a página recarrega.
   Não começa: em cima da roleta, com janela/ficha aberta, digitando, ou dentro de uma área que ainda pode rolar para cima. */
(function () {
  "use strict";
  var PONTO = 64, MAX = 112, SEGURA = 56;
  var css = ".ptr{position:fixed;left:0;right:0;top:0;height:0;overflow:hidden;z-index:0;pointer-events:none;" +
    "background:var(--ptr-bg,#eef1f5);box-shadow:inset 0 -10px 12px -12px rgba(12,17,28,.35)}" +
    ".ptr-ic{position:absolute;left:50%;top:" + (SEGURA - 24) / 2 + "px;width:24px;height:24px;margin-left:-12px;color:#7a8396;opacity:0;transition:color .15s}" +
    ".ptr-ic svg{display:block;width:24px;height:24px}" +
    ".ptr.armado .ptr-ic{color:#1d6bff}" +
    ".ptr.girando .ptr-ic svg{animation:ptrgira .7s linear infinite}" +
    "@keyframes ptrgira{to{transform:rotate(360deg)}}" +
    "@media (prefers-reduced-motion:reduce){.ptr.girando .ptr-ic svg{animation:none}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var ptr, ic, svg;
  function montar() {
    ptr = document.createElement("div"); ptr.className = "ptr"; ptr.setAttribute("aria-hidden", "true");
    ptr.innerHTML = '<span class="ptr-ic"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M20.2 3.8v5.4h-5.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    document.body.insertBefore(ptr, document.body.firstChild);
    ic = ptr.firstChild; svg = ic.firstChild;
  }
  if (document.body) montar(); else document.addEventListener("DOMContentLoaded", montar);

  var estado = 0, x0 = 0, y0 = 0, d = 0, armado = false, ocupado = false, alvos = [];
  /* 0 parado · 1 decidindo a direção · 2 puxando · -1 este toque não é para atualizar */

  function bloqueado(t) {
    if (ocupado || !ptr) return true;
    if (document.querySelector('[aria-modal="true"]:not([hidden]),.scrim:not([hidden])')) return true;
    var a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return true;
    if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) return true;
    for (var el = t; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
      if (el.id === "dial" || el.hasAttribute("data-sem-puxar")) return true;
      if (el.scrollTop > 0) { var oy = getComputedStyle(el).overflowY; if (oy === "auto" || oy === "scroll") return true; }
    }
    return false;
  }
  function pegarAlvos() {
    var out = [], kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el === ptr || /^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) continue;
      var cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.display === "none") continue;
      out.push(el);
    }
    return out;
  }
  function pintar(v, anima) {
    d = v;
    var tr = anima ? "transform .26s cubic-bezier(.2,.8,.2,1)" : "none";
    for (var i = 0; i < alvos.length; i++) { alvos[i].style.transition = tr; alvos[i].style.transform = v ? "translate3d(0," + v + "px,0)" : ""; }
    ptr.style.transition = anima ? "height .26s cubic-bezier(.2,.8,.2,1)" : "none";
    ptr.style.height = v + "px";
    ic.style.opacity = String(Math.max(0, Math.min(1, (v - 10) / (PONTO - 10))));
    if (!ptr.classList.contains("girando")) svg.style.transform = "rotate(" + Math.min(v / PONTO, 1.4) * 270 + "deg)";
    var arm = v >= PONTO;
    if (arm !== armado) { armado = arm; ptr.classList.toggle("armado", arm); if (arm && navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} }
  }
  function limpar() {
    for (var i = 0; i < alvos.length; i++) { alvos[i].style.transition = ""; alvos[i].style.transform = ""; alvos[i].style.willChange = ""; }
    alvos = []; ptr.style.transition = ""; ptr.style.height = "0"; ptr.classList.remove("armado"); armado = false; d = 0;
  }

  addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1 || bloqueado(e.target)) { estado = -1; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; estado = 1;
  }, { passive: true });

  addEventListener("touchmove", function (e) {
    if (estado <= 0) return;
    if (e.touches.length !== 1) { if (estado === 2) soltar(); estado = -1; return; }
    var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
    if (estado === 1) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (dy > 0 && dy > Math.abs(dx) * 1.3) {
        estado = 2; alvos = pegarAlvos();
        for (var i = 0; i < alvos.length; i++) alvos[i].style.willChange = "transform";
      } else { estado = -1; return; }
    }
    if (e.cancelable) e.preventDefault();
    pintar(Math.max(0, Math.min(MAX, dy * 0.5)), false);
  }, { passive: false });

  function soltar() {
    if (armado) {
      ocupado = true; ptr.classList.add("girando"); svg.style.transform = "";
      pintar(SEGURA, true); ptr.classList.add("armado");
      setTimeout(function () { location.reload(); }, 450);
    } else {
      pintar(0, true); setTimeout(limpar, 280);
    }
  }
  addEventListener("touchend", function () { if (estado === 2) soltar(); estado = 0; }, { passive: true });
  addEventListener("touchcancel", function () { if (estado === 2) { pintar(0, true); setTimeout(limpar, 280); } estado = 0; }, { passive: true });
})();
