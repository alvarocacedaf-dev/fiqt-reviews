-- Advertencias y bloqueo permanente de Planchas por reportes fundados
-- de Acoso o Fraude. La cuenta sancionada siempre es la contraparte
-- del usuario que presentó el reporte.

create or replace function public.get_my_worksheet_sanctions()
returns table (
  report_type text,
  founded_count bigint,
  latest_reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    report.report_type,
    count(*)::bigint as founded_count,
    max(report.reviewed_at) as latest_reviewed_at
  from public.chat_reports report
  join public.chat_threads thread
    on thread.id = report.thread_id
  where auth.uid() is not null
    and thread.kind = 'match'
    and report.status = 'reviewed'
    and report.resolution = 'founded'
    and report.report_type in ('harassment', 'fraud')
    and report.reporter_id <> auth.uid()
    and (
      (
        thread.user_a_id = auth.uid()
        and thread.user_b_id = report.reporter_id
      )
      or
      (
        thread.user_b_id = auth.uid()
        and thread.user_a_id = report.reporter_id
      )
    )
  group by report.report_type
  order by report.report_type
$$;

revoke all on function public.get_my_worksheet_sanctions() from public;
grant execute on function public.get_my_worksheet_sanctions() to authenticated;

create or replace function public.has_serious_chat_report_block(
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p_user_id is null then false
      when p_user_id <> auth.uid() and not public.is_admin() then false
      else exists (
        select 1
        from public.chat_reports report
        join public.chat_threads thread
          on thread.id = report.thread_id
        where thread.kind = 'match'
          and report.status = 'reviewed'
          and report.resolution = 'founded'
          and report.report_type in ('harassment', 'fraud')
          and report.reporter_id <> p_user_id
          and (
            (
              thread.user_a_id = p_user_id
              and thread.user_b_id = report.reporter_id
            )
            or
            (
              thread.user_b_id = p_user_id
              and thread.user_a_id = report.reporter_id
            )
          )
        group by report.report_type
        having count(*) >= 2
      )
    end
$$;

revoke all on function public.has_serious_chat_report_block(uuid) from public;
grant execute on function public.has_serious_chat_report_block(uuid) to authenticated;

-- El rol de administrador conserva acceso. Para las demás cuentas,
-- la sanción prevalece incluso si ya alcanzaron 16 reseñas.
create or replace function public.has_worksheet_access(
  p_user_id uuid default auth.uid()
)
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
          select count(*)
          from public.reviews
          where user_id = p_user_id
            and status = 'approved'
        ) >= 16
      )
    )
$$;

revoke all on function public.has_worksheet_access(uuid) from public;
grant execute on function public.has_worksheet_access(uuid) to authenticated;

-- Las políticas, mensajes, archivos y acciones del chat ya dependen
-- de esta función. Al bloquear Planchas también se impide el acceso
-- directo a conversaciones y adjuntos de esa sección.
create or replace function public.can_access_chat_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_worksheet_access(auth.uid())
    and exists (
      select 1
      from public.chat_threads thread
      where thread.id = p_thread_id
        and (
          (
            thread.kind = 'support'
            and (
              thread.support_user_id = auth.uid()
              or public.is_admin()
            )
          )
          or
          (
            thread.kind = 'match'
            and auth.uid() in (thread.user_a_id, thread.user_b_id)
          )
        )
    )
$$;

revoke all on function public.can_access_chat_thread(uuid) from public;
grant execute on function public.can_access_chat_thread(uuid) to authenticated;
