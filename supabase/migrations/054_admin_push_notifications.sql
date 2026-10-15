-- Suscripciones Web Push de administradores y registro idempotente de avisos.

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_active_idx
  on public.admin_push_subscriptions (enabled, user_id);

create table if not exists public.admin_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('review_pending', 'verification_pending')),
  event_id uuid not null,
  channel text not null check (channel in ('push', 'email')),
  recipient_key text not null,
  status text not null check (status in ('sending', 'sent', 'failed')),
  provider_id text,
  last_error text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (event_type, event_id, channel, recipient_key)
);

alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_notification_deliveries enable row level security;

drop policy if exists "admins manage own push subscriptions" on public.admin_push_subscriptions;
create policy "admins manage own push subscriptions"
  on public.admin_push_subscriptions for all
  to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

drop policy if exists "admins read notification deliveries" on public.admin_notification_deliveries;
create policy "admins read notification deliveries"
  on public.admin_notification_deliveries for select
  to authenticated
  using (public.is_admin());

comment on table public.admin_push_subscriptions is
  'Dispositivos PWA autorizados por administradores para recibir avisos Web Push.';
comment on table public.admin_notification_deliveries is
  'Idempotencia y auditoría de avisos administrativos por evento y destinatario.';
