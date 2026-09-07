-- Donaciones de planchas enviadas por estudiantes y moderadas antes de publicarse.
create table if not exists public.worksheet_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  exam_type text not null check (exam_type in ('practice', 'midterm', 'final', 'substitute', 'quiz', 'other')),
  academic_term text,
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint not null check (file_size between 1 and 104857600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists worksheet_donations_status_created_idx
on public.worksheet_donations (status, created_at);

create index if not exists worksheet_donations_user_status_idx
on public.worksheet_donations (user_id, status);

alter table public.worksheet_donations enable row level security;

drop policy if exists "worksheet donations own read" on public.worksheet_donations;
create policy "worksheet donations own read" on public.worksheet_donations
for select to authenticated using (user_id = auth.uid());

drop policy if exists "worksheet donations admin read" on public.worksheet_donations;
create policy "worksheet donations admin read" on public.worksheet_donations
for select to authenticated using (public.is_admin());

drop policy if exists "worksheet donations admin update" on public.worksheet_donations;
create policy "worksheet donations admin update" on public.worksheet_donations
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.moderate_worksheet_donation(
  p_donation_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donation public.worksheet_donations%rowtype;
begin
  if not public.is_admin() then
    raise exception 'No tienes permisos de administrador.';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Estado de moderación no válido.';
  end if;

  select * into v_donation
  from public.worksheet_donations
  where id = p_donation_id and status = 'pending'
  for update;
  if not found then
    raise exception 'La donación ya fue revisada o no existe.';
  end if;

  if p_status = 'approved' then
    insert into public.admin_worksheets (
      course_id, title, exam_type, academic_term, file_path, file_name,
      mime_type, file_size, uploaded_by, storage_provider
    ) values (
      v_donation.course_id, v_donation.title, v_donation.exam_type,
      v_donation.academic_term, v_donation.file_path, v_donation.file_name,
      v_donation.mime_type, v_donation.file_size, v_donation.user_id, 'r2'
    );
  end if;

  update public.worksheet_donations
  set status = p_status,
      moderation_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_donation_id;
end;
$$;

revoke all on function public.moderate_worksheet_donation(uuid, text, text) from public;
grant execute on function public.moderate_worksheet_donation(uuid, text, text) to authenticated;
