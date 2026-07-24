-- Chats persistentes para soporte y para matches recíprocos de Planchas.
-- Cada pareja comparte una sola conversación aunque tenga varios cursos en común.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('support', 'match')),
  support_user_id uuid references auth.users(id) on delete cascade,
  user_a_id uuid references auth.users(id) on delete cascade,
  user_b_id uuid references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  ended_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint chat_threads_valid_participants check (
    (
      kind = 'support'
      and support_user_id is not null
      and user_a_id is null
      and user_b_id is null
    )
    or
    (
      kind = 'match'
      and support_user_id is null
      and user_a_id is not null
      and user_b_id is not null
      and user_a_id < user_b_id
    )
  )
);

create unique index if not exists chat_threads_support_user_unique
on public.chat_threads (support_user_id)
where kind = 'support';

create unique index if not exists chat_threads_match_pair_unique
on public.chat_threads (user_a_id, user_b_id)
where kind = 'match';

create index if not exists chat_threads_recent_idx
on public.chat_threads (last_message_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_length check (
    body is null or char_length(body) between 1 and 4000
  ),
  constraint chat_messages_content_required check (
    body is not null or attachment_path is not null
  ),
  constraint chat_messages_attachment_complete check (
    (
      attachment_path is null
      and attachment_name is null
      and attachment_type is null
      and attachment_size is null
    )
    or
    (
      attachment_path is not null
      and attachment_name is not null
      and attachment_size is not null
      and attachment_size > 0
      and attachment_size <= 10485760
    )
  )
);

create index if not exists chat_messages_thread_created_idx
on public.chat_messages (thread_id, created_at);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.can_access_chat_thread(p_thread_id uuid)
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
          and auth.uid() in (thread.user_a_id, thread.user_b_id)
        )
      )
  )
$$;

create or replace function public.can_write_chat_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_access_chat_thread(p_thread_id)
    and exists (
      select 1
      from public.chat_threads
      where id = p_thread_id
        and status = 'active'
    )
$$;

revoke all on function public.can_access_chat_thread(uuid) from public;
revoke all on function public.can_write_chat_thread(uuid) from public;
grant execute on function public.can_access_chat_thread(uuid) to authenticated;
grant execute on function public.can_write_chat_thread(uuid) to authenticated;

drop policy if exists "chat threads participant read" on public.chat_threads;
create policy "chat threads participant read"
on public.chat_threads
for select
to authenticated
using (public.can_access_chat_thread(id));

drop policy if exists "chat messages participant read" on public.chat_messages;
create policy "chat messages participant read"
on public.chat_messages
for select
to authenticated
using (public.can_access_chat_thread(thread_id));

-- Los usuarios pueden consultar sus propios matches para ver el intercambio.
drop policy if exists "worksheet matches participant read"
on public.worksheet_matches;

create policy "worksheet matches participant read"
on public.worksheet_matches
for select
to authenticated
using (auth.uid() in (user_a_id, user_b_id));

-- Crea el chat de soporte y una conversación por cada pareja con match.
create or replace function public.ensure_user_chat_threads()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.is_admin() then
    insert into public.chat_threads (kind, support_user_id)
    values ('support', v_user_id)
    on conflict (support_user_id) where kind = 'support'
    do nothing;
  end if;

  insert into public.chat_threads (kind, user_a_id, user_b_id)
  select distinct
    'match',
    match.user_a_id,
    match.user_b_id
  from public.worksheet_matches match
  where match.status = 'active'
    and v_user_id in (match.user_a_id, match.user_b_id)
  on conflict (user_a_id, user_b_id) where kind = 'match'
  do nothing;
end;
$$;

revoke all on function public.ensure_user_chat_threads() from public;
grant execute on function public.ensure_user_chat_threads() to authenticated;

