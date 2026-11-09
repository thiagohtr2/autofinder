/* Autokan: Novidades (/novidades). Lançamentos recentes de carros 0 km no Brasil e os que chegam em breve.
   Quem entra e quem sai segue regras fixas, que ficam escritas na própria página (e na migração 20261108090000_novidades):
   carro novo e nova geração ficam 90 dias; visual novo, versão nova e série especial ficam 60 dias. */
import { SITE, imagem } from "./base.mjs";
import { pagina, esc, trilha, ldTrilha, SETA, INICIO, reais, pl, fotoTag } from "./paginas.mjs";

const NOVIDADES = { nome: "Novidades", url: "/novidades" };
const TIPO = {
  carro_novo: ["Carro novo", "novo"], nova_geracao: ["Nova geração", "visual"], reestilizacao: ["Visual novo", "visual"],
  versao_nova: ["Versão nova", "versao"], serie_especial: ["Série especial", "versao"],
};
export const rotuloLancamento = (l) => (TIPO[l.tipo] || ["Lançamento"])[0];
const GRUPOS = [["novo", "Carros novos"], ["visual", "Nova geração e visual novo"], ["versao", "Versões novas e séries especiais"]];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dataBr = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
const mesAno = (s) => { const m = /^(\d{4})-(\d{2})/.exec(s || ""); return m ? `${MESES[+m[2] - 1]} de ${m[1]}` : ""; };
const quando = (l) => (l.data_precisao === "mes" ? `em ${mesAno(l.lancado_em)}` : `em ${dataBr(l.lancado_em)}`);

const CSS = `
.nv-fil{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.nv-fil button{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font:700 13.5px var(--body);cursor:pointer}
.nv-fil button small{font:600 12px var(--mono);color:var(--muted)}
.nv-fil button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}
.nv-fil button[aria-pressed="true"] small{color:#c9d3e6}
.lm h3{margin:26px 0 12px;font-family:var(--display);font-weight:600;font-size:15px;letter-spacing:-.01em;color:var(--muted)}
.lm h3::first-letter{text-transform:uppercase}
.lm:first-of-type h3{margin-top:22px}
.lc-vs{margin:0;font-size:12.5px;font-weight:700;color:var(--muted)}
.ebs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:10px}
.eb{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#fff;text-decoration:none;color:var(--ink);height:100%}
.eb:hover{border-color:var(--accent)}
.eb-ph{flex:none;width:76px;aspect-ratio:16/9;border-radius:8px;background:var(--panel);display:grid;place-items:center;overflow:hidden}
.eb-ph img{width:100%;height:100%;object-fit:contain}
.eb-ph span{font:800 12px var(--body);color:var(--faint);letter-spacing:.04em}
.eb-tx{display:flex;flex-direction:column;gap:1px;min-width:0}
.eb-mk{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.eb-nm{font-family:var(--display);font-weight:600;font-size:15.5px;letter-spacing:-.02em;line-height:1.2}
.eb-st{font-size:12.5px;font-weight:600;color:var(--muted)}
.eb-st b{color:#8a5200;font-weight:800}
.lcs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px}
.lc{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff;scroll-margin-top:96px}
.lc:target{border-color:#1d6bff;box-shadow:0 0 0 4px rgba(29,107,255,.14)}
.lc-ph{position:relative;display:grid;place-items:center;aspect-ratio:16/9;background:radial-gradient(120% 90% at 50% 100%,#eef2f8 0,#f7f9fc 60%,#fff 100%)}
.lc-ph img{width:100%;height:100%;object-fit:contain}
.lc-tx{display:flex;flex-direction:column;gap:6px;padding:12px 15px 14px;flex:1}
.lc-m{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:0;font-size:12px;font-weight:700;color:var(--muted)}
.lc-t{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.03em}
.lc-t[data-g=novo]{background:#e9f1ff;color:#1450c8}.lc-t[data-g=visual]{background:#f0ebfb;color:#5b3bb0}.lc-t[data-g=versao]{background:#e8f6ee;color:#0d6b3c}
.lc h3{margin:2px 0 0;font-family:var(--display);font-weight:600;font-size:18px;line-height:1.25;letter-spacing:-.02em}
.lc h3 a{color:var(--ink);text-decoration:none}
.lc h3 a:hover{color:var(--accent-ink);text-decoration:underline}
.lc-rs{margin:0;font-size:14px;line-height:1.5;color:#2f3644}
.lc-pr{margin:auto 0 0;padding-top:6px;font-family:var(--mono);font-weight:600;font-size:15px;letter-spacing:-.02em}
.lc-pr small{font-family:var(--body);font-size:12px;font-weight:600;color:var(--muted);letter-spacing:0;margin-right:5px}
.lc-pv{display:inline-block;margin-left:8px;font:800 11px var(--body);padding:2px 8px;border-radius:999px;background:#fff4e0;color:#8a5200;vertical-align:2px}
.lc-ft{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;margin:4px 0 0;padding-top:8px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.lc-ft a{font-weight:700;text-decoration:none}
.nv-vazio{margin:18px 0 0;font-size:15px;color:var(--muted)}
.nv-regras{margin-top:6px;padding:18px 20px;border:1px solid var(--line);border-radius:18px;background:var(--panel);max-width:80ch}
.nv-regras h2{margin:0 0 8px;font-family:var(--display);font-weight:600;font-size:18px}
.nv-regras ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14.5px;line-height:1.55;color:#2f3644}
@media (max-width:640px){.lc h3{font-size:17px}.nv-regras{padding:15px 16px}.nv-fil{flex-wrap:nowrap;overflow-x:auto;margin-left:-16px;margin-right:-16px;padding:2px 16px 6px;scrollbar-width:none}.nv-fil::-webkit-scrollbar{display:none}.nv-fil button{flex:none}}
`.replace(/\n\s*/g, "");

