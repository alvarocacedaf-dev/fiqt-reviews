-- Exige al menos una evidencia fotográfica en cada reporte de chat.

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
