-- FIQT Reviews: cursos electivos y complementarios.
-- Fuente de carga inicial: malla proporcionada por el usuario.
-- No incluye notas, veces, periodos ni datos personales.

alter table public.cycles
drop constraint if exists cycles_number_check;

alter table public.cycles
add constraint cycles_number_check check (number between 1 and 12);

insert into public.cycles(number,name) values
  (11,'Cursos electivos'),
  (12,'Cursos complementarios')
on conflict(number) do update set name = excluded.name;

create unique index if not exists courses_code_unique
on public.courses(code)
where code is not null;

insert into public.courses(cycle_id, code, name, credits) values
  ((select id from public.cycles where number=11), 'PI147', 'Transferencia de Masa II', 3),
  ((select id from public.cycles where number=11), 'PI226', 'Cinética Química y Diseño de Reactores II', 3),
  ((select id from public.cycles where number=11), 'PI322', 'Electroquímica Industrial', 3),
  ((select id from public.cycles where number=11), 'PI345', 'Aceites y Grasas', 2),
  ((select id from public.cycles where number=11), 'PI356', 'Tratamiento de Agua Industrial', 3),
  ((select id from public.cycles where number=11), 'PI366', 'Polímeros II', 3),
  ((select id from public.cycles where number=11), 'PI376', 'Diseño, Selección y Mantenimiento de Equipos', 3),
  ((select id from public.cycles where number=11), 'PI381', 'Conservación de Energía', 3),
  ((select id from public.cycles where number=11), 'PI475', 'Procesos de Refinación de Petróleo y Gas', 4),
  ((select id from public.cycles where number=11), 'PI515', 'Corrosión I', 3),
  ((select id from public.cycles where number=11), 'PI535', 'Química de los Alimentos', 3),
  ((select id from public.cycles where number=11), 'PI721', 'Bioquímica y Microbiología', 3),
  ((select id from public.cycles where number=11), 'PI722', 'Procesos Bioquímicos', 3),
  ((select id from public.cycles where number=11), 'PI823', 'Combustión y Combustibles en Industrias de Procesos', 3),
  ((select id from public.cycles where number=11), 'PI824', 'Gas Natural y Condensados', 4),
  ((select id from public.cycles where number=11), 'PI826', 'Tratamiento de Efluentes Industriales', 3),
  ((select id from public.cycles where number=11), 'PI828', 'Tratamiento de Residuos Sólidos', 3),
  ((select id from public.cycles where number=11), 'PI913', 'Control Estadístico de Procesos', 3),
  ((select id from public.cycles where number=12), 'PA425', 'Diseño y Evaluación de Proyectos', 4),
  ((select id from public.cycles where number=12), 'PA515', 'Mercadotecnia', 2),
  ((select id from public.cycles where number=12), 'PI830', 'Aceites y Lubricantes', 4),
  ((select id from public.cycles where number=12), 'PI914', 'Introducción a la Gestión Ambiental', 3),
  ((select id from public.cycles where number=12), 'QU565', 'Análisis Químico Instrumental I', 5)
on conflict(code) where code is not null do update set
  cycle_id = excluded.cycle_id,
  name = excluded.name,
  credits = excluded.credits;
