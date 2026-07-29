-- Reportes de chats de intercambio finalizados y sus evidencias fotográficas.

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(description) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (thread_id, reporter_id)
);

create table if not exists public.chat_report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.chat_reports(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size bigint not null check (file_size between 1 and 5242880),
  created_at timestamptz not null default now()
);

create index if not exists chat_reports_status_created_idx
on public.chat_reports (status, created_at desc);

create index if not exists chat_report_attachments_report_idx
on public.chat_report_attachments (report_id);

alter table public.chat_reports enable row level security;
alter table public.chat_report_attachments enable row level security;

drop policy if exists "chat reports reporter or admin read" on public.chat_reports;
create policy "chat reports reporter or admin read"
on public.chat_reports
for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "chat reports admin update" on public.chat_reports;
create policy "chat reports admin update"
on public.chat_reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "chat report attachments reporter or admin read" on public.chat_report_attachments;
create policy "chat report attachments reporter or admin read"
on public.chat_report_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_reports report
    where report.id = report_id
      and (report.reporter_id = auth.uid() or public.is_admin())
  )
);

grant select on public.chat_reports to authenticated;
grant select on public.chat_report_attachments to authenticated;
grant update (status, reviewed_at, reviewed_by) on public.chat_reports to authenticated;

create or replace function public.can_report_chat_thread(p_thread_id uuid)
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
      and thread.status = 'ended'
      and auth.uid() in (thread.user_a_id, thread.user_b_id)
  )
$$;

revoke all on function public.can_report_chat_thread(uuid) from public;
grant execute on function public.can_report_chat_thread(uuid) to authenticated;

create or replace function public.create_chat_report(
  p_report_id uuid,
  p_thread_id uuid,
  p_description text,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_description text := btrim(coalesce(p_description, ''));
  v_attachment jsonb;
  v_path text;
  v_name text;
  v_type text;
  v_size bigint;
  v_expected_prefix text;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.can_report_chat_thread(p_thread_id) then
    raise exception 'Solo puedes reportar un chat de intercambio finalizado en el que participaste.';
  end if;

  if char_length(v_description) < 10 or char_length(v_description) > 2000 then
    raise exception 'La descripción debe tener entre 10 y 2000 caracteres.';
  end if;

  if jsonb_typeof(p_attachments) <> 'array' then
    raise exception 'Las evidencias enviadas no son válidas.';
  end if;

  if jsonb_array_length(p_attachments) > 5 then
    raise exception 'Puedes adjuntar como máximo 5 imágenes.';
  end if;

  if exists (
    select 1
    from public.chat_reports
    where thread_id = p_thread_id
      and reporter_id = v_user_id
  ) then
    raise exception 'Ya enviaste un reporte para este chat.';
  end if;

  insert into public.chat_reports (id, thread_id, reporter_id, description)
  values (p_report_id, p_thread_id, v_user_id, v_description);

  v_expected_prefix := p_thread_id::text || '/' || v_user_id::text || '/' || p_report_id::text || '/';

  for v_attachment in
    select value from jsonb_array_elements(p_attachments)
  loop
    v_path := v_attachment ->> 'path';
    v_name := v_attachment ->> 'name';
    v_type := v_attachment ->> 'type';
    v_size := (v_attachment ->> 'size')::bigint;

    if v_path is null or left(v_path, char_length(v_expected_prefix)) <> v_expected_prefix then
      raise exception 'La ubicación de una evidencia no es válida.';
    end if;

    if v_name is null or char_length(v_name) > 255 then
      raise exception 'El nombre de una evidencia no es válido.';
    end if;

    if v_type not in ('image/jpeg', 'image/png', 'image/webp') then
      raise exception 'Solo se permiten imágenes JPG, PNG o WEBP.';
    end if;

    if v_size < 1 or v_size > 5242880 then
      raise exception 'Cada imagen debe pesar como máximo 5 MB.';
    end if;

    if not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'chat-report-evidence'
        and object.name = v_path
    ) then
      raise exception 'No se encontró una de las evidencias subidas.';
    end if;

    insert into public.chat_report_attachments (
      report_id,
      storage_path,
      original_name,
      mime_type,
      file_size
    )
    values (p_report_id, v_path, v_name, v_type, v_size);
  end loop;

  return p_report_id;
end;
$$;

revoke all on function public.create_chat_report(uuid, uuid, text, jsonb) from public;
grant execute on function public.create_chat_report(uuid, uuid, text, jsonb) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-report-evidence',
  'chat-report-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat report evidence upload" on storage.objects;
create policy "chat report evidence upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-report-evidence'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.can_report_chat_thread(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "chat report evidence read" on storage.objects;
create policy "chat report evidence read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-report-evidence'
  and exists (
    select 1
    from public.chat_report_attachments attachment
    join public.chat_reports report on report.id = attachment.report_id
    where attachment.storage_path = name
      and (report.reporter_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "chat report evidence owner cleanup" on storage.objects;
create policy "chat report evidence owner cleanup"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-report-evidence'
  and (storage.foldername(name))[2] = auth.uid()::text
  and not exists (
    select 1
    from public.chat_report_attachments attachment
    where attachment.storage_path = name
  )
);
