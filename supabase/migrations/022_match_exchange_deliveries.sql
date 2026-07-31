-- Entrega protegida de planchas antes de activar un chat de match.
-- Cada participante realiza una sola entrega de uno o varios archivos.

create table if not exists public.chat_exchange_submissions (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.chat_exchange_files (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text,
  file_size bigint not null check (file_size between 1 and 10485760),
  created_at timestamptz not null default now()
);

create index if not exists chat_exchange_files_thread_created_idx
on public.chat_exchange_files (thread_id, created_at);

alter table public.chat_exchange_submissions enable row level security;
alter table public.chat_exchange_files enable row level security;

drop policy if exists "chat exchange submissions participant read"
on public.chat_exchange_submissions;
create policy "chat exchange submissions participant read"
on public.chat_exchange_submissions
for select
to authenticated
using (public.can_access_chat_thread(thread_id));

drop policy if exists "chat exchange files participant read"
on public.chat_exchange_files;
create policy "chat exchange files participant read"
on public.chat_exchange_files
for select
to authenticated
using (public.can_access_chat_thread(thread_id));

create or replace function public.chat_exchange_is_ready(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads thread
    where thread.id = p_thread_id
      and thread.kind = 'match'
      and (
        select count(distinct submission.user_id)
        from public.chat_exchange_submissions submission
        where submission.thread_id = thread.id
          and submission.user_id in (thread.user_a_id, thread.user_b_id)
      ) = 2
  )
$$;

revoke all on function public.chat_exchange_is_ready(uuid) from public;
grant execute on function public.chat_exchange_is_ready(uuid) to authenticated;

create or replace function public.can_upload_chat_exchange(p_thread_id uuid)
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
        and thread.kind = 'match'
        and thread.status = 'available'
        and auth.uid() in (thread.user_a_id, thread.user_b_id)
        and not exists (
          select 1
          from public.chat_exchange_submissions submission
          where submission.thread_id = thread.id
            and submission.user_id = auth.uid()
        )
    )
$$;

revoke all on function public.can_upload_chat_exchange(uuid) from public;
grant execute on function public.can_upload_chat_exchange(uuid) to authenticated;

create or replace function public.require_match_exchange_before_activation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'match'
    and old.status = 'available'
    and new.status = 'active'
    and not public.chat_exchange_is_ready(new.id) then
    raise exception 'Ambas personas deben entregar sus archivos antes de activar el chat.';
  end if;

  return new;
end;
$$;

drop trigger if exists chat_threads_require_exchange_before_activation
on public.chat_threads;
create trigger chat_threads_require_exchange_before_activation
before update of status
on public.chat_threads
for each row
execute function public.require_match_exchange_before_activation();

create or replace function public.submit_chat_exchange(
  p_thread_id uuid,
  p_files jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread public.chat_threads%rowtype;
  v_file jsonb;
  v_path text;
  v_name text;
  v_type text;
  v_size bigint;
  v_ready boolean;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select *
  into v_thread
  from public.chat_threads
  where id = p_thread_id
  for update;

  if not found
    or v_thread.kind <> 'match'
    or v_user_id not in (v_thread.user_a_id, v_thread.user_b_id) then
    raise exception 'No tienes acceso a este intercambio.';
  end if;

  if v_thread.status <> 'available' then
    raise exception 'Este intercambio ya está activo o finalizado.';
  end if;

  if exists (
    select 1
    from public.chat_exchange_submissions submission
    where submission.thread_id = p_thread_id
      and submission.user_id = v_user_id
  ) then
    raise exception 'Ya realizaste tu entrega para este intercambio.';
  end if;

  if jsonb_typeof(p_files) <> 'array'
    or jsonb_array_length(p_files) < 1
    or jsonb_array_length(p_files) > 10 then
    raise exception 'Debes entregar entre 1 y 10 archivos.';
  end if;

  for v_file in select value from jsonb_array_elements(p_files)
  loop
    v_path := nullif(v_file ->> 'path', '');
    v_name := nullif(v_file ->> 'name', '');
    v_type := nullif(v_file ->> 'type', '');
    v_size := nullif(v_file ->> 'size', '')::bigint;

    if v_path is null
      or split_part(v_path, '/', 1) <> p_thread_id::text
      or split_part(v_path, '/', 2) <> v_user_id::text
      or split_part(v_path, '/', 3) <> 'exchange' then
      raise exception 'La ruta de uno de los archivos no es válida.';
    end if;

    if v_name is null
      or char_length(v_name) > 255
      or v_size is null
      or v_size < 1
      or v_size > 10485760 then
      raise exception 'Uno de los archivos no es válido o supera los 10 MB.';
    end if;

    if not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'chat-attachments'
        and object.name = v_path
    ) then
      raise exception 'No se encontró uno de los archivos entregados.';
    end if;

    insert into public.chat_exchange_files (
      thread_id,
      uploader_id,
      file_path,
      file_name,
      mime_type,
      file_size
    )
    values (
      p_thread_id,
      v_user_id,
      v_path,
      v_name,
      v_type,
      v_size
    );
  end loop;

  insert into public.chat_exchange_submissions (thread_id, user_id)
  values (p_thread_id, v_user_id);

  v_ready := public.chat_exchange_is_ready(p_thread_id);
  if v_ready then
    perform public.open_chat_thread(p_thread_id);
  end if;

  return v_ready;
end;
$$;

revoke all on function public.submit_chat_exchange(uuid, jsonb) from public;
grant execute on function public.submit_chat_exchange(uuid, jsonb) to authenticated;

-- Las cargas normales siguen exigiendo un chat activo. La carpeta "exchange"
-- se permite durante la fase previa del match.
drop policy if exists "chat attachments participant upload" on storage.objects;
create policy "chat attachments participant upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (
    public.can_write_chat_thread(((storage.foldername(name))[1])::uuid)
    or (
      (storage.foldername(name))[3] = 'exchange'
      and public.can_upload_chat_exchange(((storage.foldername(name))[1])::uuid)
    )
  )
);

-- Antes de ambas entregas cada persona solo puede descargar sus propios
-- archivos de intercambio. Los mensajes normales conservan el acceso previo.
drop policy if exists "chat attachments participant read" on storage.objects;
create policy "chat attachments participant read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and public.can_access_chat_thread(((storage.foldername(name))[1])::uuid)
  and (
    coalesce((storage.foldername(name))[3], '') <> 'exchange'
    or (storage.foldername(name))[2] = auth.uid()::text
    or public.is_admin()
    or public.chat_exchange_is_ready(((storage.foldername(name))[1])::uuid)
  )
);
