-- FIQT Reviews: docentes asociados a cursos electivos y complementarios.
-- Fuente de carga inicial: capturas públicas proporcionadas por el usuario.
-- No incluye DNI, códigos internos, horarios, teléfonos, correos ni datos administrativos.

create unique index if not exists professors_full_name_unique
on public.professors(full_name);

with links(course_code, professor_name) as (
values
  -- Cursos electivos
  ('PI147', 'Montalvo Hurtado, Celso Pastor Alejandro'),
  ('PI226', 'Osorio Carrera, César Javier'),
  ('PI322', 'Cárdenas Mendoza, Teodardo Javier'),
  ('PI322', 'Villón Ulloa, Ángel Eduardo'),
  ('PI345', 'Garayar Ávalos, Mario'),
  ('PI356', 'Turriate Manrique, Juan Ángel'),
  ('PI376', 'Delgado Acevedo, Aldo Max'),
  ('PI381', 'Carbajal González, Arsedio Oswaldo'),
  ('PI475', 'Porras Sosa, Emilio'),
  ('PI515', 'Paucar Cuba, Karin María'),
  ('PI535', 'Tuesta Chávez, Tarsila'),
  ('PI721', 'Nieto Juárez, Jéssica Ivana'),
  ('PI721', 'Paján Lan, Harold Patrick'),
  ('PI826', 'Turriate Manrique, Juan Ángel'),
  ('PI913', 'Ramos Julián, Aldan'),

  -- Cursos complementarios
  ('PA515', 'Carreño León, Gustavo Rubén'),
  ('PA515', 'Pinglo Ramírez, Miguel Ángel'),
  ('PI914', 'Osorio Carrera, César Javier')
),
inserted_professors as (
  insert into public.professors(full_name, source_name, is_active)
  select distinct professor_name, 'DIRCE UNI', true
  from links
  on conflict (full_name) do update set
    source_name = excluded.source_name,
    is_active = true
  returning id, full_name
)
insert into public.course_professors(course_id, professor_id)
select c.id, p.id
from links l
join public.courses c on c.code = l.course_code
join public.professors p on p.full_name = l.professor_name
where not exists (
  select 1
  from public.course_professors cp
  where cp.course_id = c.id
    and cp.professor_id = p.id
);

-- Consulta opcional de verificación:
-- select c.code, c.name as curso, count(cp.professor_id) as profesores_asociados
-- from public.courses c
-- left join public.course_professors cp on cp.course_id = c.id
-- where c.code in (
--   'PI147','PI226','PI322','PI345','PI356','PI376','PI381','PI475','PI515',
--   'PI535','PI721','PI826','PI913','PA515','PI914'
-- )
-- group by c.code, c.name
-- order by c.code;
