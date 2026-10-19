-- Serializa los envíos por cuenta y evita que dos pestañas o solicitudes
-- concurrentes creen más de una verificación pendiente para el mismo usuario.
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

  -- El bloqueo dura hasta el final de la transacción. Una segunda petición
  -- simultánea espera aquí y luego observa la fila creada por la primera.
  perform pg_advisory_xact_lock(hashtextextended(
    'verification_submission:' || v_user_id::text,
    0
  ));

  if exists (
    select 1
    from public.verification_submissions submission
    where submission.user_id = v_user_id
      and submission.status = 'pending'
  ) then
    raise exception 'Ya tienes una evidencia pendiente de revisión.'
      using errcode = '23505';
  end if;

  perform public.consume_action_rate_limit('verification_submission');
  return new;
end;
$$;

comment on function public.enforce_verification_submission_rate_limit() is
'Valida propiedad y límite diario, y evita verificaciones pendientes duplicadas mediante un advisory lock por usuario.';
