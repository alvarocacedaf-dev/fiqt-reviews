-- Las planchas suman desde el paso 2 (dos reseñas aprobadas).
begin;
create or replace function public.set_admin_worksheet_course_unlock(
  p_course_id uuid,
  p_selected boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reviews integer;
  v_limit integer;
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión.'; end if;
  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'El curso seleccionado no existe.';
  end if;

  select count(*) into v_reviews
  from public.reviews where user_id = v_user_id and status = 'approved';
  -- Las planchas aprobadas suman después de alcanzar dos reseñas aprobadas.
  if v_reviews >= 2 then
    v_reviews := v_reviews + (select count(*) from public.worksheet_donations where user_id = v_user_id and status = 'approved');
  end if;
  v_limit := case
    when public.is_owner() or public.has_reward_campaign_full_access(v_user_id) or v_reviews >= 10 then 100000
    when v_reviews >= 8 then 2
    else 0
  end;

  -- Conserva las elecciones anteriores; repetir una selección existente es inocuo.
  if p_selected and exists (
    select 1 from public.admin_worksheet_course_unlocks
    where user_id = v_user_id and course_id = p_course_id
  ) then return; end if;

  if p_selected then
    if v_limit = 0 then raise exception 'Necesitas 8 contribuciones aprobadas para seleccionar un curso.'; end if;
    if not exists (
      select 1 from public.admin_worksheet_course_unlocks
      where user_id = v_user_id and course_id = p_course_id
    ) and (
      select count(*) from public.admin_worksheet_course_unlocks where user_id = v_user_id
    ) >= v_limit then
      raise exception 'Ya utilizaste todos los cursos disponibles para tu nivel actual.';
    end if;
    insert into public.admin_worksheet_course_unlocks(user_id, course_id)
    values (v_user_id, p_course_id) on conflict do nothing;
  else
    raise exception 'La elección de un curso es permanente.';
  end if;
end;
$$;

revoke all on function public.set_admin_worksheet_course_unlock(uuid, boolean) from public;
grant execute on function public.set_admin_worksheet_course_unlock(uuid, boolean) to authenticated;
commit;
