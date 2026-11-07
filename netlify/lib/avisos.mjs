/* Autokan: link "não quero mais receber avisos de preço" do e-mail (/avisos/desligar?t=<código>).
   Desliga sem pedir login: o código é único de cada pessoa (public.price_alert_prefs.token). */
import { SB_URL, SB_CHAVE } from "./base.mjs";
import { pagina, trilha, INICIO } from "./paginas.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function desligarAvisos(token) {
  if (!UUID.test(token || "")) return false;
  const r = await fetch(`${SB_URL}/rest/v1/rpc/disable_price_alerts`, {
    method: "POST",
    headers: { apikey: SB_CHAVE, Authorization: `Bearer ${SB_CHAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`Supabase respondeu ${r.status}`);
  return (await r.json()) === true;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* estado: "confirmar" (abriu o link: pede um clique, porque programas de e-mail abrem links sozinhos),
   "ok" (desligado) ou "invalido" */
export function paginaAvisos(estado, token = "") {
  const itens = [INICIO, { nome: "Avisos de preço", url: "/avisos/desligar" }];
  const textos = {
    confirmar: ["Desligar avisos de preço?", "Você deixa de receber e-mails quando o preço de um carro salvo baixar. Seus carros continuam salvos, e dá para ligar de novo em Salvos."],
    ok: ["Avisos de preço desligados", "Pronto: você não vai mais receber e-mails quando o preço de um carro salvo baixar. Seus carros continuam salvos. Para ligar de novo, entre na sua conta e abra Salvos."],
    invalido: ["Link inválido ou vencido", "Não encontramos esse link. Para ligar ou desligar os avisos, entre na sua conta e abra Salvos."],
  }[estado];
  const acoes = estado === "confirmar"
    ? `<form method="post" action="/avisos/desligar?t=${encodeURIComponent(token)}" class="acoes"><button class="btn pri" type="submit">Desligar avisos de preço</button><a class="btn" href="/salvos">Manter ligados</a></form>`
    : `<div class="acoes"><a class="btn pri" href="/salvos">Abrir Salvos</a><a class="btn" href="/">Escolha o preço</a></div>`;
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>${esc(textos[0])}</h1>
<p class="lead">${esc(textos[1])}</p>
${acoes}</div>`;
  return pagina({ titulo: "Avisos de preço | Autokan", descricao: "Avisos por e-mail de baixa de preço dos carros salvos no Autokan.", caminho: null, corpo, indexar: false });
}
