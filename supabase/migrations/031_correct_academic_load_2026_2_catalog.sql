-- Corrige el catálogo curso-docente usando los Excel oficiales 2026-2.
-- La operación es transaccional e idempotente:
--   1. corrige tres nombres sin cambiar el id del profesor;
--   2. crea únicamente profesores de cursos que ya existen;
--   3. añade siete asociaciones confirmadas;
--   4. retira dos asociaciones erróneas introducidas por la migración 030.

begin;

create unique index if not exists professors_full_name_unique
on public.professors(full_name);

-- Se conserva el mismo id para no afectar reseñas, verificaciones ni historial.
update public.professors
set full_name = 'Esponda Veliz, Jorge José'
where full_name = 'Espinda Veliz, Jorge'
  and not exists (
    select 1
    from public.professors
    where full_name = 'Esponda Veliz, Jorge José'
  );

update public.professors
set full_name = 'Ruiz Gudiel, Víctor Andrés'
where full_name = 'Ruiz Gubiel, Víctor'
  and not exists (
    select 1
    from public.professors
    where full_name = 'Ruiz Gudiel, Víctor Andrés'
  );

update public.professors
set full_name = 'Rodríguez Carbajal, Genaro Armando'
where full_name = 'Rodríguez Carbajal, Genaro Arilando'
  and not exists (
    select 1
    from public.professors
    where full_name = 'Rodríguez Carbajal, Genaro Armando'
  );

with confirmed_links(course_code, professor_name) as (
  values
    ('BMA04', 'Arredondo Ruiz, Manuel'),
    ('BEG01', 'Chivilches Ayala, Luis Ítalo'),
    ('EP308', 'Chivilches Ayala, Luis Ítalo'),
    ('QT715', 'Roca Meneses, Elsa Beatriz'),
    ('QU216', 'Gago Tolentino, Roger Enrique'),
    ('PI525', 'Ortiz Guzmán, Rommel Hans'),
    ('PI225', 'Wong Dávila, Jorge Luis')
)
insert into public.professors(full_name, source_name, is_active)
select distinct l.professor_name, 'Carga académica oficial 2026-2', true
from confirmed_links l
join public.courses c on c.code = l.course_code
on conflict (full_name) do update set
  is_active = true;

-- Se usa una sentencia separada para que PostgreSQL pueda leer inmediatamente
-- los profesores que acaban de insertarse.
with confirmed_links(course_code, professor_name) as (
  values
    ('BMA04', 'Arredondo Ruiz, Manuel'),
    ('BEG01', 'Chivilches Ayala, Luis Ítalo'),
    ('EP308', 'Chivilches Ayala, Luis Ítalo'),
    ('QT715', 'Roca Meneses, Elsa Beatriz'),
    ('QU216', 'Gago Tolentino, Roger Enrique'),
    ('PI525', 'Ortiz Guzmán, Rommel Hans'),
    ('PI225', 'Wong Dávila, Jorge Luis')
),
existing_course_links as (
  select l.course_code, l.professor_name
  from confirmed_links l
  join public.courses c on c.code = l.course_code
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

-- Estas dos relaciones no aparecen en los Excel oficiales. Solo se elimina el
-- vínculo del catálogo; no se elimina el profesor ni sus demás cursos.
delete from public.course_professors cp
using public.courses c, public.professors p
where cp.course_id = c.id
  and cp.professor_id = p.id
  and (
    (c.code = 'QU328' and p.full_name = 'Elguera Ysnaga, Orlando')
    or
    (c.code = 'QU338' and p.full_name = 'Reynoso Cuestas, Úrsula')
  );

commit;
