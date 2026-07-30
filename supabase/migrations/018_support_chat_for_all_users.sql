-- Todos los estudiantes deben contar con un chat de soporte visible,
-- aunque todavía no hayan desbloqueado la comunidad de Planchas.

insert into public.chat_threads (kind, support_user_id, status)
select
  'support',
  profile.id,
  'available'
from public.profiles profile
where profile.role <> 'admin'
on conflict (support_user_id) where kind = 'support'
do nothing;

create or replace function public.create_support_chat_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'admin' then
    insert into public.chat_threads (kind, support_user_id, status)
    values ('support', new.id, 'available')
    on conflict (support_user_id) where kind = 'support'
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_create_support_chat
on public.profiles;

create trigger profiles_create_support_chat
after insert or update of role
on public.profiles
for each row
execute function public.create_support_chat_for_profile();

-- El soporte está disponible para cualquier cuenta autenticada.
-- Los chats entre estudiantes conservan el requisito de acceso a Planchas.
create or replace function public.can_access_chat_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.chat_threads thread
      where thread.id = p_thread_id
        and (
          (
            thread.kind = 'support'
            and (
              thread.support_user_id = auth.uid()
              or public.is_admin()
            )
          )
          or
          (
            thread.kind = 'match'
            and public.has_worksheet_access(auth.uid())
            and auth.uid() in (thread.user_a_id, thread.user_b_id)
          )
        )
    )
$$;

revoke all on function public.can_access_chat_thread(uuid) from public;
grant execute on function public.can_access_chat_thread(uuid) to authenticated;
