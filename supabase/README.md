# Supabase

Esquema do banco (`migrations/`) e função usada na carga inicial (`functions/import-data/`).

## Conta de administrador

O e-mail em `public.admin_emails` vira administrador automaticamente quando a conta é criada. Enquanto não houver tela de cadastro, crie a conta no painel do Supabase:

1. Abra **Authentication > Users > Add user > Create new user**.
2. Informe o e-mail e a senha e marque **Auto Confirm User**.
3. Entre no site pelo botão de perfil, no canto superior.

A mesma tela serve para trocar a senha, já que o site ainda não tem recuperação de senha.

## Imagens

Os originais ficam nos buckets `car-photos` e `brand-logos`. No ar, o site os pede pelo CDN de imagens do Netlify, em tamanho reduzido (`[images]` em `netlify.toml`). Fora do Netlify, o endereço `/.netlify/images` não existe; por isso, em `localhost` o site usa os arquivos originais.