-- Devuelve únicamente los nombres de participantes visibles en los chats del usuario.
create or replace function public.get_chat_participant_profiles()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct profile.id, profile.full_name
  from public.profiles profile
  where profile.id = auth.uid()
    or exists (
      select 1
      from public.chat_threads thread
      where public.can_access_chat_thread(thread.id)
        and (
          (thread.kind = 'support' and profile.id = thread.support_user_id)
          or
          (
            thread.kind = 'match'
            and profile.id in (thread.user_a_id, thread.user_b_id)
          )
        )
    )
$$;

revoke all on function public.get_chat_participant_profiles() from public;
grant execute on function public.get_chat_participant_profiles() to authenticated;

create or replace function public.get_chat_thread_previews()
returns table (
  thread_id uuid,
  sender_id uuid,
  body text,
  attachment_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    thread.id,
    latest.sender_id,
    latest.body,
    latest.attachment_name,
    latest.created_at
  from public.chat_threads thread
  left join lateral (
    select
      message.sender_id,
      message.body,
      message.attachment_name,
      message.created_at
    from public.chat_messages message
    where message.thread_id = thread.id
    order by message.created_at desc
    limit 1
  ) latest on true
  where public.can_access_chat_thread(thread.id)
$$;

revoke all on function public.get_chat_thread_previews() from public;
grant execute on function public.get_chat_thread_previews() to authenticated;

create or replace function public.send_chat_message(
  p_thread_id uuid,
  p_body text default null,
  p_attachment_path text default null,
  p_attachment_name text default null,
  p_attachment_type text default null,
  p_attachment_size bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_message_id uuid;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.can_write_chat_thread(p_thread_id) then
    raise exception 'Este chat está finalizado o no tienes acceso.';
  end if;

  if v_body is null and p_attachment_path is null then
    raise exception 'Escribe un mensaje o adjunta un archivo.';
  end if;

  if v_body is not null and char_length(v_body) > 4000 then
    raise exception 'El mensaje no puede superar los 4000 caracteres.';
  end if;

  if p_attachment_path is not null then
    if split_part(p_attachment_path, '/', 1) <> p_thread_id::text
      or split_part(p_attachment_path, '/', 2) <> v_user_id::text then
      raise exception 'La ruta del archivo adjunto no es válida.';
    end if;

    if p_attachment_name is null
      or p_attachment_size is null
      or p_attachment_size < 1
      or p_attachment_size > 10485760 then
      raise exception 'El archivo adjunto no es válido o supera los 10 MB.';
    end if;
  end if;

  insert into public.chat_messages (
    thread_id,
    sender_id,
    body,
    attachment_path,
    attachment_name,
    attachment_type,
    attachment_size
  )
  values (
    p_thread_id,
    v_user_id,
    v_body,
    p_attachment_path,
    p_attachment_name,
    nullif(p_attachment_type, ''),
    p_attachment_size
  )
  returning id into v_message_id;

  update public.chat_threads
  set last_message_at = now()
  where id = p_thread_id;

  return v_message_id;
end;
$$;

revoke all on function public.send_chat_message(uuid, text, text, text, text, bigint) from public;
grant execute on function public.send_chat_message(uuid, text, text, text, text, bigint) to authenticated;

create or replace function public.finish_chat_thread(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.can_access_chat_thread(p_thread_id) then
    raise exception 'No tienes acceso a este chat.';
  end if;

  update public.chat_threads
  set
    status = 'ended',
    ended_by = coalesce(ended_by, v_user_id),
    ended_at = coalesce(ended_at, now())
  where id = p_thread_id
    and status = 'active';
end;
$$;

revoke all on function public.finish_chat_thread(uuid) from public;
grant execute on function public.finish_chat_thread(uuid) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat attachments participant read" on storage.objects;
create policy "chat attachments participant read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and public.can_access_chat_thread(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "chat attachments participant upload" on storage.objects;
create policy "chat attachments participant upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.can_write_chat_thread(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "chat attachments owner cleanup" on storage.objects;
create policy "chat attachments owner cleanup"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.can_access_chat_thread(((storage.foldername(name))[1])::uuid)
);
