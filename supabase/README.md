# Supabase

Esquema do banco (`migrations/`), funções (`functions/`: carga inicial e contato) e modelos dos e-mails de login (`templates/`).

## Conta de administrador

O e-mail em `public.admin_emails` vira administrador automaticamente quando a conta é criada. Crie essa conta antes de abrir o site ao público, para ninguém tentar cadastrar esse e-mail primeiro:

1. Abra **Authentication > Users > Add user > Create new user**.
2. Informe o e-mail e a senha e marque **Auto Confirm User**.
3. Entre no site pelo botão **Entrar**, no topo.

A mesma tela serve para trocar a senha, já que o site ainda não tem recuperação de senha.

## Cadastro pelo site

O botão **Cadastrar** cria a conta e envia um link de confirmação por e-mail. Para isso funcionar, configure no painel:

1. **Authentication > URL Configuration**: em **Site URL**, use `https://autokan.com.br`. Em **Redirect URLs**, adicione `https://autokan.com.br/**` e `https://*--autokan.netlify.app/**` (prévias). Sem isso, o link de confirmação leva para `localhost`.
2. **Authentication > Emails > SMTP Settings**: configure um serviço de e-mail próprio (abaixo). O serviço padrão do Supabase só entrega para membros da equipe do projeto, envia poucas mensagens por hora e chega com o nome "Supabase Auth".

Não desligue **Confirm email**: sem a confirmação, qualquer pessoa poderia se cadastrar com o e-mail do administrador e receber esse acesso na hora.

### E-mails com o nome do Autokan

Os e-mails de login saem pelo [Resend](https://resend.com), com o remetente `Autokan <nao-responda@autokan.com.br>`:

1. Crie a conta no Resend e, em **Domains**, adicione `autokan.com.br`. O Resend mostra alguns registros DNS (TXT e MX); copie cada um para o DNS do domínio, no mesmo lugar em que o domínio foi apontado para a Netlify. Espere o domínio ficar **Verified**.
2. Em **API Keys**, crie uma chave com permissão **Sending access**.
3. No Supabase, **Authentication > Emails > SMTP Settings**, ligue **Enable Custom SMTP** e preencha: Sender email `nao-responda@autokan.com.br`, Sender name `Autokan`, Host `smtp.resend.com`, Port `465`, Username `resend`, Password = a chave do Resend.
4. Em **Authentication > Emails > Templates**, troque o assunto e o corpo de cada modelo pelo arquivo de `templates/`:

| Modelo no Supabase | Assunto | Arquivo |
| --- | --- | --- |
| Confirm sign up | Confirme seu e-mail no Autokan | `templates/confirmar-cadastro.html` |
| Invite user | Seu convite para o Autokan | `templates/convite.html` |
| Magic link | Seu link para entrar no Autokan | `templates/link-para-entrar.html` |
| Change email address | Confirme seu novo e-mail no Autokan | `templates/trocar-email.html` |
| Reset password | Crie uma nova senha no Autokan | `templates/nova-senha.html` |
| Reauthentication | Seu código de confirmação do Autokan | `templates/codigo-de-confirmacao.html` |

Os links de confirmação de cadastro, convite e entrada abrem direto em `autokan.com.br/?token_hash=…`, e o site confirma ali mesmo (`public/supabase-adapter.js`), em qualquer navegador. Por isso, troque esses modelos só depois que essa versão do site estiver no ar.

5. Ainda no Supabase, **Edge Functions > Secrets**: adicione `RESEND_API_KEY` (a mesma chave) para o formulário de contato avisar por e-mail. Opcional: `CONTATO_REMETENTE` = `Autokan <contato@autokan.com.br>`; sem ele, o aviso sai de `onboarding@resend.dev`, que o Resend só entrega para o e-mail da própria conta do Resend.

## Contato

O formulário de `/contato` manda a mensagem para a função `functions/contato/`, que confere os campos, segura robôs (campo escondido, tempo mínimo e 5 mensagens por hora por conexão), guarda em `contact_messages` e avisa por e-mail `thiagohtr2@gmail.com`, com o e-mail da pessoa em "responder para". Só o admin lê as mensagens, no painel (`/admin.html#mensagens`), onde também marca como lida, respondida ou arquivada.

## Mudanças de preço

A tabela `price_changes` guarda cada mudança noticiada: valor antigo, valor novo, tipo (`definitivo` ou `promocional`), validade, motivo e fonte. O site mostra a mudança mais recente em vigor. Quando uma oferta vence, o card sai sozinho do filtro de preços reduzidos.

Registre só casos com fonte, válidos para o consumidor comum e ligados a uma versão específica. Ofertas só para PCD, CNPJ ou taxistas, com usado na troca ou anúncios de concessionárias ficam de fora. A carga inicial está em `seeds/20261105_price_changes.sql`.

Ao aplicar um item do radar, o site registra a mudança sozinho quando há valor antigo: o preço anterior do mesmo tipo, ou o que vem em `price.promo` como "antes R$ 218.800" ou "redução de R$ 19 mil". Uma data no formato "até 30/11/2026" em `price.promo` vira a validade.

## Imagens

Os originais ficam nos buckets `car-photos` e `brand-logos`. No ar, o site os pede pelo CDN de imagens do Netlify, em tamanho reduzido (`[images]` em `netlify.toml`). Fora do Netlify, o endereço `/.netlify/images` não existe; por isso, em `localhost` o site usa os arquivos originais.
