-- Aprueba o rechaza una evidencia junto con todos sus efectos relacionados.
-- Una llamada RPC se ejecuta dentro de una sola transacción de PostgreSQL:
-- cualquier error revierte cursos, profesores, historial, perfil y solicitud.

create or replace function public.moderate_verification_submission(
  p_submission_id uuid,
  p_status text,
  p_pairs jsonb default '[]'::jsonb,
  p_academic_term text default null,
  p_section text default null,
  p_notes text default null,
  p_action_code text default null
)
returns table(ok boolean, message text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin_id uuid := auth.uid();
  v_user_id uuid;
  v_actor_label text;
  v_pairs jsonb := '[]'::jsonb;
  v_pair_count integer := 0;
  v_catalog_pair_count integer := 0;
  v_academic_term text := nullif(btrim(coalesce(p_academic_term, '')), '');
  v_section text := nullif(btrim(coalesce(p_section, '')), '');
begin
  if v_admin_id is null or not public.is_admin() then
    return query select false, 'No tienes permisos para moderar verificaciones.';
    return;
  end if;

  if p_status is null or p_status not in ('approved', 'rejected') then
    return query select false, 'No se recibió una acción válida para la verificación.';
    return;
  end if;

  if nullif(btrim(coalesce(p_action_code, '')), '') is null then
    return query select false, 'Ingresa el código requerido.';
    return;
  end if;

  select verified.actor_label
  into v_actor_label
  from public.verify_admin_action_code(p_action_code, 'moderation') verified
  limit 1;

  if v_actor_label is null then
    return query select false, 'El código es incorrecto o está desactivado.';
    return;
  end if;

  -- El bloqueo evita que dos asistentes procesen la misma solicitud a la vez.
  select submission.user_id
  into v_user_id
  from public.verification_submissions submission
  where submission.id = p_submission_id
    and submission.status = 'pending'
  for update;

  if v_user_id is null then
    return query select false, 'La solicitud no existe o ya fue procesada.';
    return;
  end if;

  if p_status = 'approved' then
    if jsonb_typeof(coalesce(p_pairs, '[]'::jsonb)) <> 'array' then
      return query select false, 'La selección de cursos y profesores no es válida.';
      return;
    end if;

    -- Convierte UUID, elimina duplicados y conserva una estructura controlada.
    select
      coalesce(jsonb_agg(to_jsonb(selected_pair)), '[]'::jsonb),
      count(*)::integer
    into v_pairs, v_pair_count
    from (
      select distinct raw_pair.course_id, raw_pair.professor_id
      from jsonb_to_recordset(coalesce(p_pairs, '[]'::jsonb))
        as raw_pair(course_id uuid, professor_id uuid)
      where raw_pair.course_id is not null
        and raw_pair.professor_id is not null
    ) selected_pair;

    if v_pair_count = 0 then
      return query select false, 'Selecciona al menos un curso y profesor antes de aprobar.';
      return;
    end if;

    -- No confía en los valores enviados por el navegador: cada relación debe
    -- existir previamente en el catálogo course_professors.
    select count(*)::integer
    into v_catalog_pair_count
    from jsonb_to_recordset(v_pairs) as selected(course_id uuid, professor_id uuid)
    where exists (
      select 1
      from public.course_professors catalog
      where catalog.course_id = selected.course_id
        and catalog.professor_id = selected.professor_id
    );

    if v_catalog_pair_count <> v_pair_count then
      return query select false, 'Una de las relaciones entre curso y profesor ya no existe en el catálogo.';
      return;
    end if;

    insert into public.verified_courses (
      user_id,
      course_id,
      academic_term,
      section,
      verified_by
    )
    select distinct
      v_user_id,
      selected.course_id,
      v_academic_term,
      v_section,
      v_admin_id
    from jsonb_to_recordset(v_pairs) as selected(course_id uuid, professor_id uuid)
    on conflict (user_id, course_id, academic_term, section) do update
    set verified_by = excluded.verified_by;

    insert into public.verified_course_professors (
      user_id,
      course_id,
      professor_id,
      verified_by
    )
    select
      v_user_id,
      selected.course_id,
      selected.professor_id,
      v_admin_id
    from jsonb_to_recordset(v_pairs) as selected(course_id uuid, professor_id uuid)
    on conflict (user_id, course_id, professor_id) do update
    set verified_by = excluded.verified_by;

    insert into public.verification_submission_approvals (
      submission_id,
      course_id,
      professor_id,
      academic_term,
      section,
      approved_by
    )
    select
      p_submission_id,
      selected.course_id,
      selected.professor_id,
      v_academic_term,
      v_section,
      v_admin_id
    from jsonb_to_recordset(v_pairs) as selected(course_id uuid, professor_id uuid)
    on conflict (submission_id, course_id, professor_id) do update
    set
      academic_term = excluded.academic_term,
      section = excluded.section,
      approved_by = excluded.approved_by;

    update public.profiles
    set verification_status = 'verified'
    where id = v_user_id;

    if not found then
      raise exception 'No se encontró el perfil asociado a la solicitud.';
    end if;
  else
    update public.profiles
    set verification_status = 'rejected'
    where id = v_user_id;

    if not found then
      raise exception 'No se encontró el perfil asociado a la solicitud.';
    end if;
  end if;

  update public.verification_submissions
  set
    status = p_status,
    admin_notes = coalesce(p_notes, ''),
    reviewed_at = now(),
    reviewed_by = v_admin_id,
    reviewed_by_label = v_actor_label
  where id = p_submission_id
    and status = 'pending';

  if not found then
    raise exception 'La solicitud dejó de estar pendiente durante la operación.';
  end if;

  return query select
    true,
    case
      when p_status = 'approved' then 'Cursos y profesores aprobados correctamente.'
      else 'Evidencia rechazada.'
    end;
end;
$$;

revoke all on function public.moderate_verification_submission(
  uuid,
  text,
  jsonb,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.moderate_verification_submission(
  uuid,
  text,
  jsonb,
  text,
  text,
  text,
  text
) to authenticated;
