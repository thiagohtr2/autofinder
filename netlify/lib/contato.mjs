/* Autokan: página de contato (/contato). O formulário manda a mensagem para a função "contato" do Supabase,
   que guarda no banco (o admin lê no painel, seção Mensagens) e avisa por e-mail. */
import { SB_URL, SB_CHAVE } from "./base.mjs";
import { pagina, esc, trilha, ldTrilha, INICIO } from "./paginas.mjs";

const CONTATO = { nome: "Contato", url: "/contato" };
export const ASSUNTOS_CONTATO = [
  ["erro", "Preço ou informação errada"],
  ["falta", "Carro que falta no site"],
  ["sugestao", "Sugestão ou ideia"],
  ["problema", "Problema no site ou na conta"],
  ["parceria", "Parcerias e imprensa"],
  ["outro", "Outro assunto"],
];

const CSS = `
.ct{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:32px;align-items:start;margin-top:22px}
.ct-f{display:grid;gap:14px;padding:20px;border:1px solid var(--line);border-radius:20px;background:#fff}
.ct-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ct-c{display:grid;gap:6px;font-size:13.5px;font-weight:700;color:var(--ink)}
.ct-c small{font-weight:600;color:var(--muted)}
.ct-c input,.ct-c select,.ct-c textarea{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:0 14px;font:600 15.5px var(--body);color:var(--ink);outline:none}
.ct-c input,.ct-c select{height:46px}
.ct-c select{background:#fff;padding-right:36px;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%235d6577' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:14px}
.ct-c textarea{min-height:170px;padding:12px 14px;line-height:1.5;resize:vertical}
.ct-c input:focus,.ct-c select:focus,.ct-c textarea:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px rgba(29,107,255,.12)}
.ct-c [aria-invalid=true]{border-color:var(--warn)}
.ct-n{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-weight:600;color:var(--muted)}
.ct-pg{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;background:var(--accent-soft);font-size:13px;font-weight:600;color:#26324a;overflow:hidden}
.ct-pg[hidden]{display:none}
.ct-pg b{font-weight:800;white-space:nowrap}
.ct-pg span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ct-pg button{margin-left:auto;flex:none;border:0;background:none;color:var(--accent-ink);font:700 12.5px var(--body);cursor:pointer;padding:4px}
.ct-mel{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.ct-ok{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.ct-ok .btn{justify-content:center}
.ct-ok .btn[disabled]{opacity:.65;cursor:progress}
.ct-ok p{margin:0;font-size:12.5px;color:var(--muted);flex:1 1 220px}
.ct-er{margin:0;padding:11px 14px;border-radius:12px;background:#fdecea;color:#8f1f0d;font-size:14px;font-weight:700}
.ct-feito{scroll-margin-top:84px;padding:28px 22px;border:1px solid #cfe9db;border-radius:20px;background:#f1faf5;text-align:center}
.ct-feito svg{width:44px;height:44px;color:var(--ok)}
.ct-feito h2{margin:10px 0 6px}
.ct-feito p{margin:0 auto;max-width:44ch;color:#2f3644}
.ct-feito .acoes{justify-content:center}
.ct-l{display:grid;gap:12px}
.ct-l div{padding:16px 18px;border-radius:18px;background:var(--panel)}
.ct-l h2{font-size:15.5px;margin:0 0 4px}
.ct-l p{margin:0;font-size:14px;color:#3b4352;line-height:1.5}
@media (max-width:860px){.ct{grid-template-columns:1fr;gap:20px}}
@media (max-width:560px){.ct-2{grid-template-columns:1fr}.ct-f{padding:16px;border-radius:18px}.ct-ok .btn{flex:1 1 100%}}
`.replace(/\n\s*/g, "");

