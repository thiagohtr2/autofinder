# Supabase

Esquema do banco (`migrations/`) e função usada na carga inicial (`functions/import-data/`).

## Conta de administrador

O e-mail em `public.admin_emails` vira administrador automaticamente quando a conta é criada. Crie essa conta antes de abrir o site ao público, para ninguém tentar cadastrar esse e-mail primeiro:

1. Abra **Authentication > Users > Add user > Create new user**.
2. Informe o e-mail e a senha e marque **Auto Confirm User**.
3. Entre no site pelo botão **Entrar**, no topo.

A mesma tela serve para trocar a senha, já que o site ainda não tem recuperação de senha.

## Cadastro pelo site

O botão **Cadastrar** cria a conta e envia um link de confirmação por e-mail. Para isso funcionar, configure no painel:

1. **Authentication > URL Configuration**: em **Site URL**, use `https://autofindr.netlify.app`. Em **Redirect URLs**, adicione `https://autofindr.netlify.app/**` e `https://*--autofindr.netlify.app/**` (prévias). Sem isso, o link de confirmação leva para `localhost`.
2. **Authentication > Emails > SMTP Settings**: configure um serviço de e-mail próprio. O serviço padrão do Supabase só entrega para membros da equipe do projeto e envia poucas mensagens por hora; para os demais endereços, o site mostra que o cadastro está em testes.

Não desligue **Confirm email**: sem a confirmação, qualquer pessoa poderia se cadastrar com o e-mail do administrador e receber esse acesso na hora.

## Imagens

Os originais ficam nos buckets `car-photos` e `brand-logos`. No ar, o site os pede pelo CDN de imagens do Netlify, em tamanho reduzido (`[images]` em `netlify.toml`). Fora do Netlify, o endereço `/.netlify/images` não existe; por isso, em `localhost` o site usa os arquivos originais.
