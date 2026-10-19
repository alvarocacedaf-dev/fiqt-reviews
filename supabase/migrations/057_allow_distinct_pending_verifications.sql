-- Permite varias evidencias pendientes por cuenta, pero impide que el mismo
-- contenido se registre dos veces mientras siga pendiente de revisión.
alter table public.verification_submissions
  add column if not exists content_hash text;

alter table public.verification_submissions
  drop constraint if exists verification_submissions_content_hash_format;

alter table public.verification_submissions
  add constraint verification_submissions_content_hash_format
  check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$');

create unique index if not exists verification_submissions_pending_content_hash_idx
on public.verification_submissions (user_id, content_hash)
where status = 'pending' and content_hash is not null;

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

comment on function public.enforce_verification_submission_rate_limit() is
'Valida propiedad y límite diario; el índice parcial evita repetir el mismo archivo mientras esté pendiente.';
