-- Una cuenta estudiantil solo puede mantener un chat activo.
-- Tras finalizarlo debe esperar 24 horas antes de abrir otro.

alter table public.chat_threads
add column if not exists opened_by uuid references auth.users(id);

alter table public.chat_threads
add column if not exists opened_at timestamptz;

alter table public.chat_threads
drop constraint if exists chat_threads_status_check;

alter table public.chat_threads
alter column status set default 'available';

alter table public.chat_threads
add constraint chat_threads_status_check
check (status in ('available', 'active', 'ended'));

-- Los chats creados antes de esta regla quedan disponibles para que
-- uno de sus participantes los abra expresamente.
update public.chat_threads
set
  status = 'available',
  opened_by = null,
  opened_at = null
where status = 'active'
  and opened_at is null;

create or replace function public.open_chat_thread(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread public.chat_threads%rowtype;
  v_first_user_id uuid;
  v_second_user_id uuid;
  v_latest_close timestamptz;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select *
  into v_thread
  from public.chat_threads
  where id = p_thread_id
  for update;

  if not found or not public.can_access_chat_thread(p_thread_id) then
    raise exception 'No tienes acceso a este chat.';
  end if;

  if v_thread.status = 'active' then
    return;
  end if;

  if v_thread.status = 'ended' then
    raise exception 'Un chat finalizado no se puede volver a abrir.';
  end if;

  if v_thread.kind = 'support' then
    if v_user_id <> v_thread.support_user_id then
      raise exception 'El estudiante debe abrir primero este chat de soporte.';
    end if;
    v_first_user_id := v_thread.support_user_id;
    v_second_user_id := null;
  else
    if v_user_id not in (v_thread.user_a_id, v_thread.user_b_id) then
      raise exception 'No formas parte de este match.';
    end if;
    v_first_user_id := v_thread.user_a_id;
    v_second_user_id := v_thread.user_b_id;
  end if;

  -- Bloqueos ordenados para impedir que dos aperturas simultáneas
  -- activen dos chats para la misma cuenta.
  perform pg_advisory_xact_lock(hashtextextended(v_first_user_id::text, 0));
  if v_second_user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_second_user_id::text, 0));
  end if;

  if exists (
    select 1
    from public.chat_threads other
    where other.status = 'active'
      and other.id <> p_thread_id
      and (
        other.support_user_id = v_first_user_id
        or other.user_a_id = v_first_user_id
        or other.user_b_id = v_first_user_id
      )
  ) then
    raise exception 'Ya tienes un chat activo. Debes finalizarlo antes de abrir otro.';
  end if;

  select max(other.ended_at)
  into v_latest_close
  from public.chat_threads other
  where other.status = 'ended'
    and (
      other.support_user_id = v_first_user_id
      or other.user_a_id = v_first_user_id
      or other.user_b_id = v_first_user_id
    );

  if v_latest_close is not null and v_latest_close > now() - interval '24 hours' then
    raise exception 'Debes esperar 24 horas desde que finalizaste tu chat anterior.';
  end if;

  if v_second_user_id is not null then
    if exists (
      select 1
      from public.chat_threads other
      where other.status = 'active'
        and other.id <> p_thread_id
        and (
          other.support_user_id = v_second_user_id
          or other.user_a_id = v_second_user_id
          or other.user_b_id = v_second_user_id
        )
    ) then
      raise exception 'La otra persona ya tiene un chat activo. Inténtalo cuando lo finalice.';
    end if;

    select max(other.ended_at)
    into v_latest_close
    from public.chat_threads other
    where other.status = 'ended'
      and (
        other.support_user_id = v_second_user_id
        or other.user_a_id = v_second_user_id
        or other.user_b_id = v_second_user_id
      );

    if v_latest_close is not null and v_latest_close > now() - interval '24 hours' then
      raise exception 'La otra persona todavía debe esperar 24 horas desde el cierre de su chat anterior.';
    end if;
  end if;

  update public.chat_threads
  set
    status = 'active',
    opened_by = v_user_id,
    opened_at = now()
  where id = p_thread_id
    and status = 'available';
end;
$$;

revoke all on function public.open_chat_thread(uuid) from public;
grant execute on function public.open_chat_thread(uuid) to authenticated;
