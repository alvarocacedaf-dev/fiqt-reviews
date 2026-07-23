-- Preferencias para el intercambio de planchas.
-- El acceso se concede únicamente a cuentas con 18 o más reseñas aprobadas.
create table if not exists public.worksheet_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  preference text not null check (preference in ('have', 'want')),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.worksheet_preferences enable row level security;

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
        select count(*)
        from public.reviews
        where user_id = p_user_id
          and status = 'approved'
      ) >= 18
    )
$$;

revoke all on function public.has_worksheet_access(uuid) from public;
grant execute on function public.has_worksheet_access(uuid) to authenticated;

drop policy if exists "worksheet preferences own read" on public.worksheet_preferences;
create policy "worksheet preferences own read"
on public.worksheet_preferences
for select
to authenticated
using (
  user_id = auth.uid()
  and public.has_worksheet_access(auth.uid())
);

create or replace function public.save_worksheet_preferences(
  p_have_course_ids uuid[],
  p_want_course_ids uuid[]
)
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

  if not public.has_worksheet_access(v_user_id) then
    raise exception 'Necesitas 18 reseñas aprobadas para usar Planchas.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_have_course_ids, array[]::uuid[])) as have(course_id)
    join unnest(coalesce(p_want_course_ids, array[]::uuid[])) as want(course_id)
      on want.course_id = have.course_id
  ) then
    raise exception 'Un curso no puede estar en ambas columnas.';
  end if;

  delete from public.worksheet_preferences
  where user_id = v_user_id;

  insert into public.worksheet_preferences (user_id, course_id, preference, updated_at)
  select v_user_id, course_id, 'have', now()
  from (
    select distinct course_id
    from unnest(coalesce(p_have_course_ids, array[]::uuid[])) as selected(course_id)
  ) as unique_have
  union all
  select v_user_id, course_id, 'want', now()
  from (
    select distinct course_id
    from unnest(coalesce(p_want_course_ids, array[]::uuid[])) as selected(course_id)
  ) as unique_want;
end;
$$;

revoke all on function public.save_worksheet_preferences(uuid[], uuid[]) from public;
grant execute on function public.save_worksheet_preferences(uuid[], uuid[]) to authenticated;
