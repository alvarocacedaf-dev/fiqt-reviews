-- Permite libros y material académico de hasta 100 MiB.
-- No modifica el límite de las planchas de la administración.

alter table public.course_materials
  drop constraint if exists course_materials_file_size_check;

alter table public.course_materials
  add constraint course_materials_file_size_check
  check (file_size between 1 and 104857600);

comment on column public.course_materials.file_size is
'Tamaño del material en bytes. Máximo permitido: 100 MiB.';
