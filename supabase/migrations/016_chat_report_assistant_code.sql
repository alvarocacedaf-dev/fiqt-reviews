-- Registra la etiqueta del código de asistente usado al revisar cada reporte.

alter table public.chat_reports
add column if not exists reviewed_by_label text;

grant update (
  status,
  reviewed_at,
  reviewed_by,
  reviewed_by_label,
  report_type,
  resolution
) on public.chat_reports to authenticated;
