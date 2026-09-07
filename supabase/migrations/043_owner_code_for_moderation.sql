-- El código de propietario (alcance catalog) también puede autorizar tareas de
-- moderación. Los códigos de asistentes siguen sin poder modificar el catálogo.
create or replace function public.verify_admin_action_code(p_code text, p_scope text)
returns table(code_id uuid, actor_label text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_code_id uuid;
  v_actor_label text;
begin
  if v_user_id is null or not public.is_admin() then
    return;
  end if;

  if exists (
    select 1
    from public.action_rate_limits limit_row
    where limit_row.actor_id = v_user_id
      and limit_row.action_key = 'admin_code_failure'
      and limit_row.window_started_at > now() - interval '15 minutes'
      and limit_row.attempt_count >= 5
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Demasiados códigos incorrectos. Espera 15 minutos antes de intentarlo nuevamente.';
  end if;

  select codes.id, codes.label
  into v_code_id, v_actor_label
  from public.admin_action_codes codes
  where codes.is_active
    and (
      codes.scope = p_scope
      or (p_scope = 'moderation' and codes.scope = 'catalog')
    )
    and codes.code_hash = crypt(p_code, codes.code_hash)
  order by case when codes.scope = p_scope then 0 else 1 end
  limit 1;

  if found then
    delete from public.action_rate_limits
    where actor_id = v_user_id
      and action_key = 'admin_code_failure';

    return query select v_code_id, v_actor_label;
    return;
  end if;

  perform public.consume_action_rate_limit('admin_code_failure');
  return;
end;
$$;

revoke all on function public.verify_admin_action_code(text, text) from public;
grant execute on function public.verify_admin_action_code(text, text) to authenticated;
