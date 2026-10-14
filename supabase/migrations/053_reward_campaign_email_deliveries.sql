-- Registro idempotente de los correos enviados por la campaña de parciales.

create table if not exists public.reward_campaign_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  status text not null check (status in ('sending', 'sent', 'failed')),
  resend_email_id text,
  last_error text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (campaign_code, user_id, event_key)
);

create index if not exists reward_campaign_email_deliveries_status_idx
  on public.reward_campaign_email_deliveries (campaign_code, event_key, status);

alter table public.reward_campaign_email_deliveries enable row level security;

drop policy if exists "admins read reward campaign email deliveries"
  on public.reward_campaign_email_deliveries;
create policy "admins read reward campaign email deliveries"
  on public.reward_campaign_email_deliveries for select
  to authenticated
  using (public.is_admin());

comment on table public.reward_campaign_email_deliveries is
  'Auditoría e idempotencia de avisos enviados a beneficiarios de campañas de recompensas.';
