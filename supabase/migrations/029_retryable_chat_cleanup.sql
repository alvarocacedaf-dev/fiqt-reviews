-- Limpieza de chats en dos fases: retiro transaccional de la base y borrado reintentable de Storage.

create table if not exists public.chat_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null unique,
  status text not null default 'pending' check (status in ('pending', 'failed', 'completed')),
  chat_attachment_paths text[] not null default '{}',
  report_attachment_paths text[] not null default '{}',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  marked_at timestamptz not null default now(),
  database_deleted_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists chat_cleanup_jobs_retry_idx
on public.chat_cleanup_jobs (status, updated_at)
where status in ('pending', 'failed');

alter table public.chat_cleanup_jobs enable row level security;

drop policy if exists "chat cleanup jobs admin read" on public.chat_cleanup_jobs;
create policy "chat cleanup jobs admin read"
on public.chat_cleanup_jobs
for select
to authenticated
using (public.is_admin());

revoke all on public.chat_cleanup_jobs from public, anon, authenticated;
grant select on public.chat_cleanup_jobs to authenticated;
grant all on public.chat_cleanup_jobs to service_role;

create or replace function public.prepare_chat_cleanup(
  p_chat_retention_days integer default 14,
  p_report_retention_days integer default 30,
  p_limit integer default 100
)
returns setof public.chat_cleanup_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread record;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'No autorizado.';
  end if;

  if p_chat_retention_days < 1 or p_report_retention_days < 1 or p_limit not between 1 and 500 then
    raise exception 'Parámetros de retención inválidos.';
  end if;

  for v_thread in
    select thread.id
    from public.chat_threads thread
    where thread.status = 'ended'
      and thread.ended_at <= now() - make_interval(days => p_chat_retention_days)
      and not exists (
        select 1
        from public.chat_reports report
        where report.thread_id = thread.id
          and (
            report.reviewed_at is null
            or report.reviewed_at > now() - make_interval(days => p_report_retention_days)
          )
      )
    order by thread.ended_at
    for update skip locked
    limit p_limit
  loop
    insert into public.chat_cleanup_jobs (
      thread_id,
      chat_attachment_paths,
      report_attachment_paths
    )
    values (
      v_thread.id,
      array(
        select path
        from (
          select message.attachment_path as path
          from public.chat_messages message
          where message.thread_id = v_thread.id and message.attachment_path is not null
          union
          select exchange_file.file_path as path
          from public.chat_exchange_files exchange_file
          where exchange_file.thread_id = v_thread.id
        ) paths
      ),
      array(
        select attachment.storage_path
        from public.chat_report_attachments attachment
        join public.chat_reports report on report.id = attachment.report_id
        where report.thread_id = v_thread.id
      )
    )
    on conflict (thread_id) do nothing;

    -- El trabajo y la eliminación pertenecen a la misma transacción.
    delete from public.chat_threads where id = v_thread.id;
  end loop;

  return query
  select job.*
  from public.chat_cleanup_jobs job
  where job.status in ('pending', 'failed')
  order by job.updated_at
  limit p_limit;
end;
$$;

revoke all on function public.prepare_chat_cleanup(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.prepare_chat_cleanup(integer, integer, integer) to service_role;

create or replace function public.admin_chat_cleanup_status()
returns table (
  pending_jobs bigint,
  failed_jobs bigint,
  completed_jobs bigint,
  last_activity_at timestamptz,
  last_error text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select
    count(*) filter (where job.status = 'pending')::bigint,
    count(*) filter (where job.status = 'failed')::bigint,
    count(*) filter (where job.status = 'completed')::bigint,
    max(job.updated_at),
    (array_agg(job.last_error order by job.updated_at desc)
      filter (where job.last_error is not null))[1]
  from public.chat_cleanup_jobs job;
end;
$$;

revoke all on function public.admin_chat_cleanup_status() from public;
grant execute on function public.admin_chat_cleanup_status() to authenticated;
