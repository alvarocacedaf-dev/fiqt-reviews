-- Clasificación y conclusión administrativa de los reportes de chats.

alter table public.chat_reports
add column if not exists report_type text;

alter table public.chat_reports
add column if not exists resolution text;

alter table public.chat_reports
drop constraint if exists chat_reports_report_type_check;

alter table public.chat_reports
add constraint chat_reports_report_type_check
check (report_type is null or report_type in ('harassment', 'fraud', 'other'));

alter table public.chat_reports
drop constraint if exists chat_reports_resolution_check;

alter table public.chat_reports
add constraint chat_reports_resolution_check
check (resolution is null or resolution in ('founded', 'unfounded'));

grant update (
  status,
  reviewed_at,
  reviewed_by,
  report_type,
  resolution
) on public.chat_reports to authenticated;
