/* Autokan: Termos de uso e Política de privacidade (/termos e /privacidade).
   A versão dos termos (TERMOS_VERSAO) é a mesma que o cadastro grava na conta de quem aceita (public/index.html). */
import { pagina, trilha, ldTrilha, INICIO } from "./paginas.mjs";

export const TERMOS_VERSAO = "2026-11-07";
const DATA = "7 de novembro de 2026";

const CSS = `
.doc{max-width:72ch}
.doc h1{margin:6px 0 4px}
.doc .atual{color:var(--muted);font-size:14px;margin:0 0 22px}
.doc h2{font-size:19px;margin:28px 0 8px}
.doc p,.doc li{color:#2a3140;line-height:1.65}
.doc p{margin:0 0 10px}
.doc ul{margin:0 0 10px;padding-left:20px}
.doc li{margin:4px 0}
.doc .resumo{background:var(--panel);border-radius:16px;padding:16px 18px;margin:0 0 8px}
.doc .resumo p{margin:0}
.doc .resumo p+p{margin-top:8px}
`.replace(/\n\s*/g, "");

const secao = (titulo, ...partes) => `<h2>${titulo}</h2>${partes.join("")}`;
const p = (t) => `<p>${t}</p>`;
const ul = (itens) => `<ul>${itens.map((i) => `<li>${i}</li>`).join("")}</ul>`;