function cartaoLancamento(l) {
  const { m } = l, [rot, g] = TIPO[l.tipo] || ["Lançamento", "versao"];
  const precos = l.versoes.map((v) => v.preco).filter(Boolean);
  const de = precos.length ? Math.min(...precos) : null;
  const preVenda = l.versoes.every((v) => v.status === "pre_order");
  // quando o lançamento é de algumas versões, diz quais (se forem poucas e o título não disser)
  const nomes = l.versoes.map((v) => v.nome).filter(Boolean);
  const nomeVersoes = l.soAlgumas && nomes.length >= 2 && nomes.length <= 3 ? nomes.join(" e ").replace(/ e (?=.* e )/, ", ") : "";
  return `<li class="lc" data-g="${g}" id="l-${esc(String(l.id))}">
<a class="lc-ph" href="${m.url}" tabindex="-1" aria-hidden="true">${fotoTag(m, 360, "(max-width:640px) 92vw, 340px") || `<span class="mc-sem">${esc(m.nome)}</span>`}${m.foto ? '<span class="ilus">Ilustrativa</span>' : ""}</a>
<div class="lc-tx">
<p class="lc-m"><span class="lc-t" data-g="${g}">${rot}</span><span>Lançado ${quando(l)}</span></p>
<h3><a href="${m.url}">${esc(l.titulo)}</a></h3>
${l.resumo ? `<p class="lc-rs">${esc(l.resumo)}</p>` : ""}
${nomeVersoes ? `<p class="lc-vs">Versões ${esc(nomeVersoes)}</p>` : ""}
<p class="lc-pr">${de ? `<small>a partir de</small>${reais(de)}` : "<small>preço ainda não divulgado</small>"}${preVenda ? '<span class="lc-pv">Pré-venda</span>' : ""}</p>
<p class="lc-ft">${l.fonte_url ? `<a href="${esc(l.fonte_url)}" target="_blank" rel="noopener nofollow">${esc(l.fonte ? `Fonte: ${l.fonte}` : "Ver a notícia")}${SETA}</a>` : `<span>${esc(l.fonte || "")}</span>`}<span>Fica aqui até ${dataBr(l.fica_ate)}</span></p>
</div></li>`;
}

/* "chegando em breve": cartão pequeno, porque a maioria ainda não tem foto */
function cartaoBreve(m) {
  const ps = m.breve.map((v) => v.preco).filter(Boolean), pre = m.breve.some((v) => v.status === "pre_order");
  const sigla = m.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const st = pre ? `<b>Pré-venda</b>${ps.length ? ` · a partir de ${reais(Math.min(...ps))}` : ""}` : `Confirmado para o Brasil${ps.length ? ` · ${reais(Math.min(...ps))} (previsto)` : " · sem preço ainda"}`;
  return `<li><a class="eb" href="${m.url}"><span class="eb-ph" aria-hidden="true">${m.foto ? fotoTag(m, 152, "76px") : `<span>${esc(sigla)}</span>`}</span><span class="eb-tx"><span class="eb-mk">${esc(m.marca)}</span><span class="eb-nm">${esc(m.nome)}</span><span class="eb-st">${st}</span></span></a></li>`;
}

