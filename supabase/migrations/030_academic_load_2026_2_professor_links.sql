-- Actualiza únicamente docentes y asociaciones curso-docente observadas en la
-- carga académica 2026-2. No crea cursos ni elimina asociaciones históricas.

create unique index if not exists professors_full_name_unique
on public.professors(full_name);

with links(course_code, professor_name) as (
  values
    ('BDI01', 'Chuquillanqui Suárez, José Luis'),
    ('BDI02', 'Chuquillanqui Suárez, José Luis'),
    ('BFI01', 'Arredondo Ruiz, Manuel'),
    ('BFI01', 'Sánchez Dávalos, Juan'),
    ('BMA01', 'Pascual Bellido, Felipe Enrique'),
    ('BMA02', 'Pascual Bellido, Felipe Enrique'),
    ('BMA04', 'Pascual Bellido, Felipe Enrique'),
    ('EC618', 'Carbajal Gutiérrez, Félix'),
    ('EC618', 'Paz Salazar, Rodolfo'),
    ('PA113', 'Pérez Estrella, Mauro'),
    ('PI135', 'Villón Ulloa, Ángel Eduardo'),
    ('PI136', 'Gago Tolentino, Roger Enrique'),
    ('PI136', 'Montalvo Hurtado, Celso Pastor Alejandro'),
    ('PI365', 'Carreño León, Gustavo Rubén'),
    ('PI824', 'Ortiz Guzmán, Rommel Hans'),
    ('QT714', 'Uribe Valenzuela, Carmen Luisa'),
    ('QU328', 'Elguera Ysnaga, Orlando'),
    ('QU328', 'Reynoso Cuestas, Úrsula'),
    ('QU338', 'Elguera Ysnaga, Orlando'),
    ('QU338', 'Ramos Julián, Aldan'),
    ('QU338', 'Reynoso Cuestas, Úrsula'),
    ('QU428', 'Elguera Ysnaga, Orlando')
),
existing_course_links as (
  select l.course_code, l.professor_name
  from links l
  join public.courses c on c.code = l.course_code
),
inserted_professors as (
  insert into public.professors(full_name, source_name, is_active)
  select distinct professor_name, 'Carga académica 2026-2', true
  from existing_course_links
  on conflict (full_name) do update set
    is_active = true
  returning id
)
insert into public.course_professors(course_id, professor_id, academic_term)
select c.id, p.id, '2026-2'
from existing_course_links l
join public.courses c on c.code = l.course_code
join public.professors p on p.full_name = l.professor_name
where not exists (
  select 1
  from public.course_professors cp
  where cp.course_id = c.id
    and cp.professor_id = p.id
);

