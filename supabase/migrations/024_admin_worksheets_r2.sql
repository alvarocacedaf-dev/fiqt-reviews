-- Los archivos de planchas administrativas pasan a Cloudflare R2.
-- Supabase conserva únicamente sus metadatos y permisos.

alter table public.admin_worksheets
add column if not exists storage_provider text not null default 'supabase';

alter table public.admin_worksheets
drop constraint if exists admin_worksheets_storage_provider_check;

alter table public.admin_worksheets
add constraint admin_worksheets_storage_provider_check
check (storage_provider in ('supabase', 'r2'));

comment on column public.admin_worksheets.file_path is
'Clave privada del objeto en el proveedor indicado por storage_provider.';
