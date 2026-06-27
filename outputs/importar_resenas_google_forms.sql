-- FIQT Reviews: plantilla para importar reseñas desde Google Forms.
-- Uso:
-- 1) Revisa manualmente cada respuesta del formulario.
-- 2) Copia cada respuesta aprobada en el bloque "form_reviews".
-- 3) Ejecuta este SQL en Supabase SQL Editor.
--
-- Importante:
-- - No subas insultos, acusaciones personales ni datos privados.
-- - Usa el código real del curso de la malla, por ejemplo BMA02.
-- - Usa el nombre del docente tal como aparece en la web/Supabase.
-- - recommendation debe ser 'like' o 'dislike'.

begin;

-- El trigger normal exige verificación del curso para reseñar desde la app.
-- Para importar reseñas ya moderadas desde Google Forms, lo desactivamos
-- temporalmente y lo volvemos a activar al final.
alter table public.reviews disable trigger reviews_before_insert;

with form_reviews(
  reviewer_email,
  course_code,
  professor_name,
  clarity_rating,
  difficulty_rating,
  fairness_rating,
  treatment_rating,
  workload_rating,
  recommendation,
  selected_tags,
  comment
) as (
  values
    -- EJEMPLO: reemplaza TU_CORREO@uni.pe por el correo exacto usado en la cuenta.
    (
      'alvaro.caceda.f@uni.pe',
      'BMA02',
      'Tineo Córdova, Freddy',
      2,
      4,
      2,
      5,
      3,
      'like',
      array[
        'Resuelve dudas',
        'Evalúa de forma justa',
        'Da buenos ejemplos',
        'Sus exámenes son difíciles'
      ],
      'Recuerdo un día en que el profesor llegó 2 horas tarde, hizo 1 ejercicio y luego se fue.'
    )
),
resolved_reviews as (
  select
    u.id as user_id,
    p.id as professor_id,
    c.id as course_id,
    f.clarity_rating,
    f.difficulty_rating,
    f.fairness_rating,
    f.treatment_rating,
    f.workload_rating,
    f.recommendation,
    f.selected_tags,
    f.comment
  from form_reviews f
  join auth.users u on lower(u.email) = lower(f.reviewer_email)
  join public.courses c on c.code = f.course_code
  join public.professors p on p.full_name = f.professor_name
)
insert into public.reviews (
  user_id,
  professor_id,
  course_id,
  clarity_rating,
  difficulty_rating,
  fairness_rating,
  treatment_rating,
  workload_rating,
  recommendation,
  selected_tags,
  comment,
  status
)
select
  user_id,
  professor_id,
  course_id,
  clarity_rating,
  difficulty_rating,
  fairness_rating,
  treatment_rating,
  workload_rating,
  recommendation,
  selected_tags,
  comment,
  'approved'
from resolved_reviews
on conflict (user_id, professor_id, course_id) do update set
  clarity_rating = excluded.clarity_rating,
  difficulty_rating = excluded.difficulty_rating,
  fairness_rating = excluded.fairness_rating,
  treatment_rating = excluded.treatment_rating,
  workload_rating = excluded.workload_rating,
  recommendation = excluded.recommendation,
  selected_tags = excluded.selected_tags,
  comment = excluded.comment,
  status = 'approved',
  moderation_reason = null;

alter table public.reviews enable trigger reviews_before_insert;

commit;

-- Confirmación: debe mostrar la reseña importada.
select
  c.code,
  c.name as curso,
  p.full_name as profesor,
  r.recommendation,
  r.status,
  r.comment
from public.reviews r
join public.courses c on c.id = r.course_id
join public.professors p on p.id = r.professor_id
where c.code = 'BMA02'
  and p.full_name = 'Tineo Córdova, Freddy'
order by r.created_at desc;
