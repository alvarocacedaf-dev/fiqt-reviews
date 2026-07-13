-- Permite autorizar a un estudiante para reseñar profesores específicos de un curso.
create table if not exists public.verified_course_professors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  professor_id uuid not null references public.professors(id) on delete cascade,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(user_id, course_id, professor_id)
);

alter table public.verified_course_professors enable row level security;

create policy "verified professor own or admin read"
on public.verified_course_professors for select
using (user_id = auth.uid() or public.is_admin());

create policy "verified professor admin manage"
on public.verified_course_professors for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.can_review_professor_course(p_course uuid, p_professor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.verified_course_professors
    where user_id = auth.uid()
      and course_id = p_course
      and professor_id = p_professor
  )
$$;

create or replace function public.enforce_review_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id <> auth.uid() then
    raise exception 'No puedes reseñar por otro usuario';
  end if;
  if not public.can_review_professor_course(new.course_id, new.professor_id) then
    raise exception 'Este profesor y curso todavía no fueron verificados para tu cuenta';
  end if;
  if new.comment ~* '\m(corrupto|corrupta|acosador|acosadora|ladr[oó]n|ladrona|idiota|imb[eé]cil|mierda|puta|maric[oó]n)\M' then
    raise exception 'Tu reseña debe enfocarse en la experiencia académica y mantener un lenguaje respetuoso.';
  end if;
  new.status := 'pending';
  return new;
end;
$$;
