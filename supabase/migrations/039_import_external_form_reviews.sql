-- Importa reseñas académicas recopiladas mediante un formulario externo.
-- No se conservan correos ni se atribuyen estas reseñas a cuentas de la plataforma.

begin;

alter table public.reviews
  alter column user_id drop not null,
  add column if not exists source text not null default 'platform',
  add column if not exists external_reference text,
  add column if not exists academic_term text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_source_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_source_check
      check (source in ('platform', 'external_form'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_source_user_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_source_user_check
      check (
        (source = 'platform' and user_id is not null)
        or (source = 'external_form' and user_id is null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reviews_external_reference_key'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_external_reference_key unique (external_reference);
  end if;
end
$$;

-- Conserva todas las validaciones actuales para las reseñas creadas en la
-- plataforma y permite únicamente a la importación administrativa insertar
-- reseñas externas anónimas ya moderadas.
create or replace function public.enforce_review_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'external_form' then
    if new.user_id is not null then
      raise exception 'Una reseña externa no puede atribuirse a una cuenta';
    end if;
    new.status := 'approved';
    return new;
  end if;

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

with incoming (
  external_reference,
  course_code,
  professor_name,
  academic_term,
  clarity_rating,
  difficulty_rating,
  fairness_rating,
  workload_rating,
  treatment_rating,
  course_demand_rating,
  recommendation,
  selected_tags,
  comment,
  submitted_at
) as (
  values
    (
      'google-form-2026-08-26-01', 'BMA02', 'Palomino Vildoso, Rolando', '2026-1',
      2, 7, 6, 4, 8, 7, 'dislike',
      array['Avanza muy rápido', 'No se le entiende mucho', 'Falta a clases con frecuencia', 'Se demora en subir las notas', 'No resuelve muchas dudas', 'Solo lee las PPTs'],
      'No hace ni su propia pizarra, quiere que los alumnos lo hagan todo y no aprendes, aunque es justo evaluando.',
      '2026-08-26 19:33:24-05'::timestamptz
    ),
    (
      'google-form-2026-08-26-02', 'EC618', 'Carbajal Gutiérrez, Félix', '2025-2',
      1, 5, 1, 8, 1, 1, 'dislike',
      array['No se le entiende mucho', 'Falta a clases con frecuencia', 'No resuelve muchas dudas', 'Solo lee las PPTs', 'Sus evaluaciones no se sienten coherentes con lo enseñado'],
      'Evitando caer en faltas de respeto, el profesor es de los menos indicados para enseñar en una universidad: falta regularmente a clases, no enseña lo indicado en el sílabo, la nota no se obtiene de acuerdo con lo estipulado y califica según qué tan bonita es la letra. Lo positivo es que no es tan complicado aprobar el curso, pero no se aprende lo esperado.',
      '2026-08-26 19:35:58-05'::timestamptz
    ),
    (
      'google-form-2026-08-26-03', 'PI911', 'Marcelo Astocondor, Dionicio Adolfo', '2025-1',
      3, 4, 8, 5, 8, 6, 'dislike',
      array['No se le entiende mucho', 'Se demora en subir las notas', 'Solo lee las PPTs'],
      'La verdad es que, si supiéramos la importancia de este curso antes de ingresar al mercado laboral, le prestaríamos más atención.',
      '2026-08-26 19:50:25-05'::timestamptz
    ),
    (
      'google-form-2026-08-26-04', 'PI524', 'Pilco Núñez, Alex Willy', '2026-1',
      1, 2, 5, 4, 2, 5, 'dislike',
      array['No se le entiende mucho', 'No hace teoría; solo deja exposiciones', 'No prepara para las evaluaciones'],
      'No es tan bueno tratando con los alumnos. Si alguien desea aprender el curso, es mejor matricularse con otro profesor.',
      '2026-08-26 21:57:56-05'::timestamptz
    ),
    (
      'google-form-2026-08-27-05', 'BMA02', 'Tineo Córdova, Freddy', '2022-1',
      10, 8, 10, 8, 10, 10, 'like',
      array['Explica claro', 'Resuelve dudas', 'Evalúa de forma justa', 'Da buenos ejemplos', 'Es ordenado con el curso', 'Explica muy bien sus temas y lo hace de forma interesante', 'Falta a clases con frecuencia'],
      'Muy bueno. Todas sus clases fueron virtuales y luego enviaba un seminario de problemas para las prácticas, el parcial y el final.',
      '2026-08-27 10:16:00-05'::timestamptz
    ),
    (
      'google-form-2026-08-27-06', 'PA113', 'Franco Portilla, Luz', '2026-1',
      8, 9, 8, 10, 10, 8, 'like',
      array['Es puntual', 'Da buenos ejemplos', 'Explica muy bien sus temas y lo hace de forma interesante', 'No se le entiende mucho'],
      'La profesora escucha cuando le hablo y me permite dar mi opinión acerca de lo que se está tratando.',
      '2026-08-27 21:08:22-05'::timestamptz
    ),
    (
      'google-form-2026-08-27-07', 'BMA05', 'Herbozo y Romero, César', '2025-2',
      4, 5, 2, 5, 2, 6, 'dislike',
      array['No se le entiende mucho', 'Se demora en subir las notas', 'Sus evaluaciones no se sienten coherentes con lo enseñado'],
      'Quiere que se resuelva a su manera; aunque el procedimiento esté bien, puede no considerarlo como debería. Además, falta con frecuencia o se retira del aula, y en ocasiones coloca sus diapositivas sin explicar mucho.',
      '2026-08-27 22:22:38-05'::timestamptz
    ),
    (
      'google-form-2026-08-27-08', 'BFI02', 'Sánchez Dávalos, Juan', '2023-2',
      5, 8, 4, 1, 5, 7, 'dislike',
      array['Es ordenado con el curso', 'No se le entiende mucho'],
      'El profesor conoce el tema, pero en algunas ocasiones las explicaciones podrían ser más claras y ordenadas para facilitar la comprensión.',
      '2026-08-27 23:26:21-05'::timestamptz
    ),
    (
      'google-form-2026-08-27-09', 'MA713', 'Sierra Flores, Luis', '2025-1',
      8, 3, 7, 1, 5, 1, 'like',
      array['Da buenos ejemplos', 'Falta a clases con frecuencia'],
      'El profesor principalmente envía clases grabadas. La modalidad permite revisar los temas con facilidad, aunque sería conveniente contar con algunas clases en vivo para resolver dudas.',
      '2026-08-27 23:36:06-05'::timestamptz
    ),
    (
      'google-form-2026-08-27-10', 'QU338', 'Breña Ore, Jorge Luis', '2025-2',
      9, 6, 8, 7, 9, 7, 'like',
      array['Explica claro', 'Resuelve dudas', 'Evalúa de forma justa', 'Da buenos ejemplos', 'Motiva a estudiar', 'Es ordenado con el curso', 'Explica muy bien sus temas y lo hace de forma interesante'],
      'El profesor explica los temas de manera clara, demuestra dominio del curso y tiene buena disposición para resolver las dudas de los estudiantes.',
      '2026-08-27 23:42:23-05'::timestamptz
    ),
    (
      'google-form-2026-08-28-11', 'QU427', 'Jaramillo Saldaña, Fernando Amade', null,
      10, 8, 9, 5, 9, 8, 'like',
      array['Explica claro', 'Resuelve dudas', 'Es puntual', 'Es ordenado con el curso', 'Explica muy bien sus temas y lo hace de forma interesante', 'Se demora en subir las notas'],
      'Se entiende bien en sus clases.',
      '2026-08-28 02:29:10-05'::timestamptz
    ),
    (
      'google-form-2026-08-28-12', 'QU428', 'Cárdenas Mendoza, Teodardo Javier', '2025-2',
      10, 8, 10, 4, 10, 6, 'like',
      array['Explica claro', 'Resuelve dudas', 'Es puntual', 'Evalúa de forma justa', 'Da buenos ejemplos', 'Motiva a estudiar', 'Es ordenado con el curso', 'Explica muy bien sus temas y lo hace de forma interesante', 'A veces sus exámenes son difíciles'],
      'Muy buen profesor.',
      '2026-08-28 10:38:21-05'::timestamptz
    ),
    (
      'google-form-2026-08-28-13', 'QU427', 'Cárdenas Mendoza, Teodardo Javier', '2026-1',
      10, 5, 8, 3, 10, 4, 'like',
      array['Explica claro', 'Resuelve dudas', 'Es puntual', 'Evalúa de forma justa', 'Da buenos ejemplos', 'Motiva a estudiar', 'Es ordenado con el curso', 'Explica muy bien sus temas y lo hace de forma interesante'],
      'Su manera de explicar los temas es muy clara y entendible.',
      '2026-08-28 19:25:29-05'::timestamptz
    )
)
insert into public.reviews (
  user_id,
  professor_id,
  course_id,
  clarity_rating,
  difficulty_rating,
  fairness_rating,
  workload_rating,
  treatment_rating,
  course_demand_rating,
  recommendation,
  selected_tags,
  comment,
  status,
  moderated_by_label,
  source,
  external_reference,
  academic_term,
  created_at
)
select
  null,
  professor.id,
  course.id,
  incoming.clarity_rating,
  incoming.difficulty_rating,
  incoming.fairness_rating,
  incoming.workload_rating,
  incoming.treatment_rating,
  incoming.course_demand_rating,
  incoming.recommendation,
  incoming.selected_tags,
  incoming.comment,
  'approved',
  'Formulario externo',
  'external_form',
  incoming.external_reference,
  incoming.academic_term,
  incoming.submitted_at
from incoming
join public.courses course on course.code = incoming.course_code
join public.professors professor on professor.full_name = incoming.professor_name
join public.course_professors relation
  on relation.course_id = course.id
 and relation.professor_id = professor.id
on conflict (external_reference) do nothing;

do $$
declare
  v_imported integer;
begin
  select count(*) into v_imported
  from public.reviews
  where external_reference like 'google-form-2026-08-%';

  if v_imported <> 13 then
    raise exception 'La importación externa quedó incompleta: se encontraron % de 13 reseñas.', v_imported;
  end if;
end
$$;

comment on column public.reviews.source is
  'Origen de la reseña. external_form identifica reseñas anónimas sin cuenta de la plataforma.';

commit;
