-- Evidencias privadas para iniciar la ruta de recompensas.
create table if not exists public.contribution_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_path text not null,
  amount numeric(6,2) not null default 1.50 check (amount = 1.50),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contribution_submissions_user_created_idx
  on public.contribution_submissions (user_id, created_at desc);

create unique index if not exists contribution_submissions_one_pending_per_user_idx
  on public.contribution_submissions (user_id)
  where status = 'pending';

create unique index if not exists contribution_submissions_one_approved_per_user_idx
  on public.contribution_submissions (user_id)
  where status = 'approved';

alter table public.contribution_submissions enable row level security;

drop policy if exists "users read own contributions" on public.contribution_submissions;
create policy "users read own contributions"
  on public.contribution_submissions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users submit own contributions" on public.contribution_submissions;
create policy "users submit own contributions"
  on public.contribution_submissions for insert
  to authenticated
  with check (user_id = auth.uid() and amount = 1.50 and status = 'pending' and reviewed_by is null and reviewed_at is null);

drop policy if exists "admins moderate contributions" on public.contribution_submissions;
create policy "admins moderate contributions"
  on public.contribution_submissions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contribution-evidence',
  'contribution-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own contribution evidence" on storage.objects;
create policy "users upload own contribution evidence"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'contribution-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users and admins read contribution evidence" on storage.objects;
create policy "users and admins read contribution evidence"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'contribution-evidence'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

comment on table public.contribution_submissions is
  'Comprobantes privados enviados para iniciar la ruta de recompensas.';