export function paginaNovidades(base) {
  const lista = base.lancamentos || [], breve = base.emBreve || [];
  const conta = (g) => lista.filter((l) => (TIPO[l.tipo] || [])[1] === g).length;
  const filtros = lista.length ? `<div class="nv-fil" role="group" aria-label="Mostrar só um tipo de lançamento"><button type="button" data-f="" aria-pressed="true">Todos <small>${lista.length}</small></button>${GRUPOS.filter(([g]) => conta(g)).map(([g, t]) => `<button type="button" data-f="${g}" aria-pressed="false">${esc(t)} <small>${conta(g)}</small></button>`).join("")}</div>` : "";

  // por mês de lançamento, do mais novo para o mais antigo
  const meses = [];
  for (const l of lista) {
    const k = l.lancado_em.slice(0, 7);
    let g = meses[meses.length - 1];
    if (!g || g.k !== k) meses.push(g = { k, itens: [] });
    g.itens.push(l);
  }
  const secLanc = lista.length
    ? meses.map((g) => `<section class="lm" aria-label="Lançados em ${esc(mesAno(g.k + "-01"))}"><h3>${esc(mesAno(g.k + "-01"))}</h3><ul class="lcs">${g.itens.map(cartaoLancamento).join("")}</ul></section>`).join("")
    : `<p class="nv-vazio">Nenhum lançamento nos últimos meses por enquanto.</p>`;

  const secBreve = breve.length ? `<section class="sec" aria-labelledby="s-br"><h2 id="s-br">Chegando em breve</h2>
<p class="nota" style="margin:0 0 14px">Carros que a marca já confirmou para o Brasil, mas que ainda não têm vendas abertas (ou estão só em pré-venda). Quando forem lançados, passam para a lista de cima.</p>
<ul class="ebs">${breve.map(cartaoBreve).join("")}</ul></section>` : "";

  const regras = `<section class="sec" aria-labelledby="s-rg"><div class="nv-regras"><h2 id="s-rg">Como um carro entra e sai das Novidades</h2><ul>
<li><strong>Entra</strong> quando a marca abre as vendas ou a pré-venda no Brasil com preço oficial. A data do lançamento é esse dia.</li>
<li><strong>Carro novo</strong> (modelo que não era vendido aqui) e <strong>nova geração</strong> ficam <strong>90 dias</strong>.</li>
<li><strong>Visual novo</strong>, <strong>versão nova</strong> (inclusive motor novo) e <strong>série especial</strong> ficam <strong>60 dias</strong>.</li>
<li><strong>Não entra:</strong> só a troca do ano-modelo, mudança de preço ou oferta (essas ficam no botão Ofertas da página inicial), flagras e carros mostrados só no exterior.</li>
<li><strong>Sai</strong> quando acaba o prazo, ou antes, se as versões lançadas saírem de linha. Cada cartão mostra até quando fica aqui.</li>
<li>Os carros novos entram depois que o Autokan confere os dados e a imagem de cada um.</li>
</ul></div></section>`;

  const itens = [INICIO, NOVIDADES];
  const ano = new Date().getFullYear();
  const h1 = "Lançamentos de carros 0 km no Brasil";
  const corpo = `${trilha(itens)}
<div class="lista-top"><h1>${h1}</h1>
<p class="lead">${lista.length ? `${pl(lista.length, "lançamento", "lançamentos")} dos últimos meses, com preço oficial, data e fonte` : "Os carros e as versões que chegaram às lojas nos últimos meses"}. Cada carro fica aqui por um prazo fixo e sai sozinho depois.</p>
${filtros}</div>
<section aria-label="Lançamentos" id="lancamentos">${secLanc}</section>
${secBreve}
${regras}
<p class="nota">Preço de tabela sugerido pela montadora quando ela divulga; confirme preço, versões e equipamentos com a concessionária. Viu um lançamento que falta aqui? <a href="/contato?assunto=erro&amp;pagina=%2Fnovidades" rel="nofollow">Avise a gente</a>.</p>
<script>(()=>{const bs=document.querySelectorAll(".nv-fil [data-f]");bs.forEach(b=>b.addEventListener("click",()=>{const f=b.dataset.f;bs.forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
document.querySelectorAll(".lc").forEach(c=>{c.hidden=!!f&&c.dataset.g!==f});document.querySelectorAll(".lm").forEach(s=>{s.hidden=!s.querySelector(".lc:not([hidden])")})}))})()</script>`;

  const primeiro = lista.find((l) => l.m.foto);
  return pagina({
    titulo: `Lançamentos de carros ${ano}: novidades 0 km no Brasil | Autokan`,
    descricao: `Os carros 0 km lançados no Brasil nos últimos meses, com preço oficial, data de lançamento e fonte${lista.length ? `: ${lista.slice(0, 3).map((l) => l.titulo).join(", ")} e mais` : ""}. Veja também os que chegam em breve.`,
    caminho: "/novidades", corpo, css: CSS, indexar: true,
    imagemOg: primeiro ? SITE + imagem(primeiro.m.foto, 800, "&fm=png") : null, imagemAlt: h1,
    ld: [ldTrilha(itens), { "@context": "https://schema.org", "@type": "ItemList", name: h1, numberOfItems: lista.length,
      itemListElement: lista.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + l.m.url, name: l.titulo })) }],
  });
}