export function paginaTermos() {
  const itens = [INICIO, { nome: "Termos de uso", url: "/termos" }];
  const corpo = `${trilha(itens)}
<article class="doc">
<h1>Termos de uso</h1>
<p class="atual">Versão de ${DATA}</p>
<div class="resumo">
<p><strong>Em resumo:</strong> o Autokan reúne preços de referência, versões e fichas técnicas de carros 0 km vendidos no Brasil para você comparar. A gente mostra os dados e a fonte de cada um. <strong>Não avaliamos, não recomendamos e não dizemos qual carro é melhor.</strong> A escolha é sua.</p>
<p>Antes de comprar, confirme preço, versão e equipamentos com a concessionária ou a montadora.</p>
</div>
${secao("1. O que é o Autokan",
  p("O Autokan (autokan.com.br) é um site gratuito de informação sobre carros 0 km à venda no Brasil. Ele mostra preços de referência, versões, fichas técnicas, consumo, notícias e avisos de recall, e permite comparar carros lado a lado."),
  p("O Autokan não vende carros, não intermedia negócios e não representa nenhuma montadora ou concessionária."))}
${secao("2. O Autokan não indica qual carro comprar",
  p("Todo o conteúdo do Autokan é informativo. Não fazemos avaliação, teste, nota ou ranking de qualidade, e nada no site deve ser entendido como recomendação de compra."),
  p("Alguns destaques são calculados automaticamente a partir dos dados, com as mesmas regras para todos os carros: por exemplo, “menor preço” e “maior potência” na comparação, ou selos como “Econômico”, “Potente” e “Tecnologia”. Eles descrevem um fato sobre os números de cada versão e não são opinião nem indicação de que um carro é melhor que outro."),
  p("A decisão de compra é sempre sua, considerando o que importa para você."))}
${secao("3. De onde vêm os dados",
  p("Cada dado técnico do Autokan tem a fonte ao lado, com o link e a data da consulta. Usamos, nesta ordem de preferência:"),
  ul(["site oficial da montadora no Brasil, fichas técnicas, catálogos, listas de preços e salas de imprensa;",
    "Inmetro, pela Tabela de Eficiência Energética Veicular (PBEV), para consumo e eficiência;",
    "imprensa especializada, só quando a montadora não publica o dado ou o site dela não está acessível;",
    "Tabela FIPE, apenas como referência de preço, quando a montadora não divulga o preço sugerido."]),
  p("As fontes podem mudar sem aviso, conter erros ou divergir entre si. Também podemos errar ao registrar um dado. Quando não conseguimos confirmar uma informação, o campo fica vazio. Por isso, não garantimos que todos os dados estejam completos, atualizados ou corretos. Se encontrar algo errado, <a href=\"/contato?assunto=erro\">avise a gente</a>."))}
${secao("4. Preços",
  p("Os preços mostrados são de referência: o preço público sugerido pela montadora ou o valor da Tabela FIPE para carro 0 km, sempre com o mês de referência e a fonte. Não são oferta de venda."),
  p("O preço cobrado pela concessionária pode ser diferente por causa de frete, pintura, opcionais, promoções, impostos, região e disponibilidade."))}
${secao("5. Imagens",
  p("As fotos dos carros são ilustrativas. Algumas são geradas por inteligência artificial e podem ter diferenças em relação ao carro real, inclusive de cor, rodas e acabamento."))}
${secao("6. Conta de usuário",
  p("Para salvar carros, favoritar e comentar, é preciso criar uma conta gratuita. Ao se cadastrar, você aceita estes Termos de uso e a <a href=\"/privacidade\">Política de privacidade</a>."),
  ul(["Use dados verdadeiros e mantenha sua senha em sigilo. Você é responsável pelo que for feito com a sua conta.",
    "Podemos suspender ou encerrar contas usadas para fraude, spam ou em desacordo com estes termos.",
    "Você pode pedir a exclusão da sua conta a qualquer momento pela <a href=\"/contato\">página de contato</a>."]))}
${secao("7. Comentários e mensagens",
  p("Quem comenta ou envia mensagem é responsável pelo que escreve. Não é permitido publicar conteúdo ilegal, ofensivo, discriminatório, enganoso, com dados pessoais de terceiros ou propaganda. Podemos remover comentários que não sigam estas regras."))}
${secao("8. Notícias e links de outros sites",
  p("As notícias trazem um resumo escrito pelo Autokan e o link para a matéria original. O conteúdo dos sites de terceiros é responsabilidade de quem o publica."))}
${secao("9. Marcas e conteúdo",
  p("Os nomes e marcas de carros e montadoras pertencem aos seus donos e aparecem no Autokan apenas para identificar os produtos. A organização dos dados, os textos e o design do Autokan são protegidos. Não é permitido copiar a base do site de forma automatizada sem autorização."))}
${secao("10. Responsabilidade",
  p("O Autokan não se responsabiliza por decisões de compra, negociações ou prejuízos que resultem do uso das informações do site, nos limites permitidos pela lei, inclusive pelo Código de Defesa do Consumidor."))}
${secao("11. Mudanças nestes termos",
  p("Podemos atualizar estes termos. A data da versão em vigor fica no topo da página. Quando a mudança for importante, avisaremos quem tem conta."))}
${secao("12. Contato e lei aplicável",
  p("Dúvidas sobre estes termos podem ser enviadas pela <a href=\"/contato\">página de contato</a>. Estes termos seguem as leis do Brasil."))}
</article>`;
  return pagina({ titulo: "Termos de uso | Autokan", descricao: "Termos de uso do Autokan: o site mostra dados de carros 0 km com fonte para você comparar e não indica qual carro comprar.", caminho: "/termos", corpo, css: CSS, ld: [ldTrilha(itens)] });
}

