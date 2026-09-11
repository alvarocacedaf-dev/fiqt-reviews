alter table public.course_materials
  drop constraint if exists course_materials_material_type_check;

alter table public.course_materials
  add constraint course_materials_material_type_check
  check (material_type in ('books', 'guided_practice', 'classes', 'videos', 'other'));

alter table public.course_materials
  drop constraint if exists course_materials_storage_provider_check;

alter table public.course_materials
  add constraint course_materials_storage_provider_check
  check (storage_provider in ('r2', 'b2', 'youtube'));

alter table public.course_materials
  drop constraint if exists course_materials_file_size_check;

alter table public.course_materials
  add constraint course_materials_file_size_check
  check (
    file_size between 1 and case
      when material_type = 'videos' and storage_provider <> 'youtube' then 1073741824
      else 104857600
    end
  );

comment on column public.course_materials.file_size is
'Tamaño en bytes. Los videos directos admiten hasta 1 GiB; los demás archivos, hasta 100 MiB.';
