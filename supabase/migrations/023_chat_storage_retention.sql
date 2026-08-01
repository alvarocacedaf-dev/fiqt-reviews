-- Límites de entrega, huellas digitales y consulta administrativa de Storage.

alter table public.chat_exchange_files
add column if not exists file_sha256 text;

alter table public.chat_exchange_files
drop constraint if exists chat_exchange_files_file_size_check;

alter table public.chat_exchange_files
add constraint chat_exchange_files_file_size_check
check (file_size between 1 and 41943040);

alter table public.chat_exchange_files
drop constraint if exists chat_exchange_files_sha256_check;

alter table public.chat_exchange_files
add constraint chat_exchange_files_sha256_check
check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$');

create unique index if not exists chat_exchange_files_delivery_hash_unique
on public.chat_exchange_files (thread_id, uploader_id, file_sha256)
where file_sha256 is not null;

create index if not exists chat_threads_ended_retention_idx
on public.chat_threads (ended_at)
where status = 'ended' and ended_at is not null;

create index if not exists chat_reports_thread_reviewed_idx
on public.chat_reports (thread_id, reviewed_at);

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
  v_hash text;
  v_size bigint;
  v_total_size bigint := 0;
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

  if coalesce(jsonb_typeof(p_files), 'null') <> 'array'
    or jsonb_array_length(p_files) < 2 then
    raise exception 'Debes entregar al menos 2 archivos.';
  end if;

  if (
    select count(distinct lower(value ->> 'sha256'))
    from jsonb_array_elements(p_files)
  ) <> jsonb_array_length(p_files) then
    raise exception 'La entrega contiene archivos duplicados.';
  end if;

  for v_file in select value from jsonb_array_elements(p_files)
  loop
    v_path := nullif(v_file ->> 'path', '');
    v_name := nullif(v_file ->> 'name', '');
    v_type := nullif(v_file ->> 'type', '');
    v_hash := lower(nullif(v_file ->> 'sha256', ''));
    v_size := nullif(v_file ->> 'size', '')::bigint;

    if v_path is null
      or split_part(v_path, '/', 1) <> p_thread_id::text
      or split_part(v_path, '/', 2) <> v_user_id::text
      or split_part(v_path, '/', 3) <> 'exchange' then
      raise exception 'La ruta de uno de los archivos no es válida.';
    end if;

    if v_name is null
      or char_length(v_name) > 255
      or v_hash is null
      or v_hash !~ '^[0-9a-f]{64}$'
      or v_size is null
      or v_size < 1
      or v_size > 41943040 then
      raise exception 'Uno de los archivos no es válido.';
    end if;

    v_total_size := v_total_size + v_size;
    if v_total_size > 41943040 then
      raise exception 'La entrega supera el máximo total de 40 MB.';
    end if;

    if not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'chat-attachments'
        and object.name = v_path
        and (object.metadata ->> 'size')::bigint = v_size
    ) then
      raise exception 'No se encontró uno de los archivos entregados.';
    end if;

    insert into public.chat_exchange_files (
      thread_id,
      uploader_id,
      file_path,
      file_name,
      mime_type,
      file_size,
      file_sha256
    )
    values (
      p_thread_id,
      v_user_id,
      v_path,
      v_name,
      v_type,
      v_size,
      v_hash
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

update storage.buckets
set file_size_limit = 41943040
where id = 'chat-attachments';

create or replace function public.admin_storage_usage()
returns table (
  bucket_id text,
  object_count bigint,
  total_bytes bigint
)
language plpgsql
stable
security definer
set search_path = public, storage
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    object.bucket_id,
    count(*)::bigint,
    coalesce(sum((object.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects object
  group by object.bucket_id
  order by sum((object.metadata ->> 'size')::bigint) desc;
end;
$$;

revoke all on function public.admin_storage_usage() from public;
grant execute on function public.admin_storage_usage() to authenticated;
