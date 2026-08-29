-- Actualiza las metas de la ruta y permite elegir los cursos de planchas descargables.

create table if not exists public.admin_worksheet_course_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  selected_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.admin_worksheet_course_unlocks enable row level security;

drop policy if exists "worksheet course unlocks own read" on public.admin_worksheet_course_unlocks;
create policy "worksheet course unlocks own read"
on public.admin_worksheet_course_unlocks for select to authenticated
using (user_id = auth.uid() or public.is_admin());

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
      public.is_admin()
      or (
        not public.has_serious_chat_report_block(p_user_id)
        and (
          select count(*) from public.reviews
          where user_id = p_user_id and status = 'approved'
        ) >= 10
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
  v_limit := case when public.is_admin() or v_reviews >= 24 then 100000 when v_reviews >= 15 then 2 when v_reviews >= 6 then 1 else 0 end;

  if p_selected then
    if v_limit = 0 then raise exception 'Necesitas 6 reseñas aprobadas para seleccionar un curso.'; end if;
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

create or replace function public.save_worksheet_preferences(p_have_course_ids uuid[], p_want_course_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión.'; end if;
  if not public.has_worksheet_access(v_user_id) then raise exception 'Necesitas 10 reseñas aprobadas para usar Planchas.'; end if;
  if exists (
    select 1 from unnest(coalesce(p_have_course_ids, array[]::uuid[])) have(course_id)
    join unnest(coalesce(p_want_course_ids, array[]::uuid[])) want(course_id) using (course_id)
  ) then raise exception 'Un curso no puede estar en ambas columnas.'; end if;
  perform public.consume_action_rate_limit('worksheet_preferences');
  delete from public.worksheet_preferences where user_id = v_user_id;
  insert into public.worksheet_preferences(user_id, course_id, preference, updated_at)
  select v_user_id, course_id, 'have', now() from (select distinct course_id from unnest(coalesce(p_have_course_ids, array[]::uuid[])) courses(course_id)) unique_have
  union all
  select v_user_id, course_id, 'want', now() from (select distinct course_id from unnest(coalesce(p_want_course_ids, array[]::uuid[])) courses(course_id)) unique_want;
  perform public.refresh_worksheet_matches(v_user_id);
end;
$$;

revoke all on function public.save_worksheet_preferences(uuid[], uuid[]) from public;
grant execute on function public.save_worksheet_preferences(uuid[], uuid[]) to authenticated;
