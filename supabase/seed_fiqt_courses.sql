-- FIQT Reviews: catálogo de cursos por ciclo.
-- Fuente de carga inicial: malla proporcionada por el usuario.
-- No incluye notas, veces, periodos ni datos personales.

insert into public.cycles(number,name) values
  (1,'Primer ciclo'),
  (2,'Segundo ciclo'),
  (3,'Tercer ciclo'),
  (4,'Cuarto ciclo'),
  (5,'Quinto ciclo'),
  (6,'Sexto ciclo'),
  (7,'Séptimo ciclo'),
  (8,'Octavo ciclo'),
  (9,'Noveno ciclo'),
  (10,'Décimo ciclo')
on conflict(number) do update set name = excluded.name;

delete from public.course_professors
where course_id in (select id from public.courses where code in ('MAT-101','QUI-101','MAT-201','ING-301'));

delete from public.courses
where code in ('MAT-101','QUI-101','MAT-201','ING-301');

create unique index if not exists courses_code_unique
on public.courses(code)
where code is not null;

insert into public.courses(cycle_id, code, name, credits) values
  ((select id from public.cycles where number=1), 'BDI01', 'Dibujo en Ingeniería I', 2),
  ((select id from public.cycles where number=1), 'BFI01', 'Física I', 5),
  ((select id from public.cycles where number=1), 'BMA01', 'Cálculo Diferencial', 5),
  ((select id from public.cycles where number=1), 'BMA03', 'Álgebra Lineal', 4),
  ((select id from public.cycles where number=1), 'BQU01', 'Química I', 5),
  ((select id from public.cycles where number=1), 'BRC01', 'Redacción y Comunicación', 2),
  ((select id from public.cycles where number=2), 'BDI02', 'Dibujo en Ingeniería II', 3),
  ((select id from public.cycles where number=2), 'BFI02', 'Física II', 5),
  ((select id from public.cycles where number=2), 'BMA02', 'Cálculo Integral', 5),
  ((select id from public.cycles where number=2), 'BMA04', 'Matemáticas Básicas', 4),
  ((select id from public.cycles where number=2), 'BQU02', 'Química II', 5),
  ((select id from public.cycles where number=3), 'BEF01', 'Ética y Filosofía Política', 2),
  ((select id from public.cycles where number=3), 'BEG01', 'Economía General', 3),
  ((select id from public.cycles where number=3), 'BFI03', 'Física III', 5),
  ((select id from public.cycles where number=3), 'BIC01', 'Introducción a la Computación', 2),
  ((select id from public.cycles where number=3), 'BMA05', 'Matemática Superior I', 4),
  ((select id from public.cycles where number=3), 'QU216', 'Química Inorgánica', 5),
  ((select id from public.cycles where number=4), 'BFI04', 'Tópicos Especiales en Física', 3),
  ((select id from public.cycles where number=4), 'BMA06', 'Matemática Superior II', 4),
  ((select id from public.cycles where number=4), 'EP308', 'Economía y Organización de la Empresa', 3),
  ((select id from public.cycles where number=4), 'MA613', 'Estadística Aplicada', 4),
  ((select id from public.cycles where number=4), 'MA713', 'Programación Digital', 3),
  ((select id from public.cycles where number=4), 'QU427', 'Fisicoquímica I', 5),
  ((select id from public.cycles where number=5), 'PI111', 'Balance de Materia y Energía', 3),
  ((select id from public.cycles where number=5), 'PI524', 'Métodos Numéricos para Ingeniería Química', 4),
  ((select id from public.cycles where number=5), 'QU328', 'Química Orgánica I', 5),
  ((select id from public.cycles where number=5), 'QU428', 'Fisicoquímica II', 5),
  ((select id from public.cycles where number=5), 'QU518', 'Análisis Químico', 4),
  ((select id from public.cycles where number=6), 'BIE01', 'Idioma Extranjero o Lengua Nativa en el Nivel Intermedio', 2),
  ((select id from public.cycles where number=6), 'BRN01', 'Realidad Nacional, Constitución y Derechos Humanos', 3),
  ((select id from public.cycles where number=6), 'EC618', 'Mecánica y Resistencia de los Materiales', 3),
  ((select id from public.cycles where number=6), 'EE103', 'Circuitos e Instalaciones Eléctricas Industriales', 3),
  ((select id from public.cycles where number=6), 'PI140', 'Fenómenos de Transporte', 3),
  ((select id from public.cycles where number=6), 'PI216', 'Termodinámica para Ingeniería Química I', 3),
  ((select id from public.cycles where number=6), 'QU338', 'Química Orgánica II', 5),
  ((select id from public.cycles where number=7), 'PA113', 'Ingeniería de Métodos I', 4),
  ((select id from public.cycles where number=7), 'PA714', 'Investigación de Operaciones I', 3),
  ((select id from public.cycles where number=7), 'PI142', 'Transferencia de Cantidad de Movimiento', 3),
  ((select id from public.cycles where number=7), 'PI217', 'Termodinámica para Ingeniería Química II', 3),
  ((select id from public.cycles where number=7), 'PI318', 'Industria de los Procesos Químicos', 5),
  ((select id from public.cycles where number=7), 'PI514', 'Ciencias de los Materiales', 2),
  ((select id from public.cycles where number=7), 'PI520', 'Recursos Químicos en la Biodiversidad', 3),
  ((select id from public.cycles where number=8), 'BAE01', 'Actividades Extracurriculares', 1),
  ((select id from public.cycles where number=8), 'EP818', 'Costos y Presupuestos', 3),
  ((select id from public.cycles where number=8), 'PI143', 'Transferencia de Calor', 3),
  ((select id from public.cycles where number=8), 'PI144', 'Transferencia de Masa', 3),
  ((select id from public.cycles where number=8), 'PI146', 'Operaciones en Ingeniería Química I', 3),
  ((select id from public.cycles where number=8), 'PI225', 'Cinética Química y Diseño de Reactores I', 3),
  ((select id from public.cycles where number=8), 'PI521', 'Introducción a la Bioingeniería', 3),
  ((select id from public.cycles where number=9), 'PI135', 'Laboratorio de Operaciones Unitarias I', 2),
  ((select id from public.cycles where number=9), 'PI365', 'Polímeros I', 3),
  ((select id from public.cycles where number=9), 'PI415', 'Instrumentos de Control', 3),
  ((select id from public.cycles where number=9), 'PI510', 'Economía de Procesos', 3),
  ((select id from public.cycles where number=9), 'PI555', 'Seguridad en Procesos Químicos Industriales', 3),
  ((select id from public.cycles where number=9), 'PI911', 'Gestión Tecnológica y Empresarial', 4),
  ((select id from public.cycles where number=9), 'QT714', 'Taller de Proyecto de Investigación', 2),
  ((select id from public.cycles where number=10), 'PA136', 'Planeamiento y Control de la Producción', 4),
  ((select id from public.cycles where number=10), 'PI136', 'Laboratorio de Operaciones Unitarias II', 2),
  ((select id from public.cycles where number=10), 'PI426', 'Simulación y Control de Procesos', 4),
  ((select id from public.cycles where number=10), 'PI525', 'Diseño de Plantas', 4),
  ((select id from public.cycles where number=10), 'QT715', 'Taller de Investigación', 2)
on conflict(code) where code is not null do update set
  cycle_id = excluded.cycle_id,
  name = excluded.name,
  credits = excluded.credits;