const OK_ICO = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/><path d="m15 24.5 6 6 12-13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function paginaContato() {
  const opcoes = ASSUNTOS_CONTATO.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("");
  const corpo = `${trilha([INICIO, CONTATO])}
<div class="lista-top"><h1>Fale com o Autokan</h1>
<p class="lead">Achou um preço errado, sentiu falta de um carro ou tem uma ideia? Escreva aqui. A mensagem chega direto para a gente, e a resposta vai para o seu e-mail.</p></div>
<div class="ct">
<div id="ctArea">
<form class="ct-f" id="ctForm" novalidate>
<div class="ct-2">
<label class="ct-c">Seu nome<input type="text" name="nome" id="ctNome" autocomplete="name" maxlength="120" required></label>
<label class="ct-c">Seu e-mail<input type="email" name="email" id="ctEmail" autocomplete="email" inputmode="email" maxlength="200" required></label>
</div>
<label class="ct-c">Assunto<select name="assunto" id="ctAssunto">${opcoes}</select></label>
<div class="ct-pg" id="ctPg" hidden><b>Sobre a página</b><span id="ctPgT"></span><button type="button" id="ctPgX" aria-label="Não é sobre essa página">Remover</button></div>
<label class="ct-c">Mensagem<textarea name="mensagem" id="ctMsg" maxlength="5000" required placeholder="Conte o que aconteceu ou o que você gostaria de ver no Autokan. Se for sobre um carro, diga qual."></textarea><span class="ct-n"><small>Quanto mais detalhes, melhor.</small><small id="ctConta">0/5000</small></span></label>
<label class="ct-mel" aria-hidden="true">Não preencha este campo<input type="text" name="site" id="ctSite" tabindex="-1" autocomplete="off"></label>
<p class="ct-er" id="ctErro" role="alert" hidden></p>
<div class="ct-ok"><button class="btn pri" type="submit" id="ctEnviar">Enviar mensagem</button><p>Usamos seu e-mail só para responder esta mensagem.</p></div>
</form>
</div>
<aside class="ct-l" aria-label="Antes de escrever">
<div><h2>Preço diferente na concessionária?</h2><p>Os preços do Autokan são os de tabela, sugeridos pela montadora ou da FIPE 0 km. Cada versão tem link para a fonte. Se a fonte mudou e a gente ainda não, avise por aqui.</p></div>
<div><h2>Faltou um carro?</h2><p>Diga a marca, o modelo e, se souber, a versão. Carros anunciados para o Brasil entram assim que a montadora divulga o preço.</p></div>
<div><h2>Problema na sua conta?</h2><p>Escreva com o mesmo e-mail do cadastro, assim fica mais fácil achar a sua conta.</p></div>
</aside>
</div>
<script>(()=>{const SB=${JSON.stringify(SB_URL)},K=${JSON.stringify(SB_CHAVE)},CH="sb-"+SB.split("//")[1].split(".")[0]+"-auth-token",t0=Date.now();
const $=i=>document.getElementById(i),f=$("ctForm"),nome=$("ctNome"),email=$("ctEmail"),as=$("ctAssunto"),msg=$("ctMsg"),er=$("ctErro"),bt=$("ctEnviar");
const e=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let s=null;try{s=JSON.parse(localStorage.getItem(CH)||"null")}catch(x){}
const u=s&&s.user,tok=s&&s.access_token&&(!s.expires_at||s.expires_at*1000>Date.now())?s.access_token:"";
if(u){const m=u.user_metadata||{};nome.value=m.full_name||m.name||"";email.value=u.email||""}
const q=new URLSearchParams(location.search),qa=q.get("assunto");if(qa&&[...as.options].some(o=>o.value===qa))as.value=qa;
let pg=q.get("pagina")||"";if(!/^\\/[\\w\\-\\/.?=&%]*$/.test(pg)||pg.length>300)pg="";
if(pg){$("ctPg").hidden=false;const t=q.get("titulo");$("ctPgT").textContent=t?t.slice(0,120):pg;$("ctPgX").onclick=()=>{pg="";$("ctPg").hidden=true}}
const conta=()=>{$("ctConta").textContent=msg.value.length+"/5000"};msg.addEventListener("input",conta);
const erro=(t,campo)=>{er.textContent=t;er.hidden=false;if(campo){campo.setAttribute("aria-invalid","true");campo.focus()}};
f.addEventListener("input",x=>{x.target.removeAttribute("aria-invalid");er.hidden=true});
f.addEventListener("submit",async x=>{x.preventDefault();er.hidden=true;
  if(!nome.value.trim())return erro("Escreva seu nome.",nome);
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email.value.trim()))return erro("Confira o seu e-mail: é por ele que vamos responder.",email);
  if(msg.value.trim().length<5)return erro("Escreva a mensagem.",msg);
  bt.disabled=true;bt.textContent="Enviando…";
  const assunto=as.options[as.selectedIndex].text;
  try{const r=await fetch(SB+"/functions/v1/contato",{method:"POST",headers:{"Content-Type":"application/json",apikey:K,Authorization:"Bearer "+(tok||K)},
      body:JSON.stringify({nome:nome.value,email:email.value,assunto,mensagem:msg.value,pagina:pg,site:$("ctSite").value,t:Date.now()-t0})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.erro||"Não deu para enviar agora. Tente de novo em alguns minutos.");
    try{window.giroTrack&&window.giroTrack("click",{meta:{el:"contato-enviado",assunto:as.value}})}catch(y){}
    $("ctArea").innerHTML='<div class="ct-feito" role="status" tabindex="-1" id="ctFeito">${OK_ICO.replace(/'/g, "\\'")}<h2>Mensagem enviada</h2><p>Obrigado, '+e(nome.value.trim().split(/\\s+/)[0])+'. A resposta vai para <b>'+e(email.value.trim())+'</b>.</p><div class="acoes"><a class="btn" href="/">Voltar para o início</a><a class="btn" href="/contato">Mandar outra</a></div></div>';
    const ft=$("ctFeito");ft.focus({preventScroll:true});ft.scrollIntoView({block:"start",behavior:"smooth"});
  }catch(y){bt.disabled=false;bt.textContent="Enviar mensagem";erro(y.message==="Failed to fetch"?"Sem conexão agora. Confira a internet e tente de novo.":y.message)}
});
})()</script>`;
  return pagina({
    titulo: "Contato | Autokan",
    descricao: "Fale com o Autokan: avise de um preço errado, peça um carro que falta, mande uma sugestão ou fale de parcerias. Respondemos no seu e-mail.",
    caminho: "/contato",
    ld: [ldTrilha([INICIO, CONTATO]), { "@context": "https://schema.org", "@type": "ContactPage", name: "Contato do Autokan", url: "https://autokan.com.br/contato" }],
    corpo,
    css: CSS,
  });
}
