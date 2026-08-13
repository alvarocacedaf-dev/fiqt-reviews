-- Segunda etapa de protección contra abuso.
-- Amplía los límites autenticados y añade límites anónimos para autenticación.

create or replace function public.consume_action_rate_limit(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer;
  v_count integer;
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select limits.max_attempts, limits.window_seconds
  into v_limit, v_window_seconds
  from (values
    ('admin_code_failure', 5, 900),
    ('worksheet_upload_url', 20, 600),
    ('worksheet_upload_confirm', 20, 600),
    ('chat_message', 20, 60),
    ('chat_report', 3, 86400),
    ('verification_submission', 5, 86400),
    ('worksheet_preferences', 10, 600)
  ) as limits(action_key, max_attempts, window_seconds)
  where limits.action_key = p_action;

  if v_limit is null then
    raise exception 'Acción de límite desconocida.';
  end if;

  insert into public.action_rate_limits as rate (
    actor_id,
    action_key,
    window_started_at,
    attempt_count,
    updated_at
  )
  values (v_actor_id, p_action, now(), 1, now())
  on conflict (actor_id, action_key) do update
  set
    window_started_at = case
      when rate.window_started_at <= now() - make_interval(secs => v_window_seconds)
        then now()
      else rate.window_started_at
    end,
    attempt_count = case
      when rate.window_started_at <= now() - make_interval(secs => v_window_seconds)
        then 1
      else rate.attempt_count + 1
    end,
    updated_at = now()
  returning attempt_count into v_count;

  if v_count > v_limit then
    raise exception 'Has realizado demasiados intentos. Espera un momento antes de volver a intentarlo.';
  end if;
end;
$$;

revoke all on function public.consume_action_rate_limit(text) from public;
grant execute on function public.consume_action_rate_limit(text) to authenticated;

create table if not exists public.anonymous_action_rate_limits (
  action_key text not null,
  subject_hash text not null,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (action_key, subject_hash)
);

alter table public.anonymous_action_rate_limits enable row level security;
revoke all on table public.anonymous_action_rate_limits from public, anon, authenticated;

create or replace function public.anonymous_rate_limit_settings(
  p_action text,
  out max_attempts integer,
  out window_seconds integer
)
returns record
language plpgsql
immutable
set search_path = public
as $$
begin
  select settings.allowed, settings.seconds
  into max_attempts, window_seconds
  from (values
    ('registration', 3, 3600),
    ('password_recovery', 3, 3600),
    ('login_failure', 10, 900)
  ) as settings(action_key, allowed, seconds)
  where settings.action_key = p_action;

  if max_attempts is null then
    raise exception 'Acción de límite anónimo desconocida.';
  end if;
end;
$$;

create or replace function public.assert_anonymous_action_rate_limit(
  p_action text,
  p_subject_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_window_seconds integer;
  v_row public.anonymous_action_rate_limits%rowtype;
begin
  select max_attempts, window_seconds
  into v_limit, v_window_seconds
  from public.anonymous_rate_limit_settings(p_action);

  select * into v_row
  from public.anonymous_action_rate_limits
  where action_key = p_action and subject_hash = p_subject_hash;

  if found
     and v_row.window_started_at > now() - make_interval(secs => v_window_seconds)
     and v_row.attempt_count >= v_limit then
    raise exception 'Has realizado demasiados intentos. Espera antes de volver a intentarlo.';
  end if;
end;
$$;

create or replace function public.consume_anonymous_action_rate_limit(
  p_action text,
  p_subject_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_window_seconds integer;
  v_count integer;
begin
  select max_attempts, window_seconds
  into v_limit, v_window_seconds
  from public.anonymous_rate_limit_settings(p_action);

  insert into public.anonymous_action_rate_limits as rate (
    action_key, subject_hash, window_started_at, attempt_count, updated_at
  )
  values (p_action, p_subject_hash, now(), 1, now())
  on conflict (action_key, subject_hash) do update
  set
    window_started_at = case
      when rate.window_started_at <= now() - make_interval(secs => v_window_seconds)
        then now()
      else rate.window_started_at
    end,
    attempt_count = case
      when rate.window_started_at <= now() - make_interval(secs => v_window_seconds)
        then 1
      else rate.attempt_count + 1
    end,
    updated_at = now()
  returning attempt_count into v_count;

  if v_count > v_limit then
    raise exception 'Has realizado demasiados intentos. Espera antes de volver a intentarlo.';
  end if;
end;
$$;

create or replace function public.clear_anonymous_action_rate_limit(
  p_action text,
  p_subject_hash text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.anonymous_action_rate_limits
  where action_key = p_action and subject_hash = p_subject_hash;
$$;

revoke all on function public.anonymous_rate_limit_settings(text) from public;
revoke all on function public.assert_anonymous_action_rate_limit(text, text) from public;
revoke all on function public.consume_anonymous_action_rate_limit(text, text) from public;
revoke all on function public.clear_anonymous_action_rate_limit(text, text) from public;
grant execute on function public.assert_anonymous_action_rate_limit(text, text) to service_role;
grant execute on function public.consume_anonymous_action_rate_limit(text, text) to service_role;
grant execute on function public.clear_anonymous_action_rate_limit(text, text) to service_role;

create or replace function public.enforce_verification_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if v_user_id is null then
    if v_role = 'service_role' then
      return new;
    end if;
    raise exception 'Debes iniciar sesión.';
  end if;

  if new.user_id <> v_user_id then
    raise exception 'No puedes enviar evidencias para otra cuenta.';
  end if;

  perform public.consume_action_rate_limit('verification_submission');
  return new;
end;
$$;

drop trigger if exists verification_submission_rate_limit
on public.verification_submissions;

create trigger verification_submission_rate_limit
before insert on public.verification_submissions
for each row execute function public.enforce_verification_submission_rate_limit();

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
    raise exception 'Necesitas 16 reseñas aprobadas para usar Planchas.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_have_course_ids, array[]::uuid[])) as have(course_id)
    join unnest(coalesce(p_want_course_ids, array[]::uuid[])) as want(course_id)
      on want.course_id = have.course_id
  ) then
    raise exception 'Un curso no puede estar en ambas columnas.';
  end if;

  perform public.consume_action_rate_limit('worksheet_preferences');

  delete from public.worksheet_preferences where user_id = v_user_id;

  insert into public.worksheet_preferences (user_id, course_id, preference, updated_at)
  select v_user_id, course_id, 'have', now()
  from (
    select distinct course_id
    from unnest(coalesce(p_have_course_ids, array[]::uuid[])) as courses(course_id)
  ) as unique_have
  union all
  select v_user_id, course_id, 'want', now()
  from (
    select distinct course_id
    from unnest(coalesce(p_want_course_ids, array[]::uuid[])) as courses(course_id)
  ) as unique_want;

  -- El límite de guardado también limita la creación automática de matches
  -- y de sus notificaciones, porque ambas nacen de esta operación.
  perform public.refresh_worksheet_matches(v_user_id);
end;
$$;

revoke all on function public.save_worksheet_preferences(uuid[], uuid[]) from public;
grant execute on function public.save_worksheet_preferences(uuid[], uuid[]) to authenticated;
