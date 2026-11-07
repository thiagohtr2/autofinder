// Autokan: aviso por e-mail quando baixa o preço de um carro salvo.
// Chamada de hora em hora pelo pg_cron (migração avisos_preco_agenda). Lê o que há para mandar
// (public.price_alert_batch), junta por pessoa (um e-mail só, com todos os carros dela que baixaram),
// envia pelo Resend e registra (public.price_alert_done), para nunca mandar o mesmo aviso duas vezes.
// Sem o segredo RESEND_API_KEY nada é enviado e a fila fica esperando.
// POST {"exemplo": true} com o login de um admin manda um e-mail de exemplo só para o próprio admin.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://autokan.com.br";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const reais = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");
const tipoPreco = (k: string | null) => (k === "fipe" ? "Tabela FIPE 0 km" : "preço sugerido de fábrica");

type Item = { carro: string; url: string; antes: number; agora: number; kind: string | null };
type Linha = { user_id: string; email: string; nome: string; token: string; version_id: string; carro: string; url: string;
  preco_antes: number; preco_agora: number; price_kind: string | null; queue_ids: number[] };

function mensagem(nome: string, itens: Item[], token: string, exemplo = false) {
  const desligar = `${SITE}/avisos/desligar?t=${encodeURIComponent(token)}`;
  const um = itens.length === 1;
  const assunto = (exemplo ? "[Exemplo] " : "") + (um ? `Baixou o preço: ${itens[0].carro}` : `Baixou o preço de ${itens.length} carros que você salvou`);
  const primeiro = (nome || "").trim().split(/\s+/)[0] || "";
  const abre = `${primeiro ? `Oi, ${primeiro}. ` : ""}${um ? "O preço de um carro que você salvou no Autokan baixou:" : "O preço de carros que você salvou no Autokan baixou:"}`;
  const linhasTxt = itens.map((i) => `- ${i.carro}: de ${reais(i.antes)} por ${reais(i.agora)} (${reais(i.antes - i.agora)} a menos, ${tipoPreco(i.kind)})\n  ${i.url}`).join("\n");
  const rodapeTxt = `Você recebe este aviso porque salvou ${um ? "esse carro" : "esses carros"} no Autokan. Os preços são de referência; confirme o valor com a concessionária. O Autokan mostra dados para comparar e não indica qual carro comprar.\nPara não receber mais avisos de preço: ${desligar}`;
  const text = `${exemplo ? "ESTE É UM E-MAIL DE EXEMPLO, com valores fictícios.\n\n" : ""}${abre}\n\n${linhasTxt}\n\n${rodapeTxt}`;
  const cards = itens.map((i) => `<tr><td style="padding:14px 16px;border:1px solid #e7eaf0;border-radius:12px;background:#ffffff">
<a href="${esc(i.url)}" style="font-size:16px;font-weight:700;color:#0c111c;text-decoration:none">${esc(i.carro)}</a>
<div style="margin-top:6px;font-size:15px;color:#0c111c">De <span style="text-decoration:line-through;color:#5d6577">${reais(i.antes)}</span> por <b>${reais(i.agora)}</b></div>
<div style="margin-top:4px;font-size:13px;color:#11864c;font-weight:700">${reais(i.antes - i.agora)} a menos</div>
<div style="margin-top:2px;font-size:12px;color:#5d6577">${tipoPreco(i.kind)}</div>
</td></tr><tr><td style="height:10px"></td></tr>`).join("");
  const html = `<div style="background:#f5f7fa;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto">
<tr><td style="padding:0 4px 16px;font-size:20px;font-weight:800;letter-spacing:.04em;color:#060b1c">AUTOKAN</td></tr>
${exemplo ? `<tr><td style="padding:10px 14px;margin-bottom:10px;background:#fff4e5;border-radius:10px;font-size:13px;color:#7a4b00">E-mail de exemplo, com valores fictícios, para conferir o visual.</td></tr><tr><td style="height:10px"></td></tr>` : ""}
<tr><td style="padding:0 4px 14px;font-size:15px;line-height:1.5;color:#0c111c">${esc(abre)}</td></tr>
${cards}
<tr><td style="padding:6px 0 18px"><a href="${esc(itens[0].url)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#1d6bff;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none">${um ? "Ver o carro no Autokan" : "Ver no Autokan"}</a></td></tr>
<tr><td style="padding:0 4px;font-size:12px;line-height:1.5;color:#5d6577">Você recebe este aviso porque salvou ${um ? "esse carro" : "esses carros"} no Autokan. Os preços são de referência; confirme o valor com a concessionária. O Autokan mostra dados para comparar e não indica qual carro comprar.<br><a href="${esc(desligar)}" style="color:#5d6577">Não quero mais receber avisos de preço</a></td></tr>
</table></div>`;
  return { assunto, text, html, desligar };
}

