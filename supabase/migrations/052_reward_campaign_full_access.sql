-- Promoción de parciales 2026-2:
-- 1. Quienes completaron aporte + 2 reseñas antes del 12/10 reciben acceso completo.
-- 2. Entre el 12/10 y el 24/10, reciben acceso completo los primeros 50 que lo completen.

create table if not exists public.reward_campaign_full_access (
  campaign_code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('preexisting', 'campaign')),
  qualified_at timestamptz not null,
  granted_at timestamptz not null default now(),
  primary key (campaign_code, user_id)
);

create index if not exists reward_campaign_full_access_campaign_source_idx
  on public.reward_campaign_full_access (campaign_code, source, qualified_at, user_id);

alter table public.reward_campaign_full_access enable row level security;

drop policy if exists "users read own reward campaign access" on public.reward_campaign_full_access;
create policy "users read own reward campaign access"
  on public.reward_campaign_full_access for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Las reseñas no guardaban la fecha de aprobación. Para beneficiarios ya existentes,
-- created_at es la mejor fecha histórica disponible para ordenar la segunda reseña.
with approved_contributions as (
  select
    user_id,
    min(coalesce(reviewed_at, created_at)) as completed_at
  from public.contribution_submissions
  where status = 'approved'
  group by user_id
),
ranked_reviews as (
  select
    user_id,
    created_at,
    row_number() over (partition by user_id order by created_at, id) as review_number
  from public.reviews
  where status = 'approved'
),
qualified_users as (
  select
    contribution.user_id,
    greatest(contribution.completed_at, review.created_at) as qualified_at
  from approved_contributions contribution
  join ranked_reviews review
    on review.user_id = contribution.user_id
   and review.review_number = 2
),
ordered_campaign_users as (
  select
    user_id,
    qualified_at,
    row_number() over (order by qualified_at, user_id) as campaign_position
  from qualified_users
  where qualified_at >= timestamptz '2026-10-12 00:00:00-05'
    and qualified_at < timestamptz '2026-10-25 00:00:00-05'
),
initial_grants as (
  select user_id, qualified_at, 'preexisting'::text as source
  from qualified_users
  where qualified_at < timestamptz '2026-10-12 00:00:00-05'
  union all
  select user_id, qualified_at, 'campaign'::text as source
  from ordered_campaign_users
  where campaign_position <= 50
)
insert into public.reward_campaign_full_access (campaign_code, user_id, source, qualified_at)
select 'parciales-2026-10', user_id, source, qualified_at
from initial_grants
on conflict (campaign_code, user_id) do nothing;

create or replace function public.refresh_reward_campaign_full_access(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_code constant text := 'parciales-2026-10';
  v_start constant timestamptz := timestamptz '2026-10-12 00:00:00-05';
  v_end constant timestamptz := timestamptz '2026-10-25 00:00:00-05';
  v_qualifies boolean;
begin
  if exists (
    select 1 from public.reward_campaign_full_access
    where campaign_code = v_campaign_code and user_id = p_user_id
  ) then
    return true;
  end if;

  select
    exists (
      select 1 from public.contribution_submissions
      where user_id = p_user_id and status = 'approved'
    )
    and (
      select count(*) from public.reviews
      where user_id = p_user_id and status = 'approved'
    ) >= 2
  into v_qualifies;

  if not v_qualifies or now() < v_start or now() >= v_end then
    return false;
  end if;

  -- Evita que dos aprobaciones simultáneas ocupen el puesto 50 a la vez.
  perform pg_advisory_xact_lock(hashtext(v_campaign_code));

  if (
    select count(*) from public.reward_campaign_full_access
    where campaign_code = v_campaign_code and source = 'campaign'
  ) >= 50 then
    return false;
  end if;

  insert into public.reward_campaign_full_access (
    campaign_code, user_id, source, qualified_at
  ) values (
    v_campaign_code, p_user_id, 'campaign', now()
  ) on conflict (campaign_code, user_id) do nothing;

  return exists (
    select 1 from public.reward_campaign_full_access
    where campaign_code = v_campaign_code and user_id = p_user_id
  );
end;
$$;

revoke all on function public.refresh_reward_campaign_full_access(uuid) from public;

create or replace function public.refresh_reward_campaign_access_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and tg_op = 'INSERT' then
    perform public.refresh_reward_campaign_full_access(new.user_id);
  elsif new.status = 'approved' and old.status is distinct from new.status then
    perform public.refresh_reward_campaign_full_access(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_refresh_reward_campaign_access on public.reviews;
create trigger reviews_refresh_reward_campaign_access
after insert or update of status on public.reviews
for each row execute function public.refresh_reward_campaign_access_from_review();

create or replace function public.refresh_reward_campaign_access_from_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and tg_op = 'INSERT' then
    perform public.refresh_reward_campaign_full_access(new.user_id);
  elsif new.status = 'approved' and old.status is distinct from new.status then
    perform public.refresh_reward_campaign_full_access(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists contributions_refresh_reward_campaign_access on public.contribution_submissions;
create trigger contributions_refresh_reward_campaign_access
after insert or update of status on public.contribution_submissions
for each row execute function public.refresh_reward_campaign_access_from_contribution();

create or replace function public.has_reward_campaign_full_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (p_user_id = auth.uid() or public.is_admin())
    and exists (
      select 1
      from public.reward_campaign_full_access
      where campaign_code = 'parciales-2026-10'
        and user_id = p_user_id
    )
$$;

revoke all on function public.has_reward_campaign_full_access(uuid) from public;
grant execute on function public.has_reward_campaign_full_access(uuid) to authenticated;

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
          or (
            select count(*)
            from public.reviews
            where user_id = p_user_id and status = 'approved'
          ) >= 5
        )
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
    when public.is_owner() or public.has_reward_campaign_full_access(v_user_id) or v_reviews >= 18 then 100000
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

comment on table public.reward_campaign_full_access is
  'Beneficiarios con acceso total por la promoción de parciales del 12 al 24 de octubre de 2026.';
