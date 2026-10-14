insert into public.professors (full_name, source_name, is_active)
select 'Aliaga Paz, Micaela', 'Boleta de matrícula UNI', true
where not exists (
  select 1
  from public.professors
  where lower(regexp_replace(full_name, '[,[:space:]]+', ' ', 'g')) in (
    'aliaga paz micaela',
    'micaela aliaga paz'
  )
);

insert into public.course_professors (
  course_id,
  professor_id,
  academic_term,
  section
)
select
  course.id,
  professor.id,
  '2026-1',
  'A'
from public.courses course
cross join public.professors professor
where course.code = 'BMA04'
  and lower(regexp_replace(professor.full_name, '[,[:space:]]+', ' ', 'g')) in (
    'aliaga paz micaela',
    'micaela aliaga paz'
  )
  and not exists (
    select 1
    from public.course_professors link
    where link.course_id = course.id
      and link.professor_id = professor.id
  );
