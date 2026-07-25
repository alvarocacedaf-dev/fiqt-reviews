-- Biblioteca privada de planchas administradas por FIQT Reviews.
-- En este contexto, una plancha es un examen anterior de un curso.

create table if not exists public.admin_worksheets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  exam_type text not null default 'other'
    check (exam_type in ('practice', 'midterm', 'final', 'quiz', 'other')),
  academic_term text,
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint not null check (file_size between 1 and 26214400),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists admin_worksheets_course_created_idx
on public.admin_worksheets (course_id, created_at desc);

alter table public.admin_worksheets enable row level security;

drop policy if exists "admin worksheets admin read"
on public.admin_worksheets;
create policy "admin worksheets admin read"
on public.admin_worksheets
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin worksheets admin insert"
on public.admin_worksheets;
create policy "admin worksheets admin insert"
on public.admin_worksheets
for insert
to authenticated
with check (
  public.is_admin()
  and uploaded_by = auth.uid()
);

drop policy if exists "admin worksheets admin delete"
on public.admin_worksheets;
create policy "admin worksheets admin delete"
on public.admin_worksheets
for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'admin-worksheets',
  'admin-worksheets',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin worksheets storage read"
on storage.objects;
create policy "admin worksheets storage read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'admin-worksheets'
  and public.is_admin()
);

drop policy if exists "admin worksheets storage upload"
on storage.objects;
create policy "admin worksheets storage upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'admin-worksheets'
  and public.is_admin()
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "admin worksheets storage delete"
on storage.objects;
create policy "admin worksheets storage delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'admin-worksheets'
  and public.is_admin()
);
