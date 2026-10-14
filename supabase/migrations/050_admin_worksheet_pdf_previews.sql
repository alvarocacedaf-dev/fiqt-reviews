alter table public.admin_worksheets
  add column if not exists preview_file_path text,
  add column if not exists preview_file_name text,
  add column if not exists preview_mime_type text,
  add column if not exists preview_file_size bigint,
  add column if not exists preview_storage_provider text;

alter table public.admin_worksheets
  drop constraint if exists admin_worksheets_preview_metadata_check;

alter table public.admin_worksheets
  add constraint admin_worksheets_preview_metadata_check check (
    (
      preview_file_path is null
      and preview_file_name is null
      and preview_mime_type is null
      and preview_file_size is null
      and preview_storage_provider is null
    )
    or (
      preview_file_path is not null
      and preview_file_name is not null
      and preview_mime_type = 'application/pdf'
      and preview_file_size > 0
      and preview_storage_provider in ('r2', 'supabase')
    )
  );

comment on column public.admin_worksheets.preview_file_path is
  'Ruta del PDF usado únicamente para la previsualización del archivo original.';
comment on column public.admin_worksheets.preview_file_name is
  'Nombre del PDF de previsualización.';
comment on column public.admin_worksheets.preview_mime_type is
  'Tipo MIME del archivo de previsualización; actualmente application/pdf.';
comment on column public.admin_worksheets.preview_file_size is
  'Tamaño en bytes del PDF de previsualización.';
comment on column public.admin_worksheets.preview_storage_provider is
  'Proveedor donde se almacena el PDF de previsualización.';
