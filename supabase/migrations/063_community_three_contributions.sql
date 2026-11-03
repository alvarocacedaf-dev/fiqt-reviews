-- Comunidad: dos reseñas y tres contribuciones totales.
begin;
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
          public.has_reward_campaign_full_access(p_user_id)
          or ((select count(*) from public.reviews where user_id = p_user_id and status = 'approved') >= 2
          and (
            (select count(*) from public.reviews where user_id = p_user_id and status = 'approved')
            + (select count(*) from public.worksheet_donations where user_id = p_user_id and status = 'approved')
          ) >= 3)
        )
      )
    )
$$;

create or replace function public.save_worksheet_preferences(p_have_course_ids uuid[], p_want_course_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión.'; end if;
  if not public.has_worksheet_access(v_user_id) then raise exception 'Necesitas 3 contribuciones aprobadas, incluidas al menos 2 reseñas para usar Planchas.'; end if;
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

commit;
