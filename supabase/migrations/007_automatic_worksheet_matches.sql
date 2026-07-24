-- Matches recíprocos directos de Planchas.
-- A tiene un curso que B quiere y B tiene un curso que A quiere.
create table if not exists public.worksheet_matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  user_a_gives_course_id uuid not null references public.courses(id) on delete cascade,
  user_b_gives_course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invalidated')),
  detected_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  invalidated_at timestamptz,
  constraint worksheet_matches_different_users check (user_a_id <> user_b_id),
  constraint worksheet_matches_canonical_users check (user_a_id < user_b_id),
  constraint worksheet_matches_unique_exchange unique (
    user_a_id,
    user_b_id,
    user_a_gives_course_id,
    user_b_gives_course_id
  )
);

create index if not exists worksheet_matches_user_a_idx
on public.worksheet_matches (user_a_id);

create index if not exists worksheet_matches_user_b_idx
on public.worksheet_matches (user_b_id);

create index if not exists worksheet_matches_status_detected_idx
on public.worksheet_matches (status, detected_at desc);

alter table public.worksheet_matches enable row level security;

drop policy if exists "worksheet matches admin read"
on public.worksheet_matches;

create policy "worksheet matches admin read"
on public.worksheet_matches
for select
to authenticated
using (public.is_admin());

-- Recalcula solamente los matches relacionados con la cuenta que acaba de guardar.
create or replace function public.refresh_worksheet_matches(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Conserva el historial, pero marca como inválidos los intercambios que
  -- dejaron de coincidir después de cambiar las selecciones.
  update public.worksheet_matches match
  set
    status = 'invalidated',
    invalidated_at = now(),
    last_confirmed_at = now()
  where match.status = 'active'
    and (match.user_a_id = p_user_id or match.user_b_id = p_user_id)
    and not (
      exists (
        select 1
        from public.worksheet_preferences preference
        where preference.user_id = match.user_a_id
          and preference.course_id = match.user_a_gives_course_id
          and preference.preference = 'have'
      )
      and exists (
        select 1
        from public.worksheet_preferences preference
        where preference.user_id = match.user_b_id
          and preference.course_id = match.user_a_gives_course_id
          and preference.preference = 'want'
      )
      and exists (
        select 1
        from public.worksheet_preferences preference
        where preference.user_id = match.user_a_id
          and preference.course_id = match.user_b_gives_course_id
          and preference.preference = 'want'
      )
      and exists (
        select 1
        from public.worksheet_preferences preference
        where preference.user_id = match.user_b_id
          and preference.course_id = match.user_b_gives_course_id
          and preference.preference = 'have'
      )
    );

  -- Encuentra todos los matches recíprocos directos de la cuenta.
  -- user_a siempre es el UUID menor para que A↔B y B↔A sean el mismo match.
  insert into public.worksheet_matches (
    user_a_id,
    user_b_id,
    user_a_gives_course_id,
    user_b_gives_course_id,
    status,
    detected_at,
    last_confirmed_at,
    invalidated_at
  )
  select distinct
    a_have.user_id,
    b_want.user_id,
    a_have.course_id,
    b_have.course_id,
    'active',
    now(),
    now(),
    null::timestamptz
  from public.worksheet_preferences a_have
  join public.worksheet_preferences b_want
    on b_want.course_id = a_have.course_id
   and b_want.preference = 'want'
   and b_want.user_id <> a_have.user_id
  join public.worksheet_preferences a_want
    on a_want.user_id = a_have.user_id
   and a_want.preference = 'want'
  join public.worksheet_preferences b_have
    on b_have.user_id = b_want.user_id
   and b_have.course_id = a_want.course_id
   and b_have.preference = 'have'
  where a_have.preference = 'have'
    and a_have.user_id < b_want.user_id
    and (a_have.user_id = p_user_id or b_want.user_id = p_user_id)
  on conflict (
    user_a_id,
    user_b_id,
    user_a_gives_course_id,
    user_b_gives_course_id
  )
  do update set
    status = 'active',
    last_confirmed_at = now(),
    invalidated_at = null;
end;
$$;

revoke all on function public.refresh_worksheet_matches(uuid) from public;

-- Sustituye el guardado anterior para ejecutar el cálculo en la misma transacción.
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

  perform public.refresh_worksheet_matches(v_user_id);
end;
$$;

revoke all on function public.save_worksheet_preferences(uuid[], uuid[]) from public;
grant execute on function public.save_worksheet_preferences(uuid[], uuid[]) to authenticated;

-- Detecta también coincidencias entre preferencias guardadas antes de esta migración.
insert into public.worksheet_matches (
  user_a_id,
  user_b_id,
  user_a_gives_course_id,
  user_b_gives_course_id,
  status,
  detected_at,
  last_confirmed_at,
  invalidated_at
)
select distinct
  a_have.user_id,
  b_want.user_id,
  a_have.course_id,
  b_have.course_id,
  'active',
  now(),
  now(),
  null::timestamptz
from public.worksheet_preferences a_have
join public.worksheet_preferences b_want
  on b_want.course_id = a_have.course_id
 and b_want.preference = 'want'
 and b_want.user_id <> a_have.user_id
join public.worksheet_preferences a_want
  on a_want.user_id = a_have.user_id
 and a_want.preference = 'want'
join public.worksheet_preferences b_have
  on b_have.user_id = b_want.user_id
 and b_have.course_id = a_want.course_id
 and b_have.preference = 'have'
where a_have.preference = 'have'
  and a_have.user_id < b_want.user_id
on conflict (
  user_a_id,
  user_b_id,
  user_a_gives_course_id,
  user_b_gives_course_id
)
do update set
  status = 'active',
  last_confirmed_at = now(),
  invalidated_at = null;
