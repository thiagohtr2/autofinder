-- Formulário de contato (/contato): as mensagens entram pela função "contato" (com limite contra spam)
-- e só o admin lê, no painel (seção Mensagens). Ninguém lê nem grava direto pela chave pública.
create table public.contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  subject text check (subject is null or char_length(subject) <= 160),
  message text not null check (char_length(message) between 5 and 5000),
  page text check (page is null or char_length(page) <= 300),
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  status text not null default 'nova' check (status in ('nova', 'lida', 'respondida', 'arquivada')),
  emailed_at timestamptz
);
comment on table public.contact_messages is 'Mensagens do formulário de contato. Entram pela função contato (service role); só o admin lê e muda o status.';
create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index contact_messages_ip_idx on public.contact_messages (ip_hash, created_at);

alter table public.contact_messages enable row level security;
create policy "admin le mensagens" on public.contact_messages for select to authenticated using ((select public.is_admin()));
create policy "admin muda mensagens" on public.contact_messages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin apaga mensagens" on public.contact_messages for delete to authenticated using ((select public.is_admin()));

revoke all on public.contact_messages from anon;
revoke all on public.contact_messages from authenticated;
grant select, update, delete on public.contact_messages to authenticated;
