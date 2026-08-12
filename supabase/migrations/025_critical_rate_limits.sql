-- Protecciones críticas contra abuso de acciones autenticadas.

create table if not exists public.action_rate_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (actor_id, action_key)
);

alter table public.action_rate_limits enable row level security;
revoke all on table public.action_rate_limits from public, anon, authenticated;

create or replace function public.consume_action_rate_limit(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer;
  v_message text;
  v_attempt_count integer;
  v_window_started_at timestamptz;
  v_wait_seconds integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'Debes iniciar sesión.';
  end if;

  case p_action
    when 'admin_code_failure' then
      v_limit := 5;
      v_window_seconds := 900;
      v_message := 'Demasiados códigos incorrectos. Espera 15 minutos antes de intentarlo nuevamente.';
    when 'worksheet_upload_url' then
      v_limit := 30;
      v_window_seconds := 600;
      v_message := 'Preparaste demasiadas subidas. Espera unos minutos antes de continuar.';
    when 'worksheet_upload_confirm' then
      v_limit := 30;
      v_window_seconds := 600;
      v_message := 'Confirmaste demasiadas subidas. Espera unos minutos antes de continuar.';
    when 'chat_message' then
      v_limit := 30;
      v_window_seconds := 60;
      v_message := 'Estás enviando mensajes demasiado rápido. Espera un momento antes de continuar.';
    when 'chat_report' then
      v_limit := 3;
      v_window_seconds := 86400;
      v_message := 'Alcanzaste el límite de 3 reportes en 24 horas.';
    else
      raise exception using errcode = 'P0001', message = 'La acción que se intenta limitar no es válida.';
  end case;

  insert into public.action_rate_limits (
    actor_id,
    action_key,
    window_started_at,
    attempt_count,
    updated_at
  )
  values (v_user_id, p_action, now(), 1, now())
  on conflict (actor_id, action_key) do update
  set
    window_started_at = case
      when public.action_rate_limits.window_started_at <= now() - make_interval(secs => v_window_seconds)
        then now()
      else public.action_rate_limits.window_started_at
    end,
    attempt_count = case
      when public.action_rate_limits.window_started_at <= now() - make_interval(secs => v_window_seconds)
        then 1
      else public.action_rate_limits.attempt_count + 1
    end,
    updated_at = now()
  returning attempt_count, window_started_at
  into v_attempt_count, v_window_started_at;

  if v_attempt_count > v_limit then
    v_wait_seconds := greatest(
      1,
      ceil(extract(epoch from (
        v_window_started_at + make_interval(secs => v_window_seconds) - now()
      )))::integer
    );
    raise exception using
      errcode = 'P0001',
      message = v_message,
      detail = format('Intenta nuevamente en %s segundos.', v_wait_seconds);
  end if;
end;
$$;

revoke all on function public.consume_action_rate_limit(text) from public;
grant execute on function public.consume_action_rate_limit(text) to authenticated;

create or replace function public.verify_admin_action_code(p_code text, p_scope text)
returns table(code_id uuid, actor_label text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_code_id uuid;
  v_actor_label text;
begin
  if v_user_id is null or not public.is_admin() then
    return;
  end if;

  if exists (
    select 1
    from public.action_rate_limits limit_row
    where limit_row.actor_id = v_user_id
      and limit_row.action_key = 'admin_code_failure'
      and limit_row.window_started_at > now() - interval '15 minutes'
      and limit_row.attempt_count >= 5
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Demasiados códigos incorrectos. Espera 15 minutos antes de intentarlo nuevamente.';
  end if;

  select codes.id, codes.label
  into v_code_id, v_actor_label
  from public.admin_action_codes codes
  where codes.is_active
    and codes.scope = p_scope
    and codes.code_hash = crypt(p_code, codes.code_hash)
  limit 1;

  if found then
    delete from public.action_rate_limits
    where actor_id = v_user_id
      and action_key = 'admin_code_failure';

    return query select v_code_id, v_actor_label;
    return;
  end if;

  perform public.consume_action_rate_limit('admin_code_failure');
  return;
end;
$$;

revoke all on function public.verify_admin_action_code(text, text) from public;
grant execute on function public.verify_admin_action_code(text, text) to authenticated;

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

  perform public.consume_action_rate_limit('chat_message');

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

  if jsonb_array_length(p_attachments) < 1 then
    raise exception 'Tienes que adjuntar al menos una foto.';
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

  perform public.consume_action_rate_limit('chat_report');

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
