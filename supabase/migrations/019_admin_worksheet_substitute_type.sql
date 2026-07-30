-- Añade la carpeta específica para exámenes sustitutorios.

alter table public.admin_worksheets
drop constraint if exists admin_worksheets_exam_type_check;

alter table public.admin_worksheets
add constraint admin_worksheets_exam_type_check
check (
  exam_type in (
    'practice',
    'midterm',
    'final',
    'substitute',
    'quiz',
    'other'
  )
);
