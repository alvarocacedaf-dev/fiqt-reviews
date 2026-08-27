-- Permite que la biblioteca de materiales use Backblaze B2 sin afectar las planchas en R2.

alter table public.course_materials
  drop constraint if exists course_materials_storage_provider_check;

alter table public.course_materials
  alter column storage_provider set default 'b2';

alter table public.course_materials
  add constraint course_materials_storage_provider_check
  check (storage_provider in ('r2', 'b2'));

comment on table public.course_materials is
'Metadatos de libros, prácticas dirigidas, clases y otros materiales académicos.';

comment on column public.course_materials.file_path is
'Clave privada del objeto dentro del proveedor indicado por storage_provider.';

comment on column public.course_materials.storage_provider is
'Proveedor del objeto: b2 para materiales nuevos o r2 para registros anteriores.';
