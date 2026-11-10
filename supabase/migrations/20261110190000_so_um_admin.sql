-- O único administrador do Autokan é a conta thiagohtr2@gmail.com, e o próprio banco garante isso:
-- 1) nenhum perfil vira "admin" se a conta não for essa: cadastro novo entra como "user" e qualquer
--    tentativa de mudar o cargo de outra conta para "admin" é recusada;
-- 2) pelo site ninguém altera o cargo, o id ou a data de criação do perfil (só o nome e a foto);
-- 3) a lista de e-mails de administrador só aceita esse e-mail.
create or replace function public.so_um_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'admin' and not exists (
    select 1 from auth.users u where u.id = new.id and lower(u.email) = 'thiagohtr2@gmail.com'
  ) then
    if tg_op = 'INSERT' then
      new.role := 'user';
    else
      raise exception 'Só a conta do dono do Autokan pode ser administradora.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.so_um_admin() from public, anon, authenticated;

drop trigger if exists profiles_so_um_admin on public.profiles;
create trigger profiles_so_um_admin before insert or update of role on public.profiles
  for each row execute function public.so_um_admin();

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

alter table public.admin_emails drop constraint if exists admin_emails_so_o_dono;
alter table public.admin_emails add constraint admin_emails_so_o_dono check (lower(email) = 'thiagohtr2@gmail.com');
