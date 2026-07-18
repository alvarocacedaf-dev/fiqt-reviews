-- Conserva qué cursos y profesores fueron aprobados a partir de cada evidencia.
create table if not exists public.verification_submission_approvals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.verification_submissions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  professor_id uuid not null references public.professors(id) on delete cascade,
  academic_term text,
  section text,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(submission_id, course_id, professor_id)
);

alter table public.verification_submission_approvals enable row level security;

create policy "submission approvals own or admin read"
on public.verification_submission_approvals for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.verification_submissions submission
    where submission.id = verification_submission_approvals.submission_id
      and submission.user_id = auth.uid()
  )
);

create policy "submission approvals admin manage"
on public.verification_submission_approvals for all
using (public.is_admin())
with check (public.is_admin());

-- El historial puede recuperarse con certeza cuando la cuenta solo tuvo una
-- evidencia aprobada. Si tuvo varias, se deja sin asociar para no inventar datos.
insert into public.verification_submission_approvals (
  submission_id,
  course_id,
  professor_id,
  approved_by,
  created_at
)
select
  submission.id,
  verified.course_id,
  verified.professor_id,
  verified.verified_by,
  verified.created_at
from public.verification_submissions submission
join public.verified_course_professors verified
  on verified.user_id = submission.user_id
where submission.status = 'approved'
  and (
    select count(*)
    from public.verification_submissions candidate
    where candidate.user_id = submission.user_id
      and candidate.status = 'approved'
  ) = 1
on conflict (submission_id, course_id, professor_id) do nothing;
