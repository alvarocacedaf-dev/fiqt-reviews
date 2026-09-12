-- Separa al propietario de los administradores delegados.
-- owner: control total y excepciones de la ruta de recompensas.
-- admin: moderación y carga de contenido, sin beneficios automáticos.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'admin', 'owner'));

-- Esta es la única cuenta que conserva el acceso total de propietario.
update public.profiles as profile
set role = 'owner'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = 'alvaro.caceda.f@uni.pe';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
  )
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  )
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create or replace function public.has_worksheet_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id = auth.uid()
    and (
      public.is_owner()
      or (
        not public.has_serious_chat_report_block(p_user_id)
        and (
          select count(*)
          from public.reviews
          where user_id = p_user_id and status = 'approved'
        ) >= 5
      )
    )
$$;

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
  v_limit := case
    when public.is_owner() or v_reviews >= 18 then 100000
    when v_reviews >= 10 then 2
    when v_reviews >= 7 then 1
    else 0
  end;

  if p_selected then
    if v_limit = 0 then raise exception 'Necesitas 7 reseñas aprobadas para seleccionar un curso.'; end if;
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

create or replace function public.create_support_chat_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role not in ('admin', 'owner') then
    insert into public.chat_threads (kind, support_user_id, status)
    values ('support', new.id, 'available')
    on conflict (support_user_id) where kind = 'support'
    do nothing;
  end if;

  return new;
end;
$$;
