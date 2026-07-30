-- Retira BIE01 del catálogo de cursos.
-- Se bloquea la operación si todavía existen planchas administrativas para
-- evitar dejar archivos huérfanos en Supabase Storage.

do $$
declare
  v_course_id uuid;
begin
  select course.id
  into v_course_id
  from public.courses course
  where upper(trim(course.code)) = 'BIE01'
  limit 1;

  if v_course_id is null then
    raise notice 'El curso BIE01 ya no existe; no se realizó ningún cambio.';
    return;
  end if;

  if exists (
    select 1
    from public.admin_worksheets worksheet
    where worksheet.course_id = v_course_id
  ) then
    raise exception
      'BIE01 tiene planchas administrativas. Elimínalas desde el panel antes de retirar el curso.';
  end if;

  -- Estas dos relaciones no tienen ON DELETE CASCADE en el esquema inicial.
  delete from public.reviews
  where course_id = v_course_id;

  delete from public.verified_courses
  where course_id = v_course_id;

  -- Las demás relaciones del curso se eliminan mediante ON DELETE CASCADE.
  delete from public.courses
  where id = v_course_id;
end
$$;