export function paginaPrivacidade() {
  const itens = [INICIO, { nome: "Política de privacidade", url: "/privacidade" }];
  const corpo = `${trilha(itens)}
<article class="doc">
<h1>Política de privacidade</h1>
<p class="atual">Versão de ${DATA}</p>
<div class="resumo">
<p><strong>Em resumo:</strong> quem só visita o site não informa nome nem e-mail; medimos o uso com um código aleatório, sem guardar o IP. Quem cria conta nos dá e-mail e, se quiser, nome. Não vendemos dados e não usamos seus dados para publicidade de terceiros.</p>
</div>
${secao("1. Quem cuida dos seus dados",
  p("O Autokan (autokan.com.br) é o responsável pelo tratamento dos dados descritos aqui, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018). Para falar com a gente sobre privacidade, use a <a href=\"/contato?assunto=privacidade\">página de contato</a>."))}
${secao("2. Quais dados coletamos",
  `<p><strong>Quando você só visita o site</strong></p>`,
  ul(["um código aleatório do navegador e outro de cada visita;",
    "páginas vistas, de onde você chegou (por exemplo, Google, Instagram ou um link compartilhado), o tipo de aparelho e o que faz no site, como abrir a ficha de um carro, buscar ou comparar."]),
  p("Não guardamos seu IP, nome ou e-mail nessa medição."),
  `<p><strong>Quando você cria uma conta</strong></p>`,
  ul(["e-mail e, se informar, nome;",
    "senha, guardada de forma criptografada pelo serviço de autenticação (nós não temos acesso a ela);",
    "se entrar com o Google: nome, e-mail e foto da sua conta Google;",
    "carros salvos, favoritos e comentários;",
    "se os avisos de preço estiverem ligados, o registro dos e-mails de aviso que enviamos;",
    "a data e a versão dos Termos de uso e da Política de privacidade que você aceitou;",
    "a medição de uso descrita acima, ligada à sua conta."]),
  `<p><strong>Quando você usa a página de contato</strong></p>`,
  ul(["nome, e-mail, assunto, mensagem e a página de onde veio;",
    "um código irreversível gerado a partir do seu IP, usado só para limitar envios repetidos (anti-spam)."]))}
${secao("3. Para que usamos",
  ul(["manter sua conta e os carros que você salvou (execução do serviço que você pediu);",
    "avisar por e-mail quando o preço de um carro que você salvou baixar (dá para desligar nos Salvos ou pelo link de cada e-mail);",
    "responder às suas mensagens;",
    "entender como o site é usado e melhorá-lo, com números agregados (interesse legítimo);",
    "proteger o site contra abuso e spam (interesse legítimo);",
    "cumprir obrigações legais."]))}
${secao("4. Com quem compartilhamos",
  p("Não vendemos seus dados. Eles são tratados por serviços que fazem o site funcionar:"),
  ul(["Supabase: banco de dados e login;", "Netlify: hospedagem do site;", "Resend: envio de e-mails do site;", "Google: apenas se você escolher entrar com a conta Google."]),
  p("Esses serviços podem guardar dados fora do Brasil, com as proteções previstas na LGPD. Também podemos compartilhar dados quando a lei ou uma ordem judicial exigir."))}
${secao("5. Por quanto tempo guardamos",
  p("Os dados da conta ficam guardados enquanto ela existir. Mensagens de contato e dados de medição ficam pelo tempo necessário para as finalidades acima. Você pode pedir a exclusão a qualquer momento."))}
${secao("6. Seus direitos",
  p("Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização, portabilidade, exclusão, informação sobre com quem compartilhamos e revogação do consentimento. Basta escrever pela <a href=\"/contato?assunto=privacidade\">página de contato</a> usando o e-mail da sua conta."))}
${secao("7. Armazenamento no navegador",
  p("O site guarda no seu navegador o código aleatório da medição, suas preferências (como filtros) e a sessão de login. Você pode apagar esses dados nas configurações do navegador; nesse caso, precisará entrar de novo."))}
${secao("8. Segurança",
  p("Usamos conexão criptografada (HTTPS), regras de acesso no banco de dados e acesso restrito aos dados de medição e às mensagens. Nenhum sistema é totalmente imune a falhas; se houver um incidente que afete seus dados, avisaremos conforme a lei."))}
${secao("9. Mudanças nesta política",
  p("Podemos atualizar esta política. A data da versão em vigor fica no topo da página. Quando a mudança for importante, avisaremos quem tem conta."))}
<p>Veja também os <a href="/termos">Termos de uso</a>.</p>
</article>`;
  return pagina({ titulo: "Política de privacidade | Autokan", descricao: "Como o Autokan trata os dados de quem visita o site e de quem cria conta, conforme a LGPD.", caminho: "/privacidade", corpo, css: CSS, ld: [ldTrilha(itens)] });
}
