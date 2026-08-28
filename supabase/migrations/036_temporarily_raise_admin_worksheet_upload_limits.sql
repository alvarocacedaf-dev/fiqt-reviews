-- Aumenta temporalmente la capacidad de carga masiva de planchas administrativas.
-- Los materiales de cursos conservan el límite anterior de 20 archivos por 10 minutos.
-- Cuando termine la carga inicial del catálogo, crear una migración posterior que
-- vuelva worksheet_upload_url y worksheet_upload_confirm a 20 intentos.

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
    ('worksheet_upload_url', 100, 600),
    ('worksheet_upload_confirm', 100, 600),
    ('course_material_upload_url', 20, 600),
    ('course_material_upload_confirm', 20, 600),
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
