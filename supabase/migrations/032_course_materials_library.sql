-- Biblioteca de materiales académicos administrada por FIQT Reviews.
-- Los objetos se guardan en Cloudflare R2 y Supabase conserva sus metadatos.

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  material_type text not null default 'other'
    check (material_type in ('books', 'guided_practice', 'classes', 'other')),
  academic_term text,
  file_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint not null check (file_size between 1 and 26214400),
  uploaded_by uuid not null references auth.users(id),
  storage_provider text not null default 'r2'
    check (storage_provider = 'r2'),
  created_at timestamptz not null default now()
);

create index if not exists course_materials_course_type_created_idx
on public.course_materials (course_id, material_type, created_at desc);

alter table public.course_materials enable row level security;

drop policy if exists "course materials admin read" on public.course_materials;
create policy "course materials admin read"
on public.course_materials for select to authenticated
using (public.is_admin());

drop policy if exists "course materials admin insert" on public.course_materials;
create policy "course materials admin insert"
on public.course_materials for insert to authenticated
with check (public.is_admin() and uploaded_by = auth.uid());

drop policy if exists "course materials admin delete" on public.course_materials;
create policy "course materials admin delete"
on public.course_materials for delete to authenticated
using (public.is_admin());

comment on table public.course_materials is
'Metadatos de libros, prácticas dirigidas, clases y otros materiales almacenados en R2.';

comment on column public.course_materials.file_path is
'Clave privada del objeto dentro del bucket configurado de Cloudflare R2.';
