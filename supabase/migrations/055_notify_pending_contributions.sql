-- Permite registrar de forma idempotente los avisos de nuevos comprobantes Yape.

alter table public.admin_notification_deliveries
  drop constraint if exists admin_notification_deliveries_event_type_check;

alter table public.admin_notification_deliveries
  add constraint admin_notification_deliveries_event_type_check
  check (event_type in ('review_pending', 'verification_pending', 'contribution_pending'));