async function enviar(chave: string, para: string, m: ReturnType<typeof mensagem>) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("AVISOS_REMETENTE") || Deno.env.get("CONTATO_REMETENTE") || "Autokan <onboarding@resend.dev>",
      to: [para], subject: m.assunto, text: m.text, html: m.html,
      headers: { "List-Unsubscribe": `<${m.desligar}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return ((await r.json()) as { id?: string }).id || null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  let corpo: Record<string, unknown> = {};
  try { corpo = await req.json(); } catch { /* corpo vazio vindo do agendamento */ }
  const chave = Deno.env.get("RESEND_API_KEY");

  // e-mail de exemplo: só para o admin logado, com os carros que ele salvou e valores fictícios
  if (corpo.exemplo) {
    const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data } = await sb.auth.getUser(tok);
    const u = data?.user;
    if (!u?.email) return json({ erro: "Entre na conta de admin." }, 401);
    const { data: perfil } = await sb.from("profiles").select("role").eq("id", u.id).maybeSingle();
    if (perfil?.role !== "admin") return json({ erro: "Só para admin." }, 403);
    if (!chave) return json({ erro: "O segredo RESEND_API_KEY não está configurado nas Edge Functions." }, 412);
    const { data: g } = await sb.from("garage").select("version_id, versions(brand, model, version, brand_id, model_id, price, price_kind, catalog_row)").eq("user_id", u.id).limit(3);
    const itens: Item[] = (g || []).map((x: any) => x.versions).filter((v: any) => v && v.price > 0).map((v: any) => ({
      carro: [v.brand, v.model, v.version].filter(Boolean).join(" "),
      url: `${SITE}/carros/${v.brand_id}/${String(v.catalog_row?.m || v.model_id).slice(String(v.brand_id).length + 1)}`,
      antes: v.price + 5000, agora: v.price, kind: v.price_kind,
    }));
    if (!itens.length) itens.push({ carro: "Chevrolet Onix 1.0 Turbo AT", url: `${SITE}/carros/chevrolet/onix`, antes: 115990, agora: 110990, kind: "sugerido" });
    const { data: pr } = await sb.from("price_alert_prefs").upsert({ user_id: u.id }, { onConflict: "user_id", ignoreDuplicates: true }).select("token").maybeSingle();
    const token = pr?.token || (await sb.from("price_alert_prefs").select("token").eq("user_id", u.id).single()).data?.token;
    try {
      const id = await enviar(chave, u.email, mensagem((u.user_metadata?.full_name as string) || "", itens, token, true));
      return json({ ok: true, enviado_para: u.email, id });
    } catch (e) { return json({ erro: String(e) }, 502); }
  }

  // rodada normal (agendada)
  const { data: linhas, error } = await sb.rpc("price_alert_batch");
  if (error) { console.error("avisos-preco: batch", error); return json({ erro: "falha ao ler a fila" }, 500); }
  const lista = (linhas || []) as Linha[];
  if (!lista.length) { await sb.rpc("price_alert_done", { p_sent: [] }); return json({ ok: true, pessoas: 0, enviados: 0 }); }
  if (!chave) return json({ ok: false, sem_chave: true, pendentes: lista.length });

  const porPessoa = new Map<string, Linha[]>();
  for (const l of lista) (porPessoa.get(l.user_id) || porPessoa.set(l.user_id, []).get(l.user_id)!).push(l);
  const enviados: { queue_id: number; user_id: string; provider_id: string | null }[] = [];
  let falhas = 0;
  for (const [uid, ls] of porPessoa) {
    const itens = ls.map((l) => ({ carro: l.carro, url: l.url, antes: l.preco_antes, agora: l.preco_agora, kind: l.price_kind }));
    try {
      const id = await enviar(chave, ls[0].email, mensagem(ls[0].nome, itens, ls[0].token));
      for (const l of ls) for (const q of l.queue_ids) enviados.push({ queue_id: Number(q), user_id: uid, provider_id: id });
    } catch (e) { falhas++; console.error("avisos-preco: envio", uid, String(e)); }
  }
  const { error: e2 } = await sb.rpc("price_alert_done", { p_sent: enviados });
  if (e2) console.error("avisos-preco: done", e2);
  return json({ ok: true, pessoas: porPessoa.size, enviados: porPessoa.size - falhas, falhas });
});
