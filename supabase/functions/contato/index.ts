// Autokan: formulário de contato (/contato).
// Guarda a mensagem em public.contact_messages (só o admin lê, no painel) e avisa por e-mail o dono do site.
// O e-mail sai pelo Resend quando o segredo RESEND_API_KEY existe nas Edge Functions do Supabase;
// sem ele, a mensagem fica guardada do mesmo jeito e aparece no painel.
// Contra spam: campo escondido (robôs preenchem), tempo mínimo na página e no máximo 5 mensagens por hora por conexão.
import { createClient } from "npm:@supabase/supabase-js@2";

const DESTINO = "thiagohtr2@gmail.com";
const PAINEL = "https://autokan.com.br/admin.html#mensagens";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const ORIGENS = [/^https:\/\/(www\.)?autokan\.com\.br$/, /^https:\/\/deploy-preview-\d+--autokan\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];
function cors(req: Request) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENS.some((r) => r.test(o)) ? o : "https://autokan.com.br",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
const json = (req: Request, o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(req) } });

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const limpa = (v: unknown, max: number, linhas = false) => {
  let t = typeof v === "string" ? v : "";
  t = t.replace(/\u0000/g, "").trim();
  if (!linhas) t = t.replace(/\s+/g, " ");
  return t.slice(0, max);
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "Use o formulário do site." }, 405);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { erro: "Mensagem inválida." }, 400); }

  // robôs: preencheram o campo escondido ou enviaram rápido demais. Responde como se tivesse dado certo.
  if (typeof b.site === "string" && b.site.trim()) return json(req, { ok: true });
  if (typeof b.t === "number" && b.t < 2500) return json(req, { ok: true });

  const nome = limpa(b.nome, 120), email = limpa(b.email, 200).toLowerCase(), assunto = limpa(b.assunto, 160);
  const mensagem = limpa(b.mensagem, 5000, true), pagina = limpa(b.pagina, 300);
  if (!nome) return json(req, { erro: "Escreva seu nome." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(req, { erro: "Confira o seu e-mail: é por ele que vamos responder." }, 400);
  if (mensagem.length < 5) return json(req, { erro: "Escreva a mensagem." }, 400);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "";
  const ipHash = ip ? await sha256(`autokan-contato:${ip}`) : null;
  if (ipHash) {
    const desde = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", desde);
    if ((count ?? 0) >= 5) return json(req, { erro: "Você mandou várias mensagens agora há pouco. Tente de novo daqui a uma hora." }, 429);
  }

  // se a pessoa está logada, guarda a conta junto (o token chega no Authorization)
  let userId: string | null = null;
  const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (tok && tok !== Deno.env.get("SUPABASE_ANON_KEY")) {
    const { data } = await sb.auth.getUser(tok);
    userId = data?.user?.id ?? null;
  }

  const { data: linha, error } = await sb.from("contact_messages")
    .insert({ name: nome, email, subject: assunto || null, message: mensagem, page: pagina || null, user_id: userId, ip_hash: ipHash })
    .select("id").single();
  if (error || !linha) { console.error("contato: falha ao gravar", error); return json(req, { erro: "Não deu para enviar agora. Tente de novo em alguns minutos." }, 500); }

  const chave = Deno.env.get("RESEND_API_KEY");
  if (chave) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("CONTATO_REMETENTE") || "Autokan <onboarding@resend.dev>",
          to: [DESTINO],
          reply_to: email,
          subject: `Contato no Autokan: ${assunto || "mensagem"} (${nome})`,
          text: `${nome} <${email}> mandou uma mensagem pelo site.\n\nAssunto: ${assunto || "—"}\nPágina: ${pagina || "—"}\n\n${mensagem}\n\nResponda este e-mail para falar com a pessoa. Todas as mensagens: ${PAINEL}`,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0c111c"><p><b>${esc(nome)}</b> &lt;${esc(email)}&gt; mandou uma mensagem pelo site.</p><p><b>Assunto:</b> ${esc(assunto || "—")}<br><b>Página:</b> ${esc(pagina || "—")}</p><p style="white-space:pre-wrap;background:#f5f7fa;padding:12px 14px;border-radius:10px">${esc(mensagem)}</p><p style="color:#5d6577;font-size:13px">Responda este e-mail para falar com a pessoa. <a href="${PAINEL}">Ver todas as mensagens no painel</a>.</p></div>`,
        }),
      });
      if (r.ok) await sb.from("contact_messages").update({ emailed_at: new Date().toISOString() }).eq("id", linha.id);
      else console.error("contato: o Resend recusou", r.status, await r.text());
    } catch (e) { console.error("contato: falha no e-mail", e); }
  }
  return json(req, { ok: true });
});
