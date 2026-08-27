-- Permite planchas administrativas de hasta 100 MiB.
-- Los objetos continúan almacenándose de forma privada en Cloudflare R2.

alter table public.admin_worksheets
  drop constraint if exists admin_worksheets_file_size_check;

alter table public.admin_worksheets
  add constraint admin_worksheets_file_size_check
  check (file_size between 1 and 104857600);

update storage.buckets
set file_size_limit = 104857600
where id = 'admin-worksheets';

comment on column public.admin_worksheets.file_size is
'Tamaño del archivo en bytes; máximo 100 MiB.';
